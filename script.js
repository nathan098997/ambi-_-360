// AMBI360
const STORAGE_KEY = 'ambi360_projects';
const TRASH_KEY = 'ambi360_trash';
const BASE_PROJECT_KEY = '__base__';
const ADMIN_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

let trashedProjects = {};
let projects = {};
let viewer = null;
let previewViewer = null;
let hotspots = [];
let addingHotspot = false;
let currentParentId = null;
let previewCurrentImage = null;
let previewRootImage = null;
let editingProjectName = null;
let isAdminAuthenticated = false;
let projectHotspots = [];
let currentProjectName = null;
let currentScene = 'main';
let currentHotspotId = null;

// ── IndexedDB para imagens ──────────────────────────────
const IDB_NAME = 'ambi360_images';
const IDB_STORE = 'images';
let idb = null;

function openIDB() {
    return new Promise((resolve) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
        req.onsuccess = e => { idb = e.target.result; resolve(); };
        req.onerror = () => resolve(); // continua sem IDB
    });
}

function saveImage(key, dataUrl) {
    if (!idb || !dataUrl) return Promise.resolve();
    return new Promise((resolve) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(dataUrl, key);
        tx.oncomplete = resolve;
        tx.onerror = resolve;
    });
}

function loadImage(key) {
    if (!idb || !key) return Promise.resolve(null);
    return new Promise((resolve) => {
        const tx = idb.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

function deleteImage(key) {
    if (!idb || !key) return;
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
}

// ── Chaves de imagem por projeto ────────────────────────
function imageKey(projectName) { return 'img_' + projectName; }
function logoKey(projectName)  { return 'logo_' + projectName; }
function hotspotImageKey(projectName, hotspotId) { return 'hsi_' + projectName + '_' + hotspotId; }

// ── Salvar / Carregar projetos (sem imagens no localStorage) ──
function saveProjects() {
    const slim = {};
    Object.entries(projects).forEach(([k, v]) => {
        slim[k] = { ...v };
        if (slim[k].image && slim[k].image.startsWith('data:')) slim[k].image = '__idb__';
        if (slim[k].logo  && slim[k].logo.startsWith('data:'))  slim[k].logo  = '__idb__';
        // remover targetImage dos hotspots (ficam no IDB)
        slim[k].hotspots = (slim[k].hotspots || []).map(h => {
            const sh = { ...h };
            if (sh.targetImage && sh.targetImage.startsWith('data:')) sh.targetImage = '__idb__';
            return sh;
        });
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slim)); } catch(e) {
        console.error('localStorage cheio:', e);
    }
}

async function loadProjects() {
    let slim = {};
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        slim = stored ? JSON.parse(stored) : {};
    } catch(e) { slim = {}; }

    for (const [name, p] of Object.entries(slim)) {
        if (p.image === '__idb__') p.image = await loadImage(imageKey(name)) || null;
        if (p.logo  === '__idb__') p.logo  = await loadImage(logoKey(name))  || null;
        // Restaurar targetImage dos hotspots
        p.hotspots = await Promise.all((p.hotspots || []).map(async h => {
            if (h.targetImage === '__idb__') h.targetImage = await loadImage(hotspotImageKey(name, h.id)) || '';
            return h;
        }));
    }
    return slim;
}

function loadTrashedProjects() {
    try {
        const stored = localStorage.getItem(TRASH_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch(e) { return {}; }
}

function saveTrashedProjects() {
    const slim = {};
    Object.entries(trashedProjects).forEach(([k, v]) => {
        slim[k] = { ...v };
        if (slim[k].image && slim[k].image.startsWith('data:')) slim[k].image = null;
        if (slim[k].logo  && slim[k].logo.startsWith('data:'))  slim[k].logo  = null;
    });
    try { localStorage.setItem(TRASH_KEY, JSON.stringify(slim)); } catch(e) {}
}

// Salva projeto + todas as imagens no IDB
async function saveProjectWithImages(name, projectData) {
    projects[name] = projectData;
    const saves = [];
    if (projectData.image && projectData.image.startsWith('data:'))
        saves.push(saveImage(imageKey(name), projectData.image));
    if (projectData.logo && projectData.logo.startsWith('data:'))
        saves.push(saveImage(logoKey(name), projectData.logo));
    // Salvar targetImage de cada hotspot no IDB
    (projectData.hotspots || []).forEach(h => {
        if (h.targetImage && h.targetImage.startsWith('data:'))
            saves.push(saveImage(hotspotImageKey(name, h.id), h.targetImage));
    });
    await Promise.all(saves);
    saveProjects();
}

// ── Startup ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await openIDB();
    projects = await loadProjects();
    trashedProjects = loadTrashedProjects();
    setupEventListeners();
    loadTheme();
    initShareButton();
    initApp();
});

// ── App init ─────────────────────────────────────────────
function initApp() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('d')) { handleSharedUrl(urlParams.get('d')); return; }
    if (urlParams.get('project') && projects[urlParams.get('project')]) {
        waitForPannellum(() => showViewer(urlParams.get('project')));
        return;
    }

    if (!projects[BASE_PROJECT_KEY]) {
        projects[BASE_PROJECT_KEY] = {
            title: 'Tour Virtual - Apartamento Modelo',
            hotspots: [
                { id: 'hs-1', pitch: -10, yaw: 45,   text: 'Sala de Estar' },
                { id: 'hs-2', pitch: 0,   yaw: -90,  text: 'Cozinha Gourmet' },
                { id: 'hs-3', pitch: 5,   yaw: 180,  text: 'Varanda' }
            ],
            createdAt: new Date().toISOString(),
            image: 'https://pannellum.org/images/alma.jpg',
            logo: null,
            isBase: true
        };
        saveProjects();
    }

    waitForPannellum(() => {
        document.getElementById('loginContainer').classList.add('hidden');
        showViewer(BASE_PROJECT_KEY);
        document.getElementById('adminAccessBtn').style.display = 'flex';
        document.getElementById('shareBtn').style.display = 'none';
    });
}

function waitForPannellum(cb) {
    if (typeof pannellum !== 'undefined') { cb(); return; }
    let n = 0;
    const t = setInterval(() => {
        if (typeof pannellum !== 'undefined') { clearInterval(t); cb(); }
        else if (++n > 50) { clearInterval(t); document.getElementById('loginContainer').classList.remove('hidden'); }
    }, 100);
}

// ── Autosave ─────────────────────────────────────────────
function autoSave() {
    if (!editingProjectName) return;
    const existing = projects[editingProjectName] || {};
    const updated = {
        ...existing,
        hotspots: [...hotspots],
        image: previewCurrentImage || existing.image || null,
        isBase: editingProjectName === BASE_PROJECT_KEY
    };
    saveProjectWithImages(editingProjectName, updated);
    showToast('Salvo automaticamente', 'success');
}

// ── Event listeners ──────────────────────────────────────
function setupEventListeners() {
    document.getElementById('adminForm').addEventListener('submit', handleAdminLogin);
    document.getElementById('adminLoginModalForm').addEventListener('submit', handleAdminLoginModal);
    document.getElementById('logoUpload').addEventListener('change', handleLogoUpload);
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    document.getElementById('addHotspotBtn').addEventListener('click', () => setAddHotspotMode(true));
    document.getElementById('removeHotspotBtn').addEventListener('click', removeAllHotspots);
    document.getElementById('createProjectForm').addEventListener('submit', handleCreateProject);
    document.getElementById('adminLogoutBtn').addEventListener('click', logout);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    const s = document.querySelector('.search-input');
    if (s) s.addEventListener('input', e => updateProjectsGrid(e.target.value));
    document.getElementById('newProjectTitle').addEventListener('input', () => {
        if (!editingProjectName) return;
        const title = document.getElementById('newProjectTitle').value.trim();
        if (title) { projects[editingProjectName] = { ...(projects[editingProjectName] || {}), title }; saveProjects(); }
    });
}

// ── Auth ──────────────────────────────────────────────────
async function hashPassword(p) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const h = await hashPassword(document.getElementById('adminPassword').value);
    if (h === ADMIN_HASH) showAdminPanel();
    else showError('Senha incorreta.');
}

function showAdminLogin() {
    if (isAdminAuthenticated) { showAdminPanel(); return; }
    const m = document.getElementById('adminLoginModal');
    m.classList.remove('hidden');
    document.getElementById('adminLoginModalPassword').focus();
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').classList.add('hidden');
    document.getElementById('adminLoginModalPassword').value = '';
    document.getElementById('adminLoginModalError').classList.add('hidden');
}

async function handleAdminLoginModal(e) {
    e.preventDefault();
    const h = await hashPassword(document.getElementById('adminLoginModalPassword').value);
    if (h === ADMIN_HASH) { closeAdminLoginModal(); isAdminAuthenticated = true; showAdminPanel(); }
    else document.getElementById('adminLoginModalError').classList.remove('hidden');
}

// ── Admin Panel ───────────────────────────────────────────
function showAdminPanel() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('viewerContainer').classList.add('hidden');
    document.getElementById('adminAccessBtn').style.display = 'none';
    document.getElementById('adminPanel').classList.remove('hidden');
    updateProjectsGrid();
    showSection('projects');
}

function updateProjectsGrid(searchTerm = '') {
    const grid = document.getElementById('projectsGrid');
    const empty = document.getElementById('emptyState');
    const sort = document.getElementById('sortOrder')?.value || 'newest';
    grid.innerHTML = '';

    let entries = Object.entries(projects).filter(([n]) => n !== BASE_PROJECT_KEY);
    if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        entries = entries.filter(([n, p]) => n.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
    }
    if (entries.length === 0) {
        empty.classList.remove('hidden');
        empty.innerHTML = `<div class="empty-icon">📁</div><h3>Nenhum projeto encontrado</h3><p>Crie seu primeiro projeto usando o botão acima</p>`;
        return;
    }
    entries.sort(([,a],[,b]) => sort === 'newest' ? new Date(b.createdAt)-new Date(a.createdAt) : new Date(a.createdAt)-new Date(b.createdAt));
    empty.classList.add('hidden');
    entries.forEach(([n, p]) => grid.appendChild(createProjectCard(n, p)));
}

function createProjectCard(name, project) {
    const card = document.createElement('div'); card.className = 'project-card';
    const thumb = document.createElement('div'); thumb.className = 'project-thumbnail';
    const img = document.createElement('img'); img.src = project.image || ''; img.alt = sanitize(project.title);
    thumb.appendChild(img);
    const info = document.createElement('div'); info.className = 'project-info';
    info.innerHTML = `
        <div class="project-name">${sanitize(project.title)}</div>
        <div class="project-meta">Tour Virtual 360° • ${new Date(project.createdAt).toLocaleDateString('pt-BR')} • ${(project.hotspots||[]).length} pontos</div>
        <div class="project-actions">
            <button class="btn-sm btn-view">👁️ Ver</button>
            <button class="btn-sm btn-edit">✏️ Editar</button>
            <button class="btn-sm btn-delete">🗑️ Excluir</button>
        </div>`;
    info.querySelector('.btn-view').addEventListener('click', () => showViewer(name));
    info.querySelector('.btn-edit').addEventListener('click', () => editProject(name));
    info.querySelector('.btn-delete').addEventListener('click', () => deleteProject(name));
    card.appendChild(thumb); card.appendChild(info);
    return card;
}

// ── Create / Edit Project ─────────────────────────────────
function handleCreateProject(e) {
    e.preventDefault();
    const savingName = editingProjectName || document.getElementById('newProjectName').value.trim();
    const title = document.getElementById('newProjectTitle').value.trim();
    const imageFile = document.getElementById('imageUpload').files[0];
    const logoFile  = document.getElementById('logoUpload').files[0];

    if (!savingName) return showToast('Nome obrigatório.', 'warning');
    if (!title)      return showToast('Título obrigatório.', 'warning');

    const existing = projects[savingName] || {};
    if (!imageFile && !existing.image && !previewCurrentImage)
        return showToast('Selecione uma imagem 360°.', 'warning');

    const data = {
        ...existing, title,
        hotspots: [...hotspots],
        image: existing.image || previewCurrentImage || null,
        logo:  existing.logo  || null,
        createdAt: existing.createdAt || new Date().toISOString(),
        isBase: savingName === BASE_PROJECT_KEY
    };

    const finish = (d) => {
        if (logoFile) {
            const r = new FileReader();
            r.onload = ev => { d.logo = ev.target.result; commitSave(d, savingName); };
            r.readAsDataURL(logoFile);
        } else commitSave(d, savingName);
    };

    if (imageFile) {
        const r = new FileReader();
        r.onload = ev => { data.image = ev.target.result; finish(data); };
        r.readAsDataURL(imageFile);
    } else finish(data);
}

async function commitSave(data, name) {
    await saveProjectWithImages(name, data);
    showToast('Salvo com sucesso!', 'success');
    editingProjectName = null;
    resetCreateForm();
    showSection('projects');
    updateProjectsGrid();
}

function editBaseProject() {
    const base = projects[BASE_PROJECT_KEY] || { title:'Tour Principal', hotspots:[], createdAt:new Date().toISOString(), image:null, logo:null, isBase:true };
    projects[BASE_PROJECT_KEY] = base;
    editingProjectName = BASE_PROJECT_KEY;
    document.getElementById('newProjectName').value = BASE_PROJECT_KEY;
    document.getElementById('newProjectTitle').value = base.title;
    const ng = document.getElementById('newProjectName').closest('.form-group');
    if (ng) ng.style.display = 'none';
    if (base.logo)  showExistingLogo(base.logo);
    if (base.image) { showImagePreview(base.image); hotspots = base.hotspots ? [...base.hotspots] : []; }
    document.getElementById('pageTitle').textContent = 'Tour Principal';
    document.getElementById('pageSubtitle').textContent = 'Esta é a tela exibida ao abrir o site.';
    document.getElementById('submitProjectBtn').textContent = 'Salvar Tour Principal';
    showSection('create');
}

function editProject(name) {
    const project = projects[name]; if (!project) return;
    editingProjectName = name;
    document.getElementById('newProjectName').value = name;
    document.getElementById('newProjectTitle').value = project.title;
    if (project.logo)  showExistingLogo(project.logo);
    if (project.image) { showImagePreview(project.image); hotspots = project.hotspots ? [...project.hotspots] : []; }
    document.getElementById('pageTitle').textContent = 'Editar Projeto';
    document.getElementById('pageSubtitle').textContent = 'Modifique as configurações do projeto.';
    document.getElementById('submitProjectBtn').textContent = 'Salvar Alterações';
    showSection('create');
}

function deleteProject(name) {
    if (!confirm(`Mover "${projects[name].title}" para a lixeira?`)) return;
    trashedProjects[name] = { ...projects[name], deletedAt: new Date().toISOString() };
    delete projects[name];
    saveProjects(); saveTrashedProjects();
    updateProjectsGrid();
    showToast('Movido para a lixeira.', 'success');
}

// ── Trash ─────────────────────────────────────────────────
function updateTrashGrid() {
    const grid = document.getElementById('trashGrid');
    const empty = document.getElementById('emptyTrash');
    grid.innerHTML = '';
    const entries = Object.entries(trashedProjects);
    if (entries.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    entries.forEach(([n, p]) => grid.appendChild(createTrashCard(n, p)));
}

function createTrashCard(name, project) {
    const card = document.createElement('div'); card.className = 'project-card';
    const thumb = document.createElement('div'); thumb.className = 'project-thumbnail'; thumb.style.position = 'relative';
    const img = document.createElement('img'); img.src = project.image || ''; img.alt = sanitize(project.title);
    const badge = document.createElement('div');
    badge.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:4px;font-size:12px;';
    badge.textContent = '🗑️ Excluído';
    thumb.appendChild(img); thumb.appendChild(badge);
    const info = document.createElement('div'); info.className = 'project-info';
    info.innerHTML = `<div class="project-name">${sanitize(project.title)}</div>
        <div class="project-meta">Excluído em ${new Date(project.deletedAt).toLocaleDateString('pt-BR')}</div>
        <div class="project-actions">
            <button class="btn-sm btn-view">↩️ Restaurar</button>
            <button class="btn-sm btn-delete">🗑️ Apagar</button>
        </div>`;
    info.querySelector('.btn-view').addEventListener('click', () => restoreProject(name));
    info.querySelector('.btn-delete').addEventListener('click', () => permanentlyDeleteProject(name));
    card.appendChild(thumb); card.appendChild(info);
    return card;
}

function restoreProject(name) {
    if (!confirm(`Restaurar "${trashedProjects[name].title}"?`)) return;
    const p = { ...trashedProjects[name] }; delete p.deletedAt;
    projects[name] = p; delete trashedProjects[name];
    saveProjects(); saveTrashedProjects(); updateTrashGrid();
    showToast('Restaurado!', 'success');
}

function permanentlyDeleteProject(name) {
    if (!confirm(`Apagar permanentemente "${trashedProjects[name].title}"? Não pode ser desfeito!`)) return;
    deleteImage(imageKey(name)); deleteImage(logoKey(name));
    delete trashedProjects[name]; saveTrashedProjects(); updateTrashGrid();
    showToast('Apagado permanentemente.', 'success');
}

// ── Sections ──────────────────────────────────────────────
function showSection(section) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    ['projectsSection','createSection','trashSection'].forEach(id => document.getElementById(id).classList.add('hidden'));
    if (section === 'projects') {
        document.getElementById('projectsSection').classList.remove('hidden');
        document.getElementById('pageTitle').textContent = 'Projetos';
        document.getElementById('pageSubtitle').textContent = 'Aqui você faz a gestão de seus projetos.';
        document.querySelectorAll('.nav-item')[0].classList.add('active');
        resetCreateForm();
    } else if (section === 'create') {
        document.getElementById('createSection').classList.remove('hidden');
        if (!editingProjectName) {
            document.getElementById('pageTitle').textContent = 'Criar Projeto';
            document.getElementById('pageSubtitle').textContent = 'Configure um novo projeto 360°.';
            document.getElementById('submitProjectBtn').textContent = 'Criar Projeto';
        }
        document.querySelectorAll('.nav-item')[1].classList.add('active');
    } else if (section === 'trash') {
        document.getElementById('trashSection').classList.remove('hidden');
        document.getElementById('pageTitle').textContent = 'Lixeira';
        document.getElementById('pageSubtitle').textContent = 'Projetos excluídos.';
        document.querySelectorAll('.nav-item')[2].classList.add('active');
        updateTrashGrid();
    }
}

// ── Image / Logo Upload ───────────────────────────────────
function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = async ev => {
        showImagePreview(ev.target.result);
        if (editingProjectName) {
            const existing = projects[editingProjectName] || {};
            projects[editingProjectName] = { ...existing, image: ev.target.result, isBase: editingProjectName === BASE_PROJECT_KEY };
            await saveImage(imageKey(editingProjectName), ev.target.result);
            saveProjects();
        }
    };
    r.readAsDataURL(file);
}

function handleLogoUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = async ev => {
        showLogoPreview(ev.target.result, file.name);
        if (editingProjectName) {
            const existing = projects[editingProjectName] || {};
            projects[editingProjectName] = { ...existing, logo: ev.target.result, isBase: editingProjectName === BASE_PROJECT_KEY };
            await saveImage(logoKey(editingProjectName), ev.target.result);
            saveProjects();
        }
    };
    r.readAsDataURL(file);
}

function showLogoPreview(src, filename) {
    const preview = document.getElementById('logoPreview');
    preview.innerHTML = '';
    const img = document.createElement('img'); img.src = src; img.alt = 'Logo';
    const lbl = document.createElement('div'); lbl.style.cssText = 'margin-top:8px;font-size:12px;color:#6b7280;'; lbl.textContent = filename || 'Logo atual';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-danger';
    btn.style.cssText = 'margin-top:8px;padding:4px 8px;font-size:12px;'; btn.textContent = 'Remover Logo';
    btn.addEventListener('click', removeLogo);
    preview.appendChild(img); preview.appendChild(lbl); preview.appendChild(btn);
    preview.classList.remove('hidden');
    document.getElementById('logoUploadText').textContent = '✅ Logo selecionada';
}

function showExistingLogo(src) { showLogoPreview(src, null); document.getElementById('logoUploadText').textContent = '✅ Logo carregada'; }
function removeLogo() {
    document.getElementById('logoUpload').value = '';
    document.getElementById('logoPreview').classList.add('hidden');
    document.getElementById('logoUploadText').textContent = '🖼️ Clique para selecionar uma logo';
}

// ── Panorama Preview ──────────────────────────────────────
function showImagePreview(imageSrc) {
    document.getElementById('imagePreview').classList.remove('hidden');
    currentParentId = null;
    previewCurrentImage = imageSrc;
    previewRootImage = imageSrc;
    if (previewViewer) { previewViewer.destroy(); previewViewer = null; }
    if (imageSrc && imageSrc.startsWith('http')) {
        fetch(imageSrc).then(r => r.blob()).then(blob => {
            const rd = new FileReader();
            rd.onload = ev => initPreviewViewer(ev.target.result);
            rd.readAsDataURL(blob);
        }).catch(() => initPreviewViewer(imageSrc));
    } else {
        initPreviewViewer(imageSrc);
    }
}

function initPreviewViewer(src) {
    previewCurrentImage = src;
    if (!previewRootImage || previewRootImage.startsWith('http')) previewRootImage = src;
    setTimeout(() => {
        previewViewer = pannellum.viewer('previewPanorama', { type:'equirectangular', panorama:src, autoLoad:true, showZoomCtrl:false, showFullscreenCtrl:false });
        previewViewer.on('load', () => {
            setupHotspotClick();
            hotspots.filter(h => (h.parentId||null) === (currentParentId||null)).forEach(h => {
                try { previewViewer.addHotSpot({ id:h.id, pitch:h.pitch, yaw:h.yaw, type:'info', text:h.text }); } catch(e){}
            });
            updateHotspotsList();
        });
    }, 100);
}

function setupHotspotClick() {
    const div = document.getElementById('previewPanorama'); if (!div) return;
    div.addEventListener('click', e => {
        if (!addingHotspot) return;
        e.preventDefault(); e.stopPropagation();
        let coords;
        try { coords = previewViewer.mouseEventToCoords(e); } catch { coords = [previewViewer.getPitch(), previewViewer.getYaw()]; }
        addHotspot(coords[0], coords[1]);
    });
}

// ── Hotspots ──────────────────────────────────────────────
function addHotspot(pitch, yaw) {
    const h = { id:'hs_'+Date.now(), pitch, yaw, text:'Ponto '+(hotspots.length+1), targetImage:'', parentId:currentParentId, type:'normal' };
    hotspots.push(h);
    if (previewViewer) previewViewer.addHotSpot({ id:h.id, pitch:h.pitch, yaw:h.yaw, type:'info', text:h.text });
    updateHotspotsList();
    setAddHotspotMode(false);
    autoSave();
    showToast('Ponto adicionado!', 'success');
}

function updateHotspotsList() {
    const list = document.getElementById('hotspotsList'); if (!list) return;
    list.innerHTML = '';
    if (currentParentId) {
        const back = document.createElement('button'); back.textContent = '↩ Voltar'; back.className = 'btn-secondary'; back.style.marginBottom = '8px';
        back.addEventListener('click', goBackToParent); list.appendChild(back);
    }
    hotspots.filter(h => (h.parentId||null) === (currentParentId||null)).forEach((h, i) => {
        const item = document.createElement('div'); item.className = 'hotspot-item';
        const lbl = document.createElement('div'); lbl.style.cssText = 'font-weight:600;margin-bottom:8px;'; lbl.textContent = `Ponto ${i+1}`;
        const ni = document.createElement('input'); ni.type = 'text'; ni.className = 'hotspot-input'; ni.value = h.text;
        ni.addEventListener('change', () => updateHotspotText(h.id, ni.value));
        const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.style.cssText = 'width:100%;margin-bottom:8px;';
        fi.addEventListener('change', () => updateHotspotImage(h.id, fi));
        const ab = document.createElement('button'); ab.style.cssText = 'width:100%;margin-bottom:8px;'; ab.className = 'btn-secondary';
        if (h.targetImage) { ab.textContent = '🔍 Entrar no Ponto'; ab.addEventListener('click', () => enterHotspot(h.id)); }
        else { ab.textContent = 'Testar Posição'; ab.addEventListener('click', () => previewViewer && previewViewer.lookAt(h.pitch, h.yaw, 75, 1000)); }
        const rb = document.createElement('button'); rb.style.width = '100%'; rb.className = 'btn-danger'; rb.textContent = 'Remover';
        rb.addEventListener('click', () => removeHotspot(h.id));
        item.appendChild(lbl); item.appendChild(ni); item.appendChild(fi); item.appendChild(ab); item.appendChild(rb);
        list.appendChild(item);
    });
}

function updateHotspotText(id, text) {
    const h = hotspots.find(h => h.id === id); if (!h) return;
    h.text = text;
    if (previewViewer) { previewViewer.removeHotSpot(id); previewViewer.addHotSpot({ id:h.id, pitch:h.pitch, yaw:h.yaw, type:'info', text }); }
    autoSave();
}

function updateHotspotImage(id, input) {
    const file = input.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
        const h = hotspots.find(h => h.id === id); if (!h) return;
        h.targetImage = ev.target.result;
        updateHotspotsList(); autoSave();
        showToast('Imagem adicionada!', 'success');
    };
    r.readAsDataURL(file);
}

function enterHotspot(id) {
    const h = hotspots.find(h => h.id === id); if (!h || !h.targetImage || !previewViewer) return;
    currentParentId = h.id; previewCurrentImage = h.targetImage;
    showImagePreview(h.targetImage); currentParentId = h.id; updateHotspotsList();
}

function goBackToParent() {
    const ph = hotspots.find(h => h.id === currentParentId);
    currentParentId = ph ? (ph.parentId || null) : null;
    const src = currentParentId ? (hotspots.find(h => h.id === currentParentId)?.targetImage || previewRootImage) : previewRootImage;
    showImagePreview(src); updateHotspotsList();
}

function removeHotspot(id) {
    hotspots = hotspots.filter(h => h.id !== id);
    if (previewViewer) previewViewer.removeHotSpot(id);
    updateHotspotsList(); autoSave();
}

function removeAllHotspots() {
    hotspots = []; updateHotspotsList();
    if (previewViewer) previewViewer.removeAllHotSpots();
    autoSave();
}

function setAddHotspotMode(on) {
    const btn = document.getElementById('addHotspotBtn'); addingHotspot = !!on;
    if (!btn) return;
    btn.classList.toggle('btn-primary', on); btn.classList.toggle('btn-secondary', !on);
    btn.textContent = on ? 'Clique na imagem' : 'Adicionar Ponto';
}

// ── Viewer ────────────────────────────────────────────────
function showViewer(projectName) {
    const project = projects[projectName]; if (!project) return;
    currentProjectName = projectName;
    currentScene = 'main';
    currentParentId = null;
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('viewerContainer').classList.remove('hidden');
    document.getElementById('projectTitle').textContent = project.title;
    document.getElementById('navProjectTitle').textContent = project.title;
    const logo = document.getElementById('projectLogo');
    if (project.logo) { logo.src = project.logo; logo.style.display = 'block'; } else logo.style.display = 'none';
    projectHotspots = project.hotspots || [];
    renderNavTree(null);
    loadScene(null);
}

// Renderiza a árvore de navegação na sidebar
function renderNavTree(activeSceneId) {
    const container = document.getElementById('navRooms');
    container.innerHTML = '';

    // Função recursiva para renderizar nós
    function renderNode(parentId, depth) {
        const children = projectHotspots.filter(h => (h.parentId || null) === parentId);
        children.forEach(h => {
            const btn = document.createElement('button');
            btn.style.cssText = `display:block;width:100%;text-align:left;padding:8px 8px 8px ${16 + depth*16}px;border:none;background:${activeSceneId === h.id ? 'rgba(62,179,223,0.2)' : 'transparent'};color:var(--text);cursor:pointer;border-radius:4px;margin-bottom:2px;font-size:14px;`;
            btn.innerHTML = `${'&nbsp;&nbsp;'.repeat(depth)}${depth > 0 ? '└ ' : ''}📍 ${sanitize(h.text)}`;
            if (h.targetImage) {
                btn.addEventListener('click', () => {
                    document.getElementById('navSidebar').classList.remove('open');
                    loadScene(h.id);
                });
            } else {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'default';
            }
            container.appendChild(btn);
            if (h.targetImage) renderNode(h.id, depth + 1);
        });
    }

    // Botão para voltar ao início
    const homeBtn = document.createElement('button');
    homeBtn.style.cssText = `display:block;width:100%;text-align:left;padding:8px;border:none;background:${!activeSceneId ? 'rgba(62,179,223,0.2)' : 'transparent'};color:var(--text);cursor:pointer;border-radius:4px;margin-bottom:2px;font-size:14px;font-weight:600;`;
    homeBtn.textContent = '🏠 Início';
    homeBtn.addEventListener('click', () => {
        document.getElementById('navSidebar').classList.remove('open');
        loadScene(null);
    });
    container.appendChild(homeBtn);
    renderNode(null, 0);
}

// Carrega uma cena pelo id do hotspot (null = cena principal)
function loadScene(sceneId) {
    currentScene = sceneId || 'main';
    currentParentId = sceneId;
    if (!checkPannellum()) return;
    if (viewer) { try { viewer.destroy(); } catch(e){} viewer = null; }

    const project = projects[currentProjectName];
    let panorama, hotSpotsForScene;

    if (!sceneId) {
        panorama = project.image;
        hotSpotsForScene = projectHotspots.filter(h => (h.parentId || null) === null);
    } else {
        const sceneHotspot = projectHotspots.find(h => h.id === sceneId);
        if (!sceneHotspot || !sceneHotspot.targetImage) return;
        panorama = sceneHotspot.targetImage;
        hotSpotsForScene = projectHotspots.filter(h => h.parentId === sceneId);
    }

    try {
        viewer = pannellum.viewer('panorama', {
            type: 'equirectangular',
            panorama,
            autoLoad: true,
            autoRotate: -2,
            compass: true,
            showZoomCtrl: true,
            showFullscreenCtrl: true,
            hotSpots: hotSpotsForScene.map(h => ({
                id: h.id, pitch: h.pitch, yaw: h.yaw, type: 'info', text: h.text,
                clickHandlerFunc: () => {
                    if (h.targetImage) {
                        loadScene(h.id);
                        renderNavTree(h.id);
                    }
                }
            }))
        });
        viewer.on('load', updateUrlState);
    } catch(e) { showToast('Não foi possível carregar o panorama.', 'danger'); }

    renderNavTree(sceneId);
    updateUrlState();
}

function updateUrlState() {
    if (!viewer || !currentProjectName) return;
    try {
        const p = new URLSearchParams(); p.set('project', currentProjectName);
        if (currentScene && currentScene !== 'main') p.set('scene', currentScene);
        history.replaceState({}, '', `${location.origin}${location.pathname}?${p}`);
    } catch(e) {}
}

function toggleNavigation() {
    if (isAdminAuthenticated) {
        if (viewer) { viewer.destroy(); viewer = null; }
        document.getElementById('viewerContainer').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
    } else {
        const base = projects[BASE_PROJECT_KEY];
        if (base && base.image) { showViewer(BASE_PROJECT_KEY); document.getElementById('adminAccessBtn').style.display = 'flex'; document.getElementById('shareBtn').style.display = 'none'; }
        else logout();
    }
}

function logout() {
    if (viewer) { viewer.destroy(); viewer = null; }
    if (previewViewer) { previewViewer.destroy(); previewViewer = null; }
    document.getElementById('viewerContainer').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('adminAccessBtn').style.display = 'none';
    document.getElementById('adminForm').reset();
    hideError(); resetCreateForm(); isAdminAuthenticated = false;
    const base = projects[BASE_PROJECT_KEY];
    if (base && base.image) { showViewer(BASE_PROJECT_KEY); document.getElementById('adminAccessBtn').style.display = 'flex'; document.getElementById('shareBtn').style.display = 'none'; }
    else document.getElementById('loginContainer').classList.remove('hidden');
}

// ── Form ──────────────────────────────────────────────────
function resetCreateForm() {
    editingProjectName = null;
    document.getElementById('createProjectForm').reset();
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('logoPreview').classList.add('hidden');
    document.getElementById('logoUploadText').textContent = '🖼️ Clique para selecionar uma logo';
    hotspots = [];
    const ng = document.getElementById('newProjectName').closest('.form-group');
    if (ng) ng.style.display = '';
    if (previewViewer) { previewViewer.destroy(); previewViewer = null; }
}

// ── Utilities ─────────────────────────────────────────────
function sanitize(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function checkPannellum() {
    if (typeof pannellum === 'undefined') { showToast('Pannellum não carregado', 'danger'); return false; }
    return true;
}

function showError(msg) { const e = document.getElementById('errorMessage'); if(e){e.textContent=msg;e.classList.remove('hidden');} }
function hideError()    { const e = document.getElementById('errorMessage'); if(e) e.classList.add('hidden'); }

function showToast(message, type = 'success') {
    const e = document.getElementById('errorMessage'); if (!e) return;
    e.textContent = message; e.className = `error ${type}`; e.classList.remove('hidden');
    setTimeout(() => { e.classList.add('hidden'); e.className = 'error'; }, 3000);
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.getElementById('themeToggleBtn').textContent = dark ? 'Modo Claro' : 'Modo Escuro';
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('themeToggleBtn').textContent = 'Modo Claro';
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
}

function showHelpModal()  { document.getElementById('helpModal').classList.remove('hidden'); }
function closeHelpModal() { document.getElementById('helpModal').classList.add('hidden'); }

// ── Share ─────────────────────────────────────────────────
function initShareButton() {
    const btn = document.getElementById('shareBtn');
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Compartilhar'; }
}

function showShareModal() {
    if (!currentProjectName) return;
    const project = projects[currentProjectName]; if (!project) return;
    const data = { t:project.title, i:project.image, l:project.logo||null, h:project.hotspots||[] };
    const url = `${location.protocol}//${location.host}${location.pathname}?d=${btoa(JSON.stringify(data))}`;
    document.getElementById('shareUrl').value = url;
    document.getElementById('embedCode').value = `<iframe src="${url}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`;
    document.getElementById('shareModal').classList.remove('hidden');
}

function closeShareModal() { document.getElementById('shareModal').classList.add('hidden'); }
function copyShareUrl()    { copyToClipboard(document.getElementById('shareUrl').value, 'Link copiado!'); }
function copyEmbedCode()   { copyToClipboard(document.getElementById('embedCode').value, 'Código copiado!'); }

function copyToClipboard(text, msg) {
    if (navigator.clipboard && window.isSecureContext)
        navigator.clipboard.writeText(text).then(() => showShareToast(msg)).catch(() => fallbackCopy(text, msg));
    else fallbackCopy(text, msg);
}

function fallbackCopy(text, msg) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;'; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); if(msg) showShareToast(msg); } catch(e) { prompt('Copie:', text); } ta.remove();
}

function showShareToast(msg) {
    const t = document.getElementById('shareToast'); if (!t) return;
    t.querySelector('.toast-message').textContent = msg; t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function shareOnWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent('Tour virtual 360°: '+document.getElementById('shareUrl').value)}`, '_blank'); }
function shareOnFacebook() { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(document.getElementById('shareUrl').value)}`, '_blank'); }
function shareOnTwitter()  { window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(document.getElementById('shareUrl').value)}`, '_blank'); }
function shareByEmail() {
    const url = document.getElementById('shareUrl').value;
    window.open(`mailto:?subject=${encodeURIComponent('Tour Virtual 360°')}&body=${encodeURIComponent('Confira: '+url)}`);
}

function handleSharedUrl(dataParam) {
    try {
        const d = JSON.parse(atob(dataParam));
        if (!d.t || !d.i) throw new Error();
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('viewerContainer').classList.remove('hidden');
        document.getElementById('projectTitle').textContent = d.t;
        document.getElementById('navProjectTitle').textContent = d.t;
        document.getElementById('navSidebar').style.display = 'none';
        document.getElementById('shareBtn').style.display = 'none';
        document.getElementById('adminAccessBtn').style.display = 'none';
        if (d.l) { const logo = document.getElementById('projectLogo'); logo.src = d.l; logo.style.display = 'block'; }
        waitForPannellum(() => {
            try { pannellum.viewer('panorama', { type:'equirectangular', panorama:d.i, autoLoad:true, autoRotate:-2, compass:true, showZoomCtrl:true, showFullscreenCtrl:true }); }
            catch(e) { console.error(e); }
        });
    } catch(e) { document.getElementById('loginContainer').classList.remove('hidden'); }
}

function getPublicBaseUrl() {
    const h = location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1' && !h.startsWith('192.168'))
        return `${location.protocol}//${location.host}${location.pathname.replace('/index.html','')}`;
    return location.origin;
}

// Tour Virtual Script
class TourViewer {
    constructor() {
        this.currentProject = null;
        this.viewer = null;
        this.currentSceneId = null;
        this.isFullscreen = false;
        
        this.init();
    }

    async init() {
        // Obter ID do projeto da URL
        const projectId = this.getProjectIdFromURL();
        
        if (!projectId) {
            this.showError('ID do projeto não fornecido na URL');
            return;
        }

        try {
            // Carregar dados do projeto
            await this.loadProject(projectId);
            
            // Inicializar visualizador
            this.initViewer();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Ocultar loading e mostrar tour
            this.hideLoading();
            
        } catch (error) {
            console.error('Erro ao carregar projeto:', error);
            this.showError('Erro ao carregar o projeto');
        }
    }

    getProjectIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadProject(projectId) {
        try {
            // Carregar dados dos projetos
            const response = await fetch('projects.json');
            if (!response.ok) {
                throw new Error('Erro ao carregar dados dos projetos');
            }
            
            const data = await response.json();
            const project = data.projects.find(p => p.id === projectId);
            
            if (!project) {
                throw new Error('Projeto não encontrado');
            }
            
            this.currentProject = project;
            
            // Atualizar informações do projeto na interface
            this.updateProjectInfo();
            
        } catch (error) {
            throw error;
        }
    }

    updateProjectInfo() {
        const project = this.currentProject;
        
        // Atualizar título
        document.getElementById('projectTitle').textContent = project.title || project.name;
        document.title = `${project.title || project.name} - AMBI360`;
        
        // Atualizar logo se disponível
        if (project.logo) {
            document.getElementById('projectLogo').src = project.logo;
        }
    }

    initViewer() {
        const project = this.currentProject;
        
        // Configuração básica do Pannellum
        const config = {
            type: 'equirectangular',
            panorama: project.image,
            autoLoad: true,
            showControls: false,
            showFullscreenCtrl: false,
            showZoomCtrl: false,
            mouseZoom: true,
            autoRotate: -2,
            autoRotateInactivityDelay: 3000,
            autoRotateStopDelay: 3000,
            compass: false,
            northOffset: project.northOffset || 0,
            pitch: project.pitch || 0,
            yaw: project.yaw || 0,
            hfov: project.hfov || 100,
            minHfov: 50,
            maxHfov: 120
        };

        // Adicionar hotspots se existirem
        if (project.hotspots && project.hotspots.length > 0) {
            config.hotSpots = project.hotspots.map(hotspot => ({
                pitch: hotspot.pitch,
                yaw: hotspot.yaw,
                type: hotspot.type || 'info',
                text: hotspot.text || hotspot.title,
                URL: hotspot.url || null,
                clickHandlerFunc: hotspot.type === 'scene' ? 
                    () => this.navigateToScene(hotspot.targetScene) : null
            }));
        }

        // Inicializar Pannellum
        this.viewer = pannellum.viewer('panorama', config);
        
        // Eventos do viewer
        this.viewer.on('load', () => {
            console.log('Panorama carregado com sucesso');
            this.setupNavigationControls();
        });

        this.viewer.on('error', (error) => {
            console.error('Erro no viewer:', error);
            this.showError('Erro ao carregar a imagem 360°');
        });
    }

    setupNavigationControls() {
        const project = this.currentProject;
        
        // Se há múltiplas cenas, mostrar controles de navegação
        if (project.scenes && project.scenes.length > 1) {
            this.showNavigationControls();
        }
    }

    showNavigationControls() {
        const controlsElement = document.getElementById('navigationControls');
        const scenesListElement = document.getElementById('scenesList');
        
        // Limpar lista existente
        scenesListElement.innerHTML = '';
        
        // Adicionar botões para cada cena
        this.currentProject.scenes.forEach(scene => {
            const button = document.createElement('button');
            button.className = 'scene-btn';
            button.textContent = scene.name;
            button.onclick = () => this.navigateToScene(scene.id);
            
            if (scene.id === this.currentSceneId) {
                button.classList.add('active');
            }
            
            scenesListElement.appendChild(button);
        });
        
        controlsElement.classList.remove('hidden');
    }

    navigateToScene(sceneId) {
        const scene = this.currentProject.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        // Atualizar viewer com nova cena
        this.viewer.loadScene(scene.id);
        this.currentSceneId = sceneId;
        
        // Atualizar botões ativos
        document.querySelectorAll('.scene-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = Array.from(document.querySelectorAll('.scene-btn'))
            .find(btn => btn.textContent === scene.name);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    setupEventListeners() {
        // Botão compartilhar
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareProject();
        });

        // Botão tela cheia
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Botão ajuda
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showHelpModal();
        });

        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isFullscreen) {
                    this.exitFullscreen();
                }
                this.closeHelpModal();
            }
        });

        // Eventos de fullscreen
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();
        });
    }

    async shareProject() {
        const currentURL = window.location.href;
        
        try {
            // Tentar usar a API moderna de clipboard
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(currentURL);
            } else {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = currentURL;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            
            // Mostrar mensagem de sucesso
            this.showShareSuccess();
            
        } catch (error) {
            console.error('Erro ao copiar link:', error);
            // Fallback: mostrar o link em um prompt
            prompt('Copie o link abaixo:', currentURL);
        }
    }

    showShareSuccess() {
        const successElement = document.getElementById('shareSuccess');
        successElement.classList.remove('hidden');
        
        // Ocultar após 3 segundos
        setTimeout(() => {
            successElement.classList.add('hidden');
        }, 3000);
    }

    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    enterFullscreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    updateFullscreenButton() {
        const button = document.getElementById('fullscreenBtn');
        const icon = button.querySelector('.fullscreen-icon');
        
        if (this.isFullscreen) {
            icon.textContent = '⛶';
            button.title = 'Sair da Tela Cheia';
        } else {
            icon.textContent = '⛶';
            button.title = 'Tela Cheia';
        }
    }

    showHelpModal() {
        document.getElementById('helpModal').classList.remove('hidden');
    }

    closeHelpModal() {
        document.getElementById('helpModal').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('tourContainer').classList.remove('hidden');
    }

    showError(message) {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('errorScreen').classList.remove('hidden');
        
        // Atualizar mensagem de erro se necessário
        const errorText = document.querySelector('.error-content p');
        if (errorText && message) {
            errorText.textContent = message;
        }
    }
}

// Função global para fechar modal de ajuda
function closeHelpModal() {
    document.getElementById('helpModal').classList.add('hidden');
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new TourViewer();
});

// Suporte para iframe embedding
if (window.parent !== window) {
    // Está sendo executado em iframe
    document.body.classList.add('embedded');
    
    // Remover alguns controles se necessário para iframe
    document.addEventListener('DOMContentLoaded', () => {
        // Pode adicionar lógica específica para iframe aqui
    });
}
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3005;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use(express.static(__dirname, {
    maxAge: 0,
    etag: false,
    setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'no-cache');
        if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
        else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
        else if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
    }
}));

// ── API de persistência ──────────────────────────────────

// Salvar projetos
app.post('/api/projects/save', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error('Erro ao salvar:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Carregar projetos
app.get('/api/projects/load', (req, res) => {
    try {
        if (!fs.existsSync(DATA_FILE)) return res.json({});
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.json({});
    }
});

// Upload de imagem
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    res.json({ url: '/uploads/' + req.file.filename });
});

// ────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Erro:', err.message);
    res.status(500).json({ error: 'Erro interno' });
});

const server = app.listen(PORT, '127.0.0.1', () => {
    console.log('\n🚀 AMBI360 FUNCIONANDO!');
    console.log('========================');
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log('🔑 Senha: admin123');
    console.log('========================\n');
});

server.timeout = 30000;
server.headersTimeout = 31000;
server.keepAliveTimeout = 5000;

module.exports = app;

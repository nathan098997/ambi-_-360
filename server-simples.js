// =============================================
// AMBI360 - Servidor Simples
// =============================================

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3005;
const DATA_FILE = path.join(__dirname, 'data.json');

// Storage para uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Configurações de segurança para evitar erro 431
app.use((req, res, next) => {
    // Limitar tamanho dos cabeçalhos
    if (req.headers && Object.keys(req.headers).length > 50) {
        return res.status(431).send('Request Header Fields Too Large');
    }
    next();
});

// Middlewares básicos
app.use(cors({
    origin: ['http://localhost:3005', 'http://127.0.0.1:3005', 'http://localhost:8000'],
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configurar limites menores para evitar erro 431
app.use(express.json({ 
    limit: '10mb',
    strict: false
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 1000
}));

// Servir arquivos estáticos da raiz do projeto
app.use(express.static(__dirname, {
    maxAge: '1h',
    etag: false,
    setHeaders: (res, filePath) => {
        // Adicionar cabeçalhos de segurança
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        // MIME types
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
    }
}));

// Rota principal
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (error) {
        console.error('Erro ao servir index.html:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Rota para view.html
app.get('/view', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'view.html'));
    } catch (error) {
        res.redirect('/');
    }
});

// Rota para tour.html
app.get('/tour', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'tour.html'));
    } catch (error) {
        res.redirect('/');
    }
});

// API: salvar projetos
app.post('/api/projects/save', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: carregar projetos
app.get('/api/projects/load', (req, res) => {
    try {
        if (!fs.existsSync(DATA_FILE)) return res.json({});
        res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    } catch (e) {
        res.json({});
    }
});

// API: upload de imagem
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo' });
    res.json({ url: '/uploads/' + req.file.filename });
});

// API simples para projetos
app.get('/api/projects', (req, res) => {
    res.json({ 
        success: true,
        message: 'API funcionando - dados salvos no localStorage do navegador',
        projects: []
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'AMBI360',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err.message);
    
    // Tratar erro 431 especificamente
    if (err.code === 'HPE_HEADER_OVERFLOW' || err.status === 431) {
        return res.status(431).json({
            error: 'Cabeçalhos da requisição muito grandes',
            message: 'Tente limpar o cache do navegador'
        });
    }
    
    res.status(err.status || 500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
    });
});

// 404 handler - sempre redirecionar para index
app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configurar servidor HTTP com limites
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n========================================');
    console.log('🚀 AMBI360 - Tours Virtuais 360°');
    console.log('========================================');
    console.log(`📱 Local: http://localhost:${PORT}`);
    console.log(`🌐 Rede: http://127.0.0.1:${PORT}`);
    console.log('========================================');
    console.log('✅ Servidor funcionando!');
    console.log('⚠️  Para parar: Ctrl+C');
    console.log('========================================\n');
});

// Configurar timeouts para evitar problemas
server.timeout = 30000; // 30 segundos
server.headersTimeout = 31000; // 31 segundos
server.keepAliveTimeout = 5000; // 5 segundos

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🔄 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🔄 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

module.exports = app;
const express = require('express');
const path = require('path');

console.log('Testando AMBI360...');
console.log('Node.js:', process.version);

try {
    const app = express();
    console.log('Express carregado com sucesso');
    
    // Verificar arquivos essenciais
    const fs = require('fs');
    const files = ['index.html', 'script.js', 'style.css'];
    
    files.forEach(file => {
        if (fs.existsSync(path.join(__dirname, file))) {
            console.log(`✅ ${file} encontrado`);
        } else {
            console.log(`❌ ${file} não encontrado`);
        }
    });
    
    console.log('✅ Teste básico passou');
    console.log('Execute: npm start');
    
} catch (error) {
    console.log('❌ Erro:', error.message);
}
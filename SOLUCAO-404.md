# Solução para Erro 404 no GitHub Pages

## Problema Identificado
O erro 404 acontece porque o sistema estava gerando links que apontavam para arquivos inexistentes ou em locais incorretos no GitHub Pages.

## Correções Implementadas

### 1. Sistema de URL Unificado
- Padronizado para usar apenas o formato `?d=...` (dados comprimidos)
- Removido conflito entre formatos `?project=...` e `?d=...`

### 2. Detecção Automática de URL Base
- Sistema agora detecta automaticamente a URL do GitHub Pages
- Não precisa mais configurar URLs manualmente

### 3. Compatibilidade com GitHub Pages
- Links agora apontam para `index.html` da raiz
- Sistema funciona tanto localmente quanto no GitHub Pages

## Para Resolver Completamente

### 1. Fazer Commit e Push
```bash
git add .
git commit -m "Fix: Corrigir sistema de compartilhamento e URLs 404"
git push origin main
```

### 2. Configurar GitHub Pages
- Vá para Settings > Pages no repositório
- Source: Deploy from a branch  
- Branch: main / (root)
- Salvar configurações

### 3. Aguardar Deploy
- GitHub Actions executará automaticamente
- Verificar em Actions se deploy foi bem-sucedido

## Como Funciona Agora
1. Crie um projeto normalmente
2. Clique em "Compartilhar" 
3. O link gerado funcionará em qualquer dispositivo
4. Formato: `https://seu-usuario.github.io/AMBI-360/?d=...`

## Arquivos Modificados
- `script.js` - Sistema de compartilhamento corrigido
- `frontend/script.js` - URLs de compartilhamento corrigidas

O sistema agora está preparado para funcionar corretamente no GitHub Pages.
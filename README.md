# AMBI360 - Tours Virtuais 360°

🌟 **Plataforma completa para criação e gestão de tours virtuais 360°**

## 🚀 Início Rápido

### Opção 1: Inicialização Automática (Windows)
```bash
# Clique duas vezes no arquivo:
iniciar.bat
```

### Opção 2: Linha de Comando
```bash
# 1. Instalar dependências
npm install

# 2. Configurar projeto
npm run setup

# 3. Iniciar servidor
npm start
```

### Opção 3: Servidor Python (Alternativo)
```bash
# Execute o arquivo:
servidor-local.bat
```

## 📱 Acesso

- **URL Local:** http://localhost:3005
- **Senha Admin:** `admin123`
- **Painel Admin:** Faça login para gerenciar projetos

## ✨ Funcionalidades

### 🎯 Principais
- ✅ **Tours 360°** - Visualização panorâmica completa
- ✅ **Hotspots Interativos** - Pontos clicáveis para navegação
- ✅ **Gestão de Projetos** - Criar, editar e organizar tours
- ✅ **Sistema de Compartilhamento** - Links públicos e embeds
- ✅ **Lixeira** - Recuperação de projetos excluídos
- ✅ **Modo Escuro** - Interface adaptável
- ✅ **Responsivo** - Funciona em desktop e mobile

### 🔧 Técnicas
- ✅ **LocalStorage** - Armazenamento local dos dados
- ✅ **IndexedDB** - Backup avançado dos projetos
- ✅ **Pannellum.js** - Engine 360° profissional
- ✅ **Express.js** - Servidor web robusto
- ✅ **GitHub Pages** - Deploy automático

## 📋 Como Usar

### 1. **Fazer Login**
- Acesse http://localhost:3005
- Digite a senha: `admin123`
- Clique em "Entrar como Admin"

### 2. **Criar Projeto**
- Clique em "Criar Projeto"
- Preencha nome e título
- Faça upload da imagem 360°
- Adicione logo (opcional)
- Clique na imagem para adicionar hotspots
- Salve o projeto

### 3. **Gerenciar Projetos**
- **Ver:** Visualizar o tour
- **Editar:** Modificar configurações
- **Excluir:** Mover para lixeira
- **Restaurar:** Recuperar da lixeira

### 4. **Compartilhar**
- Abra um projeto
- Clique em "🔗 Compartilhar"
- Copie o link ou código embed
- Compartilhe em redes sociais

## 🛠️ Estrutura do Projeto

```
AMBI-360/
├── 📁 backend/          # Servidor avançado (opcional)
├── 📁 frontend/         # Interface alternativa
├── 📁 scripts/          # Scripts de configuração
├── 📁 uploads/          # Arquivos enviados
├── 📄 index.html        # Página principal
├── 📄 script.js         # Lógica JavaScript
├── 📄 style.css         # Estilos CSS
├── 📄 server-simples.js # Servidor principal
├── 📄 iniciar.bat       # Inicialização Windows
└── 📄 package.json      # Dependências Node.js
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente (.env)
```env
APP_PORT=3005
ADMIN_PASSWORD=admin123
MAX_FILE_SIZE=50MB
DEBUG_MODE=true
```

### Comandos NPM
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desenvolvimento
npm run setup      # Configurar projeto
npm test           # Testar configuração
```

## 🌐 Deploy

### GitHub Pages (Automático)
1. Faça push para o repositório
2. GitHub Actions fará o deploy
3. Acesse: `https://[usuario].github.io/[repositorio]`

### Servidor Próprio
1. Faça upload dos arquivos
2. Execute `npm install`
3. Execute `npm start`
4. Configure domínio/DNS

## 🐛 Solução de Problemas

### ❌ "Pannellum não carregado"
- Verifique conexão com internet
- CDN do Pannellum pode estar offline
- Use versão local se necessário

### ❌ "Erro ao carregar imagem"
- Verifique formato da imagem (JPG/PNG)
- Imagem deve ser equiretangular 360°
- Tamanho máximo: 50MB

### ❌ "Servidor não inicia"
- Verifique se Node.js está instalado
- Execute `npm install`
- Verifique se porta 3005 está livre

### ❌ "Projetos não salvam"
- Verifique se localStorage está habilitado
- Limpe cache do navegador
- Tente modo privado/incógnito

## 📞 Suporte

- **Documentação:** Veja os arquivos .md na pasta raiz
- **Issues:** Use o sistema de issues do GitHub
- **Email:** Contate o desenvolvedor

## 📄 Licença

MIT License - Veja arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ para criar experiências imersivas em 360°**
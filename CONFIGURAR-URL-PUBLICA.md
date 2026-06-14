# CONFIGURAÇÃO DE URL PÚBLICA - AMBI360

## 🌐 COMO CONFIGURAR LINK PÚBLICO UNIVERSAL

### 1. ABRA O ARQUIVO: `script.js`

### 2. ENCONTRE A SEÇÃO (linha ~690):
```javascript
const PUBLIC_SITE_CONFIG = {
    baseUrl: 'https://seu-usuario.github.io/ambi360',
    // ...
};
```

### 3. SUBSTITUA PELA SUA URL REAL:

#### GitHub Pages:
```javascript
baseUrl: 'https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO',
```

#### Netlify:
```javascript
baseUrl: 'https://SEU-SITE.netlify.app',
```

#### Vercel:
```javascript
baseUrl: 'https://SEU-SITE.vercel.app',
```

#### Domínio próprio:
```javascript
baseUrl: 'https://www.meusite.com',
```

### 4. EXEMPLOS REAIS:

```javascript
// GitHub Pages
baseUrl: 'https://joaosilva.github.io/ambi360',

// Netlify
baseUrl: 'https://meu-tour-360.netlify.app',

// Domínio próprio
baseUrl: 'https://www.minhaempresa.com.br/tours',
```

## 🔧 COMO FUNCIONA

### DESENVOLVIMENTO LOCAL:
- Quando você testa em `localhost` → usa URL configurada
- Link gerado: `https://seu-site.com/?project=sala&scene=2&point=5`

### PRODUÇÃO (SITE HOSPEDADO):
- Detecta automaticamente a URL real
- Link gerado: `https://site-real.com/?project=sala&scene=2&point=5`

## ✅ RESULTADO

- ✅ **Links funcionam em qualquer PC/celular**
- ✅ **Não dependem de localhost**
- ✅ **Compartilhamento universal**
- ✅ **Detecção automática em produção**

## 🚀 DEPLOY RECOMENDADO

1. **GitHub Pages** (gratuito)
2. **Netlify** (gratuito)
3. **Vercel** (gratuito)
4. **Firebase Hosting** (gratuito)

Após fazer deploy, os links funcionarão em qualquer lugar do mundo! 🌍
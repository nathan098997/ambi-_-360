@echo off
title AMBI360 - Tours Virtuais 360
color 0A

echo.
echo ========================================
echo    AMBI360 - Tours Virtuais 360
echo ========================================
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo 📥 Baixe em: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
echo.

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependencias
        pause
        exit /b 1
    )
)

echo ✅ Dependencias OK
echo.

REM Executar setup rápido
echo 🔧 Configurando projeto...
node scripts/quick-start.js

echo.
echo 🚀 Iniciando servidor...
echo.
echo 📱 Acesse: http://localhost:3005
echo 🔑 Senha admin: admin123
echo.
echo ⚠️  Para parar o servidor, pressione Ctrl+C
echo.

REM Iniciar servidor
npm start

pause
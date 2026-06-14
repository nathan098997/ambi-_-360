@echo off
echo Iniciando servidor local para AMBI-360...
echo.
echo Acesse no computador: http://localhost:8000
echo Acesse no celular: http://SEU_IP:8000
echo.
echo Para descobrir seu IP, abra outro terminal e digite: ipconfig
echo.
cd /d "c:\Users\PC_CASA\Desktop\AMBI-360\frontend"
python -m http.server 8000
pause
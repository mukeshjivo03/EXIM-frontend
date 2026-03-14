cd C:\LiveProjects\JIvo-Exim\EXIM-frontend

echo Pulling frontend code...
git pull origin main

echo Installing packages...
 call npm install

echo Building frontend...
 call npm run build

echo Frontend deployed successfully
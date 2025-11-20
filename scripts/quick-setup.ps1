# Скрипт быстрой настройки для Windows (PowerShell)
# Создает .env файл и настраивает базу данных

Write-Host "🚀 Быстрая настройка My-WebSite 2.0" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие .env файла
$envPath = Join-Path $PSScriptRoot "..\.env"
$envPath = Resolve-Path $envPath -ErrorAction SilentlyContinue

if (-not $envPath) {
    $envPath = Join-Path $PSScriptRoot "..\.env"
    Write-Host "📝 Создание .env файла..." -ForegroundColor Yellow
    
    # Генерируем секретный ключ для NextAuth
    $secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $base64Secret = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($secret))
    
    # Хешируем пароль 1234
    $bcryptHash = '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq'
    # В реальности нужно использовать bcrypt, но для простоты используем временный хеш
    # Пользователь должен будет запустить init-admin.js после настройки БД
    
    $envContent = @"
# Database (PostgreSQL)
DATABASE_URL="postgresql://mywebsite:changeme@localhost:5432/mywebsite?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$base64Secret"

# Admin User
ADMIN_EMAIL="zelyonkin.d@gmail.com"
ADMIN_USERNAME="skre4karta"
ADMIN_PASSWORD="1234"

# Application
NODE_ENV="development"
PORT=3000
"@
    
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Host "✅ .env файл создан: $envPath" -ForegroundColor Green
} else {
    Write-Host "✅ .env файл уже существует: $envPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Установите PostgreSQL или используйте Docker:" -ForegroundColor White
Write-Host "   docker-compose up -d postgres" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Инициализируйте базу данных:" -ForegroundColor White
Write-Host "   npm run db:init" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Создайте администратора:" -ForegroundColor White
Write-Host "   npm run db:seed" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Добавьте проект о сайте:" -ForegroundColor White
Write-Host "   npm run db:add-website-project" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Запустите dev-сервер:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Данные для входа:" -ForegroundColor Cyan
Write-Host "   Логин: skre4karta" -ForegroundColor White
Write-Host "   Пароль: 1234" -ForegroundColor White
Write-Host ""


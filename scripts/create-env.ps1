# Скрипт для создания .env файла с правильными настройками
# Использование: .\scripts\create-env.ps1

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env файл уже существует: $envPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Перезаписать? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Отменено." -ForegroundColor Gray
        exit 0
    }
}

Write-Host "📝 Создание .env файла..." -ForegroundColor Cyan

# Генерируем секретный ключ для NextAuth
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$nextAuthSecret = [Convert]::ToBase64String($bytes)

# Хеш пароля 1234 (bcrypt)
# Для правильного хеша нужно использовать bcrypt, но для начала можно использовать временный
# Правильный хеш будет сгенерирован при запуске init-admin.js
$passwordHash = '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq'

$envContent = @"
# Database (PostgreSQL)
# Для локальной разработки используйте:
DATABASE_URL="postgresql://mywebsite:changeme@localhost:5432/mywebsite?schema=public"

# Или для Docker Compose (автоматически настроится):
# DATABASE_URL="postgresql://mywebsite:changeme@postgres:5432/mywebsite?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$nextAuthSecret"

# Admin User
ADMIN_EMAIL="zelyonkin.d@gmail.com"
ADMIN_USERNAME="skre4karta"
ADMIN_PASSWORD="1234"
# ADMIN_PASSWORD_HASH будет сгенерирован автоматически при запуске init-admin.js

# Application
NODE_ENV="development"
PORT=3000
"@

Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "✅ .env файл создан: $envPath" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Запустите PostgreSQL (Docker): docker-compose up -d postgres" -ForegroundColor White
Write-Host "2. Инициализируйте БД: npm run db:init" -ForegroundColor White
Write-Host "3. Создайте админа: npm run db:seed" -ForegroundColor White
Write-Host "4. Добавьте проект: npm run db:add-website-project" -ForegroundColor White
Write-Host "5. Запустите dev: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Данные для входа:" -ForegroundColor Cyan
Write-Host "   Логин: skre4karta" -ForegroundColor White
Write-Host "   Пароль: 1234" -ForegroundColor White
Write-Host ""


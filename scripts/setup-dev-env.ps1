# Скрипт для настройки dev окружения на Windows
# Создает .env файл для локальной разработки

Write-Host "🔧 Настройка dev окружения..." -ForegroundColor Cyan

$envFile = ".env"
$envExample = "env.example"

# Проверяем, существует ли .env
if (Test-Path $envFile) {
    Write-Host "⚠️  Файл .env уже существует!" -ForegroundColor Yellow
    $overwrite = Read-Host "Перезаписать? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Отменено." -ForegroundColor Yellow
        exit 0
    }
}

# Копируем env.example
if (Test-Path $envExample) {
    Copy-Item $envExample $envFile -Force
    Write-Host "✅ Скопирован $envExample в $envFile" -ForegroundColor Green
} else {
    Write-Host "❌ Файл $envExample не найден!" -ForegroundColor Red
    exit 1
}

# Настраиваем DATABASE_URL для dev
Write-Host "`n📝 Настройка DATABASE_URL..." -ForegroundColor Cyan
Write-Host "Выберите вариант:" -ForegroundColor Yellow
Write-Host "1) Docker Compose (рекомендуется)"
Write-Host "2) Локальный PostgreSQL"
Write-Host "3) Оставить как есть"

$choice = Read-Host "Ваш выбор (1-3)"

$content = Get-Content $envFile -Raw

switch ($choice) {
    "1" {
        # Docker Compose
        $dbUrl = "postgresql://mywebsite:changeme@localhost:5432/mywebsite?schema=public"
        $content = $content -replace 'DATABASE_URL=".*"', "DATABASE_URL=`"$dbUrl`""
        Write-Host "✅ Настроен DATABASE_URL для Docker Compose" -ForegroundColor Green
        Write-Host "   Запустите: docker-compose up -d postgres" -ForegroundColor Yellow
    }
    "2" {
        # Локальный PostgreSQL
        $user = Read-Host "Имя пользователя PostgreSQL (по умолчанию: postgres)"
        if ([string]::IsNullOrWhiteSpace($user)) { $user = "postgres" }
        
        $password = Read-Host "Пароль PostgreSQL" -AsSecureString
        $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
        )
        
        $db = Read-Host "Имя базы данных (по умолчанию: mywebsite)"
        if ([string]::IsNullOrWhiteSpace($db)) { $db = "mywebsite" }
        
        $dbUrl = "postgresql://$user`:$passwordPlain@localhost:5432/$db?schema=public"
        $content = $content -replace 'DATABASE_URL=".*"', "DATABASE_URL=`"$dbUrl`""
        Write-Host "✅ Настроен DATABASE_URL для локального PostgreSQL" -ForegroundColor Green
    }
    "3" {
        Write-Host "Оставлено как есть" -ForegroundColor Yellow
    }
    default {
        Write-Host "Неверный выбор, оставлено как есть" -ForegroundColor Yellow
    }
}

# Генерируем NEXTAUTH_SECRET если его нет
if ($content -notmatch 'NEXTAUTH_SECRET="[^"]+"' -or $content -match 'NEXTAUTH_SECRET="your-secret') {
    Write-Host "`n🔐 Генерация NEXTAUTH_SECRET..." -ForegroundColor Cyan
    $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $secret = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($secret))
    $content = $content -replace 'NEXTAUTH_SECRET=".*"', "NEXTAUTH_SECRET=`"$secret`""
    Write-Host "✅ Сгенерирован NEXTAUTH_SECRET" -ForegroundColor Green
}

# Настраиваем NODE_ENV для dev
$content = $content -replace 'NODE_ENV="production"', 'NODE_ENV="development"'

# Сохраняем файл
Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "`n✅ Готово! Файл .env создан." -ForegroundColor Green
Write-Host "`n📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Если используете Docker Compose: docker-compose up -d postgres" -ForegroundColor Yellow
Write-Host "2. Примените миграции: npm run migrate:dev" -ForegroundColor Yellow
Write-Host "3. Создайте админа: npm run db:seed" -ForegroundColor Yellow
Write-Host "4. Запустите dev сервер: npm run dev" -ForegroundColor Yellow


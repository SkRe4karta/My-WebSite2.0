#!/bin/bash

# Скрипт для генерации .env файла
# Использование: ./setup-env.sh

set -e

echo "🔧 Настройка переменных окружения..."

# Пароль по умолчанию для релизной версии
DEFAULT_PASSWORD="1234"

# Запрашиваем пароль
echo "Введите пароль для админки (по умолчанию: $DEFAULT_PASSWORD, нажмите Enter для использования):"
read -s ADMIN_PASSWORD

# Если пароль не введён, используем пароль по умолчанию
if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD="$DEFAULT_PASSWORD"
    echo "Используется пароль по умолчанию: $DEFAULT_PASSWORD"
    echo "⚠️  ВАЖНО: После первого входа обязательно смените пароль в настройках админки!"
fi

# Генерация хеша пароля
# Пробуем разные способы генерации хеша
PASSWORD_HASH=""

# Способ 1: Используем Docker контейнер (если доступен)
if command -v docker &> /dev/null; then
    echo "🔐 Генерация хеша пароля через Docker..."
    # Используем простую команду с установкой bcryptjs в контейнере
    PASSWORD_HASH=$(docker run --rm -e PASSWORD="$ADMIN_PASSWORD" node:20-slim sh -c "
        npm install bcryptjs 2>/dev/null && \
        node -e \"const bcrypt = require('bcryptjs'); bcrypt.hashSync(process.env.PASSWORD, 10, (err, hash) => { if (err) process.exit(1); console.log(hash); })\"
    " 2>/dev/null | tail -1 || echo "")
    
    # Если не получилось, пробуем синхронный вариант
    if [ -z "$PASSWORD_HASH" ]; then
        PASSWORD_HASH=$(docker run --rm node:20-slim sh -c "
            npm install bcryptjs 2>/dev/null && \
            node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASSWORD', 10))\"
        " 2>/dev/null | tail -1 || echo "")
    fi
fi

# Способ 2: Используем локальный Node.js (если доступен)
if [ -z "$PASSWORD_HASH" ] && command -v node &> /dev/null; then
    echo "🔐 Генерация хеша пароля через Node.js..."
    # Проверяем, установлен ли bcryptjs
    if node -e "require('bcryptjs')" &> /dev/null; then
        PASSWORD_HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hashSync('$ADMIN_PASSWORD', 10)" 2>/dev/null || echo "")
    else
        # Пробуем установить bcryptjs глобально или использовать npx
        PASSWORD_HASH=$(npx -y bcryptjs-cli hash "$ADMIN_PASSWORD" 2>/dev/null | tail -1 || echo "")
    fi
fi

# Способ 3: Используем Python (если доступен)
if [ -z "$PASSWORD_HASH" ] && command -v python3 &> /dev/null; then
    echo "🔐 Генерация хеша пароля через Python..."
    PASSWORD_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw('$ADMIN_PASSWORD'.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8'))" 2>/dev/null || echo "")
fi

# Если хеш не сгенерирован, предупреждаем
if [ -z "$PASSWORD_HASH" ]; then
    echo ""
    echo "⚠️  Не удалось сгенерировать хеш пароля автоматически."
    echo "   Хеш будет сгенерирован автоматически при установке через Docker."
    echo "   Или выполните вручную:"
    echo "   ./generate-password-hash.sh"
    echo "   И добавьте результат в .env файл"
    PASSWORD_HASH=""
fi

# Генерация секретов
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-me-$(date +%s)")
VAULT_KEY=$(openssl rand -base64 32 2>/dev/null || echo "change-me-$(date +%s)")
STORAGE_SALT=$(openssl rand -base64 16 2>/dev/null || echo "change-me-$(date +%s)")

# Определяем NEXTAUTH_URL
# В продакшене через nginx используем домен, в разработке - localhost
if [ -n "${NEXTAUTH_URL:-}" ]; then
    # Если уже задан, используем его
    NEXT_AUTH_URL_VALUE="$NEXTAUTH_URL"
elif [ "$NODE_ENV" = "production" ] || [ -f "docker-compose.yml" ]; then
    # В продакшене используем домен (можно изменить после настройки SSL)
    NEXT_AUTH_URL_VALUE="http://zelyonkin.ru"
else
    # В разработке используем localhost
    NEXT_AUTH_URL_VALUE="http://localhost:3000"
fi

# Создание .env файла
cat > .env << EOF
# NextAuth Configuration
# NEXTAUTH_URL автоматически определяется, но можно изменить вручную
# После настройки SSL измените на: NEXTAUTH_URL=https://zelyonkin.ru
NEXTAUTH_URL=$NEXT_AUTH_URL_VALUE
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Admin Credentials
ADMIN_USERNAME=skre4karta
ADMIN_EMAIL=zelyonkin.d@gmail.com
ADMIN_PASSWORD_HASH=$PASSWORD_HASH

# Database
DATABASE_URL="file:./database/db.sqlite"

# Vault Encryption
VAULT_ENCRYPTION_KEY=$VAULT_KEY
ENCRYPTED_STORAGE_SALT=$STORAGE_SALT

# Public Admin Username
NEXT_PUBLIC_ADMIN_USERNAME=skre4karta

# Node Environment
NODE_ENV=production
EOF

echo "✅ Файл .env создан!"
echo "📝 Проверьте и при необходимости отредактируйте .env файл"
if [ "$ADMIN_PASSWORD" = "$DEFAULT_PASSWORD" ]; then
    echo ""
    echo "⚠️  ВНИМАНИЕ: Используется пароль по умолчанию '$DEFAULT_PASSWORD'"
    echo "   После первого входа обязательно смените пароль в настройках админки!"
fi


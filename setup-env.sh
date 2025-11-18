#!/bin/bash

# Скрипт для генерации .env файла
# Использование: ./setup-env.sh

set -e

echo "🔧 Настройка переменных окружения..."

# Пароль по умолчанию для релизной версии
DEFAULT_PASSWORD="1234"

# Проверка наличия Node.js для генерации хэша пароля
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js не найден. Установите Node.js для генерации хэша пароля."
    echo "   Или сгенерируйте хэш вручную: node -e \"console.log(require('bcryptjs').hashSync('пароль', 10))\""
    PASSWORD_HASH=""
else
    echo "Введите пароль для админки (по умолчанию: $DEFAULT_PASSWORD, нажмите Enter для использования):"
    read -s ADMIN_PASSWORD
    
    # Если пароль не введён, используем пароль по умолчанию
    if [ -z "$ADMIN_PASSWORD" ]; then
        ADMIN_PASSWORD="$DEFAULT_PASSWORD"
        echo "Используется пароль по умолчанию: $DEFAULT_PASSWORD"
        echo "⚠️  ВАЖНО: После первого входа обязательно смените пароль в настройках админки!"
    fi
    
    PASSWORD_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASSWORD', 10))" 2>/dev/null || echo "")
fi

# Генерация секретов
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-me-$(date +%s)")
VAULT_KEY=$(openssl rand -base64 32 2>/dev/null || echo "change-me-$(date +%s)")
STORAGE_SALT=$(openssl rand -base64 16 2>/dev/null || echo "change-me-$(date +%s)")

# Создание .env файла
cat > .env << EOF
# NextAuth Configuration
NEXTAUTH_URL=https://zelyonkin.ru
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


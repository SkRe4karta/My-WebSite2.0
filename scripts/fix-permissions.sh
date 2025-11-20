#!/bin/bash

# Скрипт для исправления прав доступа к файлам
# Использование: ./scripts/fix-permissions.sh

set -e

echo "🔧 Исправление прав доступа..."

# Права для storage директорий
echo "📁 Настройка прав для storage..."
sudo chown -R $USER:$USER storage/
chmod -R 755 storage/
chmod -R 755 storage/uploads/
chmod -R 700 storage/vault/
chmod -R 755 storage/backups/

# Права для prisma
echo "📦 Настройка прав для Prisma..."
chmod -R 755 prisma/
chmod -R 644 prisma/schema.prisma

# Права для скриптов
echo "📜 Настройка прав для скриптов..."
chmod +x scripts/*.sh
chmod +x scripts/*.js

# Права для .env
if [ -f ".env" ]; then
    chmod 600 .env
    echo "✅ Права для .env установлены (600)"
fi

echo "✅ Права доступа исправлены"


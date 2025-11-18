#!/bin/bash

# Скрипт для создания резервной копии проекта
# Использование: ./backup.sh

set -e

BACKUP_DIR="$HOME/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="portfolio_backup_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "💾 Создание резервной копии..."
echo ""

# Создание директории для бэкапов
mkdir -p "$BACKUP_DIR"

# Создание временной директории для бэкапа
mkdir -p "$BACKUP_PATH"

# Копирование базы данных
echo "📦 Копирование базы данных..."
if [ -d "database" ]; then
    cp -r database "$BACKUP_PATH/" 2>/dev/null || true
fi

# Копирование storage
echo "📦 Копирование файлов storage..."
if [ -d "storage" ]; then
    cp -r storage "$BACKUP_PATH/" 2>/dev/null || true
fi

# Копирование .env файла
echo "📦 Копирование .env файла..."
if [ -f ".env" ]; then
    cp .env "$BACKUP_PATH/" 2>/dev/null || true
fi

# Создание архива
echo "📦 Создание архива..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

echo ""
echo "✅ Резервная копия создана: $BACKUP_PATH.tar.gz"
echo ""

# Удаление старых бэкапов (старше 7 дней)
echo "🧹 Очистка старых бэкапов (старше 7 дней)..."
find "$BACKUP_DIR" -name "portfolio_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "✅ Готово!"


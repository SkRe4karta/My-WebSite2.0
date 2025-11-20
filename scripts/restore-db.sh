#!/bin/bash

# Скрипт для восстановления базы данных из бэкапа
# Использование: ./scripts/restore-db.sh <backup-file>

set -e

if [ -z "$1" ]; then
    echo "❌ Укажите файл бэкапа"
    echo "Использование: ./scripts/restore-db.sh <backup-file>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл бэкапа не найден: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ВНИМАНИЕ: Это действие перезапишет текущую базу данных!"
read -p "Вы уверены? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Отменено"
    exit 1
fi

echo "🔄 Восстановление базы данных из $BACKUP_FILE..."

# Распаковываем если нужно
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "📦 Распаковка бэкапа..."
    gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U mywebsite mywebsite
else
    docker-compose exec -T postgres psql -U mywebsite mywebsite < $BACKUP_FILE
fi

echo "✅ База данных восстановлена"


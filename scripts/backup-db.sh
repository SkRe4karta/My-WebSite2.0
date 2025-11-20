#!/bin/bash

# Скрипт для создания бэкапа базы данных
# Использование: ./scripts/backup-db.sh

set -e

BACKUP_DIR="/opt/mywebsite/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mywebsite_$TIMESTAMP.sql"

echo "💾 Создание бэкапа базы данных..."

# Создаем директорию для бэкапов
mkdir -p $BACKUP_DIR

# Создаем бэкап
docker-compose exec -T postgres pg_dump -U mywebsite mywebsite > $BACKUP_FILE

# Сжимаем бэкап
gzip $BACKUP_FILE
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Бэкап создан: $BACKUP_FILE"

# Удаляем старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "mywebsite_*.sql.gz" -mtime +30 -delete

echo "🧹 Старые бэкапы удалены"


#!/bin/bash

# Скрипт для тестирования подключений
# Использование: ./scripts/test-connection.sh

set -e

echo "🔍 Тестирование подключений..."

# Тест подключения к PostgreSQL
echo "📊 Тест подключения к PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U mywebsite > /dev/null 2>&1; then
    echo "✅ PostgreSQL доступен"
else
    echo "❌ PostgreSQL недоступен"
    exit 1
fi

# Тест подключения к приложению
echo "🌐 Тест подключения к приложению..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Приложение доступно"
    curl -s http://localhost:3000/api/health | jq '.' || echo "Health check ответ получен"
else
    echo "❌ Приложение недоступно"
    exit 1
fi

# Тест подключения через Nginx (если настроен)
echo "🌐 Тест подключения через Nginx..."
if curl -f -k https://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Nginx проксирует запросы корректно"
else
    echo "⚠️  Nginx не настроен или недоступен"
fi

# Тест подключения к базе данных из приложения
echo "🔗 Тест подключения к БД из приложения..."
DB_TEST=$(docker-compose exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => {
    console.log('OK');
    process.exit(0);
}).catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
});
" 2>&1)

if echo "$DB_TEST" | grep -q "OK"; then
    echo "✅ Приложение может подключиться к БД"
else
    echo "❌ Ошибка подключения к БД: $DB_TEST"
    exit 1
fi

echo ""
echo "✅ Все тесты пройдены успешно!"


#!/bin/bash

# Скрипт для мониторинга приложения
# Использование: ./scripts/monitor.sh

echo "📊 Мониторинг приложения My-WebSite2.0"
echo "========================================"
echo ""

# Статус контейнеров
echo "🐳 Статус Docker контейнеров:"
docker-compose ps
echo ""

# Использование ресурсов
echo "💻 Использование ресурсов:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

# Health check
echo "🏥 Health Check:"
curl -s http://localhost:3000/api/health | jq '.' || echo "Ошибка при проверке health"
echo ""

# Логи (последние 20 строк)
echo "📝 Последние логи приложения:"
docker-compose logs --tail=20 app
echo ""

# Размер базы данных
echo "💾 Размер базы данных:"
docker-compose exec -T postgres psql -U mywebsite -d mywebsite -c "SELECT pg_size_pretty(pg_database_size('mywebsite'));" 2>/dev/null || echo "Не удалось получить размер БД"
echo ""

# Количество записей
echo "📊 Статистика базы данных:"
docker-compose exec -T postgres psql -U mywebsite -d mywebsite -c "
SELECT 
    'Users' as table_name, COUNT(*) as count FROM \"User\"
UNION ALL
SELECT 'Notes', COUNT(*) FROM \"Note\"
UNION ALL
SELECT 'Files', COUNT(*) FROM \"FileEntry\"
UNION ALL
SELECT 'Vault Items', COUNT(*) FROM \"VaultItem\"
UNION ALL
SELECT 'Ideas', COUNT(*) FROM \"IdeaEntry\";
" 2>/dev/null || echo "Не удалось получить статистику"
echo ""

echo "✅ Мониторинг завершен"


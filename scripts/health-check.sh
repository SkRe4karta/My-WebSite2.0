#!/bin/bash

# Скрипт для проверки здоровья приложения
# Использование: ./scripts/health-check.sh

set -e

echo "🏥 Проверка здоровья приложения..."

# Проверка через локальный порт
LOCAL_HEALTH=$(curl -s http://localhost:3000/api/health || echo "failed")
if [ "$LOCAL_HEALTH" != "failed" ]; then
    echo "✅ Локальный health check: OK"
    echo "$LOCAL_HEALTH" | jq '.' 2>/dev/null || echo "$LOCAL_HEALTH"
else
    echo "❌ Локальный health check: FAILED"
fi

# Проверка через Nginx (если настроен)
if command -v nginx &> /dev/null; then
    NGINX_HEALTH=$(curl -s -k https://localhost/api/health 2>/dev/null || echo "failed")
    if [ "$NGINX_HEALTH" != "failed" ]; then
        echo "✅ Nginx health check: OK"
    else
        echo "⚠️  Nginx health check: недоступен"
    fi
fi

# Проверка внешнего доступа
EXTERNAL_HEALTH=$(curl -s https://zelyonkin.ru/api/health 2>/dev/null || echo "failed")
if [ "$EXTERNAL_HEALTH" != "failed" ]; then
    echo "✅ Внешний health check: OK"
else
    echo "⚠️  Внешний health check: недоступен"
fi


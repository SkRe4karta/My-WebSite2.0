#!/bin/bash
# Скрипт для тестирования подключения Nginx к контейнеру web

set -e

echo "🔍 Тестирование подключения Nginx к контейнеру web..."
echo ""

# Определяем команду docker compose
if command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose не найден!"
    exit 1
fi

# Функция для выполнения docker compose команд
run_compose() {
    if [ "$COMPOSE_CMD" = "docker compose" ]; then
        docker compose "$@"
    else
        docker-compose "$@"
    fi
}

# Проверка статуса контейнеров
echo "📋 Статус контейнеров:"
run_compose ps
echo ""

# Проверка, запущен ли контейнер web
if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
    echo "❌ Контейнер web не запущен!"
    echo "   Запустите: docker-compose up -d web"
    exit 1
fi

# Проверка, запущен ли контейнер nginx
if ! run_compose ps nginx 2>/dev/null | grep -q "Up"; then
    echo "❌ Контейнер nginx не запущен!"
    echo "   Запустите: docker-compose up -d nginx"
    exit 1
fi

echo "✅ Оба контейнера запущены"
echo ""

# Проверка доступности web:3000 из nginx контейнера
echo "🔍 Проверка доступности web:3000 из nginx контейнера:"
if run_compose exec -T nginx wget -O- --timeout=10 http://web:3000/api/health 2>&1 | grep -q "healthy\|200"; then
    echo "   ✅ web:3000 доступен из nginx"
else
    echo "   ❌ web:3000 НЕ доступен из nginx"
    echo "   Проверьте логи: docker-compose logs web"
fi
echo ""

# Проверка DNS резолвинга
echo "🔍 Проверка DNS резолвинга 'web' из nginx контейнера:"
if run_compose exec -T nginx getent hosts web 2>/dev/null | grep -q "web"; then
    echo "   ✅ DNS резолвинг работает"
    run_compose exec -T nginx getent hosts web
else
    echo "   ❌ DNS резолвинг не работает"
fi
echo ""

# Проверка порта 3000 в web контейнере
echo "🔍 Проверка порта 3000 в web контейнере:"
if run_compose exec -T web netstat -tlnp 2>/dev/null | grep -q ":3000" || \
   run_compose exec -T web ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "   ✅ Порт 3000 слушается"
else
    echo "   ❌ Порт 3000 не слушается"
    echo "   Проверьте логи: docker-compose logs web"
fi
echo ""

# Проверка healthcheck
echo "🔍 Проверка healthcheck web контейнера:"
if run_compose exec -T web node -e "require('http').get('http://localhost:3000/api/health', (r) => {console.log('Status:', r.statusCode); process.exit(r.statusCode === 200 ? 0 : 1)})" 2>&1 | grep -q "Status: 200"; then
    echo "   ✅ Healthcheck прошел"
else
    echo "   ❌ Healthcheck не прошел"
fi
echo ""

# Тест статических файлов
echo "🔍 Тест загрузки статических файлов:"
echo "   Тестируем /_next/static/..."
if run_compose exec -T nginx wget -O- --timeout=10 --spider http://web:3000/_next/static/ 2>&1 | grep -q "200\|connected"; then
    echo "   ✅ /_next/static/ доступен"
else
    echo "   ❌ /_next/static/ недоступен"
fi
echo ""

# Проверка сети Docker
echo "🔍 Проверка сети Docker:"
if docker network inspect portfolio_network 2>/dev/null | grep -q "web\|nginx"; then
    echo "   ✅ Оба контейнера в сети portfolio_network"
    docker network inspect portfolio_network 2>/dev/null | grep -A 2 "Containers" | head -10
else
    echo "   ❌ Проблема с сетью Docker"
fi
echo ""

echo "✅ Диагностика завершена"
echo ""
echo "💡 Если проблемы сохраняются:"
echo "   1. Проверьте логи: docker-compose logs web"
echo "   2. Проверьте логи: docker-compose logs nginx"
echo "   3. Перезапустите контейнеры: docker-compose restart"
echo "   4. Проверьте синтаксис nginx: docker-compose exec nginx nginx -t"


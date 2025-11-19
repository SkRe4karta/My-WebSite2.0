#!/bin/bash
# Скрипт для диагностики проблем с nginx

set -e

echo "🔍 Диагностика Nginx..."
echo ""

# Определяем команду docker compose
if command -v docker compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
    USE_COMPOSE_V2=true
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    USE_COMPOSE_V2=false
else
    echo "❌ Docker Compose не найден"
    exit 1
fi

# Функция для выполнения docker compose команд (подавляет предупреждения о переменных)
run_compose() {
    if [ "$USE_COMPOSE_V2" = true ]; then
        docker compose "$@" 2>&1 | grep -v "WARN.*variable is not set" || true
    else
        docker-compose "$@" 2>&1 | grep -v "WARN.*variable is not set" || true
    fi
}

# Проверка статуса контейнера
echo "1️⃣ Статус контейнера nginx:"
run_compose ps nginx 2>/dev/null || echo "❌ Контейнер nginx не найден"
echo ""

# Проверка синтаксиса конфигурации
echo "2️⃣ Проверка синтаксиса nginx.conf:"
if run_compose exec -T nginx nginx -t 2>&1 | grep -v "WARN.*variable is not set" | grep -q "syntax is ok\|test is successful"; then
    echo "✅ Синтаксис корректен"
else
    # Проверяем, запущен ли контейнер
    if ! run_compose ps nginx 2>/dev/null | grep -q "Up"; then
        echo "⚠️  Контейнер nginx не запущен (это нормально, если он еще не был запущен)"
    else
        echo "❌ Ошибка синтаксиса!"
        run_compose exec -T nginx nginx -t 2>&1 | grep -v "WARN.*variable is not set" | tail -5
    fi
fi
echo ""

# Проверка логов
echo "3️⃣ Последние 20 строк логов nginx:"
run_compose logs nginx --tail=20 2>/dev/null | grep -v "WARN.*variable is not set" || echo "❌ Не удалось получить логи"
echo ""

# Проверка доступности web контейнера
echo "4️⃣ Проверка доступности web:3000:"
if run_compose ps nginx 2>/dev/null | grep -q "Up"; then
    if run_compose exec -T nginx wget -O- --timeout=5 --spider http://web:3000/api/health 2>&1 | grep -q "200\|connected"; then
        echo "✅ web:3000 доступен"
    else
        echo "❌ web:3000 недоступен"
    fi
else
    echo "⚠️  Контейнер nginx не запущен, пропускаем проверку доступности web"
fi
echo ""

# Проверка SSL сертификатов
echo "5️⃣ Проверка SSL сертификатов:"
if [ -f "certbot/live/zelyonkin.ru/fullchain.pem" ]; then
    echo "✅ SSL сертификаты найдены"
    echo "   Размер: $(stat -c%s certbot/live/zelyonkin.ru/fullchain.pem 2>/dev/null || stat -f%z certbot/live/zelyonkin.ru/fullchain.pem 2>/dev/null || echo 'unknown') байт"
else
    echo "⚠️  SSL сертификаты не найдены (это нормально, если SSL еще не настроен)"
fi
echo ""

# Проверка портов
echo "6️⃣ Проверка портов:"
if netstat -tlnp 2>/dev/null | grep -q ":80\|:443"; then
    echo "✅ Порты 80/443 открыты"
    netstat -tlnp 2>/dev/null | grep -E ":80|:443" | head -2
elif ss -tlnp 2>/dev/null | grep -q ":80\|:443"; then
    echo "✅ Порты 80/443 открыты"
    ss -tlnp 2>/dev/null | grep -E ":80|:443" | head -2
else
    echo "⚠️  Порты 80/443 не найдены (возможно, nginx не запущен)"
fi
echo ""

echo "✅ Диагностика завершена"

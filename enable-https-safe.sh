#!/bin/bash
# Скрипт для безопасной активации HTTPS в nginx.conf
# Проверяет наличие сертификатов перед активацией

set -e

NGINX_CONF="nginx.conf"
DOMAIN="zelyonkin.ru"

echo "🔐 Безопасная активация HTTPS блока в nginx.conf..."
echo ""

# Проверяем наличие SSL сертификатов
if [ ! -f "certbot/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ ОШИБКА: SSL сертификаты не найдены!"
    echo "   Сертификат должен быть в: certbot/live/$DOMAIN/fullchain.pem"
    echo ""
    echo "   Сначала получите сертификаты:"
    echo "   ./setup-ssl.sh"
    exit 1
fi

if [ ! -f "certbot/live/$DOMAIN/privkey.pem" ]; then
    echo "❌ ОШИБКА: Приватный ключ SSL не найден!"
    echo "   Ключ должен быть в: certbot/live/$DOMAIN/privkey.pem"
    exit 1
fi

echo "✅ SSL сертификаты найдены:"
echo "   - Сертификат: certbot/live/$DOMAIN/fullchain.pem"
echo "   - Приватный ключ: certbot/live/$DOMAIN/privkey.pem"
echo ""

# Раскомментируем HTTPS блок
echo "📝 Раскомментирование HTTPS блока в nginx.conf..."

# Находим строки с закомментированным HTTPS блоком и раскомментируем их
# Ищем строки от "# server {" до "# }" которые содержат "listen 443"
if grep -q "^[[:space:]]*#[[:space:]]*server {" "$NGINX_CONF" && grep -q "#[[:space:]]*listen[[:space:]]*443" "$NGINX_CONF"; then
    # Раскомментируем HTTPS блок (строки от "# server {" до "# }")
    # Используем sed для раскомментирования всех строк между этими маркерами
    sed -i '/^[[:space:]]*#[[:space:]]*server {/,/^[[:space:]]*#[[:space:]]*}/s/^\([[:space:]]*\)#\([[:space:]]*\)/\1\2/' "$NGINX_CONF" 2>/dev/null || {
        echo "⚠️  Не удалось автоматически раскомментировать HTTPS блок"
        echo "   Раскомментируйте вручную строки с HTTPS server блоком в nginx.conf"
        echo "   Или используйте готовый блок из nginx-https-block.conf"
    }
fi

# Проверяем, что HTTPS блок теперь активен
if grep -q "^[[:space:]]*listen[[:space:]]*443[[:space:]]*ssl" "$NGINX_CONF"; then
    echo "✅ HTTPS блок активен в nginx.conf"
    echo ""
    echo "🔍 Проверка синтаксиса nginx.conf..."
    
    # Определяем команду docker compose
    if command -v docker compose &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "⚠️  Docker Compose не найден, пропускаем проверку синтаксиса"
        exit 0
    fi
    
    # Проверяем синтаксис
    if $COMPOSE_CMD exec -T nginx nginx -t 2>&1 | grep -v "WARN.*variable is not set" | grep -q "syntax is ok\|test is successful"; then
        echo "✅ Синтаксис nginx.conf корректен"
        echo ""
        echo "🔄 Перезапуск nginx для применения изменений..."
        $COMPOSE_CMD restart nginx 2>&1 | grep -v "WARN.*variable is not set" || true
        echo ""
        echo "✅ HTTPS активирован и nginx перезапущен!"
        echo ""
        echo "🌐 Сайт теперь доступен по адресу: https://$DOMAIN"
    else
        echo "❌ Ошибка синтаксиса nginx.conf!"
        echo "   Проверьте конфигурацию вручную:"
        echo "   $COMPOSE_CMD exec nginx nginx -t"
        exit 1
    fi
else
    echo "⚠️  HTTPS блок не найден в nginx.conf"
    echo "   Убедитесь, что в nginx.conf есть server блок с listen 443 ssl"
    echo ""
    echo "   Если блок закомментирован, раскомментируйте его вручную"
    exit 1
fi


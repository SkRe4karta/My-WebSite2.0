#!/bin/bash

# Скрипт для получения SSL сертификата через Let's Encrypt
# Использование: ./setup-ssl.sh

set -e

DOMAIN="zelyonkin.ru"
EMAIL="zelyonkin.d@gmail.com"

echo "🔒 Настройка SSL сертификата для $DOMAIN"
echo ""

# Проверка, что web контейнер запущен
if ! docker-compose ps | grep -q "portfolio_web.*Up"; then
    echo "❌ Web контейнер не запущен!"
    echo "   Сначала запустите: ./deploy.sh"
    exit 1
fi

# Проверка, что nginx.conf не содержит активный HTTPS блок
if grep -q "^[[:space:]]*listen[[:space:]]*443[[:space:]]*ssl" nginx.conf 2>/dev/null; then
    echo "⚠️  ВНИМАНИЕ: В nginx.conf найден активный HTTPS блок!"
    echo "   Nginx должен работать на HTTP (порт 80) для получения сертификата."
    echo "   Убедитесь, что HTTPS блок закомментирован в nginx.conf"
    echo ""
    read -p "Продолжить? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Остановка nginx для получения сертификата
echo "🛑 Временная остановка Nginx..."
docker-compose stop nginx

# Получение сертификата
echo "📜 Получение SSL сертификата от Let's Encrypt..."
docker-compose run --rm --entrypoint "" certbot sh -c "certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive"

# Запуск nginx обратно
echo "▶️  Запуск Nginx..."
docker-compose up -d nginx

# Проверка сертификата
if [ -f "certbot/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "✅ SSL сертификат успешно получен!"
    echo ""
    echo "📋 Информация:"
    echo "   - Сертификат: certbot/live/$DOMAIN/fullchain.pem"
    echo "   - Приватный ключ: certbot/live/$DOMAIN/privkey.pem"
    echo ""
    echo "🔄 Перезапуск Nginx для применения сертификата..."
    docker-compose restart nginx
    echo ""
    echo "✅ SSL настроен! Сайт доступен по адресу: https://$DOMAIN"
    echo ""
    echo "ℹ️  Сертификат будет автоматически обновляться каждые 12 часов"
else
    echo "❌ Ошибка при получении сертификата!"
    echo "   Проверьте:"
    echo "   - Домен $DOMAIN указывает на IP этого сервера"
    echo "   - Порты 80 и 443 открыты в файрволе"
    exit 1
fi


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

# Проверка, что nginx запущен
if ! docker-compose ps | grep -q "portfolio_nginx.*Up"; then
    echo "⚠️  Nginx не запущен. Запускаем..."
    docker-compose up -d nginx
    sleep 5
fi

# Проверка, что директория для webroot существует
if [ ! -d "certbot/www" ]; then
    echo "📁 Создание директории для webroot..."
    mkdir -p certbot/www
    chmod 755 certbot/www
fi

# Проверка, что nginx.conf правильно настроен для acme-challenge
if ! grep -q "location /.well-known/acme-challenge/" nginx.conf; then
    echo "⚠️  ВНИМАНИЕ: В nginx.conf не найден location для /.well-known/acme-challenge/"
    echo "   Убедитесь, что nginx.conf содержит:"
    echo "   location /.well-known/acme-challenge/ {"
    echo "     root /var/www/certbot;"
    echo "   }"
    echo ""
    read -p "Продолжить? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Проверка доступности порта 80
echo "🔍 Проверка доступности порта 80..."
if ! curl -sf http://localhost/.well-known/acme-challenge/test &> /dev/null; then
    echo "⚠️  Порт 80 может быть недоступен. Проверьте:"
    echo "   - Nginx запущен: docker-compose ps nginx"
    echo "   - Порты открыты: sudo ufw status"
fi

# Получение сертификата через webroot (не требует остановки nginx)
echo "📜 Получение SSL сертификата от Let's Encrypt (webroot метод)..."
echo "   Это не требует остановки Nginx"
echo ""

# Пробуем несколько раз, так как Let's Encrypt может иметь rate limits
MAX_ATTEMPTS=3
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ] && [ "$SUCCESS" = false ]; do
    echo "   Попытка $ATTEMPT из $MAX_ATTEMPTS..."
    
    # Проверяем, существует ли уже сертификат
    FORCE_RENEWAL=""
    if [ -f "certbot/live/$DOMAIN/fullchain.pem" ]; then
        FORCE_RENEWAL="--force-renewal"
        echo "   (Обновление существующего сертификата)"
    fi
    
    local certbot_output=$(docker-compose run --rm --entrypoint "" certbot sh -c "certbot certonly \
        --webroot \
        --webroot-path /var/www/certbot \
        --preferred-challenges http \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --non-interactive \
        $FORCE_RENEWAL" 2>&1)
    
    local certbot_exit_code=$?
    
    # Проверяем успешность по выводу и коду выхода
    if echo "$certbot_output" | grep -q "Successfully received certificate\|Certificate is saved at\|Your certificate and chain have been saved" || [ "$certbot_exit_code" -eq 0 ]; then
        SUCCESS=true
        echo "   ✅ Сертификат получен успешно!"
        # Выводим важную информацию из вывода
        if echo "$certbot_output" | grep -q "Certificate is saved at"; then
            echo "$certbot_output" | grep "Certificate is saved at\|Key is saved at\|This certificate expires on" | head -3
        fi
    else
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo "   ⚠️  Попытка $ATTEMPT не удалась, ждем 10 секунд..."
            echo "   Вывод: $(echo "$certbot_output" | tail -3 | tr '\n' ' ')"
            sleep 10
        else
            echo "   ❌ Все попытки не удались"
            echo "   Последний вывод: $(echo "$certbot_output" | tail -5 | tr '\n' ' ')"
        fi
    fi
    ATTEMPT=$((ATTEMPT + 1))
done

# Небольшая задержка для гарантии записи файла
if [ "$SUCCESS" = true ]; then
    sleep 2
fi

# Проверка сертификата
if [ "$SUCCESS" = true ] && [ -f "certbot/live/$DOMAIN/fullchain.pem" ]; then
    echo ""
    echo "✅ SSL сертификат успешно получен!"
    echo ""
    echo "📋 Информация:"
    echo "   - Сертификат: certbot/live/$DOMAIN/fullchain.pem"
    echo "   - Приватный ключ: certbot/live/$DOMAIN/privkey.pem"
    echo ""
    echo "⚠️  ВАЖНО: Теперь нужно настроить HTTPS в nginx.conf"
    echo "   1. Раскомментируйте HTTPS server блок в nginx.conf"
    echo "   2. Перезапустите nginx: docker-compose restart nginx"
    echo ""
    echo "📝 Пример HTTPS блока для nginx.conf:"
    echo "   server {"
    echo "     listen 443 ssl http2;"
    echo "     server_name $DOMAIN www.$DOMAIN;"
    echo "     ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;"
    echo "     ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
    echo "     # ... остальная конфигурация"
    echo "   }"
    echo ""
    echo "ℹ️  Сертификат будет автоматически обновляться каждые 12 часов"
    echo ""
    echo "✅ После настройки HTTPS сайт будет доступен по адресу: https://$DOMAIN"
else
    echo ""
    echo "❌ Ошибка при получении сертификата!"
    echo ""
    echo "🔍 Диагностика:"
    echo "   1. Проверьте, что домен $DOMAIN указывает на IP этого сервера:"
    echo "      nslookup $DOMAIN"
    echo ""
    echo "   2. Проверьте, что порты 80 и 443 открыты:"
    echo "      sudo ufw status"
    echo ""
    echo "   3. Проверьте, что nginx работает и доступен:"
    echo "      curl http://$DOMAIN/.well-known/acme-challenge/test"
    echo ""
    echo "   4. Проверьте логи certbot:"
    echo "      docker-compose logs certbot"
    echo ""
    echo "   5. Проверьте, что директория certbot/www существует:"
    echo "      ls -la certbot/www/"
    echo ""
    exit 1
fi


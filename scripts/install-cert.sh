#!/bin/bash

# Скрипт для установки SSL сертификата из предоставленных файлов
# Использование: ./scripts/install-cert.sh

set -e

SSL_DIR="/etc/nginx/ssl"
CERT_FILE="$SSL_DIR/zelyonkin.ru.crt"
KEY_FILE="$SSL_DIR/zelyonkin.ru.key"
CHAIN_FILE="$SSL_DIR/zelyonkin.ru.chain.crt"

echo "🔐 Установка SSL сертификата для zelyonkin.ru..."

# Создаем директорию для сертификатов
sudo mkdir -p $SSL_DIR

# Проверяем наличие сертификата в корне проекта
if [ -f "certificate.crt" ]; then
    echo "📋 Найден файл certificate.crt"
    sudo cp certificate.crt $CERT_FILE
    sudo chmod 644 $CERT_FILE
    sudo chown root:root $CERT_FILE
    echo "✅ Сертификат скопирован в $CERT_FILE"
else
    echo "⚠️  Файл certificate.crt не найден в корне проекта"
    echo "Пожалуйста, поместите сертификат в корень проекта как certificate.crt"
    exit 1
fi

# Проверяем наличие приватного ключа
if [ -f "certificate.key" ]; then
    echo "🔑 Найден файл certificate.key"
    sudo cp certificate.key $KEY_FILE
    sudo chmod 600 $KEY_FILE
    sudo chown root:root $KEY_FILE
    echo "✅ Приватный ключ скопирован в $KEY_FILE"
else
    echo "⚠️  Файл certificate.key не найден"
    echo "Пожалуйста, поместите приватный ключ в корень проекта как certificate.key"
    exit 1
fi

# Если есть цепочка сертификатов
if [ -f "certificate.chain.crt" ]; then
    echo "🔗 Найдена цепочка сертификатов"
    sudo cp certificate.chain.crt $CHAIN_FILE
    sudo chmod 644 $CHAIN_FILE
    sudo chown root:root $CHAIN_FILE
    echo "✅ Цепочка сертификатов скопирована"
fi

# Проверяем сертификат
echo "🔍 Проверка сертификата..."
sudo openssl x509 -in $CERT_FILE -text -noout | grep -E "Subject:|Issuer:|Not Before|Not After"

echo ""
echo "✅ SSL сертификат установлен успешно!"
echo "📍 Сертификат: $CERT_FILE"
echo "📍 Ключ: $KEY_FILE"
echo ""
echo "📝 Следующий шаг:"
echo "1. Обновите nginx.conf если нужно указать цепочку сертификатов"
echo "2. Проверьте конфигурацию: sudo nginx -t"
echo "3. Перезагрузите Nginx: sudo systemctl reload nginx"


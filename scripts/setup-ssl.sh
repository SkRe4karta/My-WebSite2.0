#!/bin/bash

# Скрипт для установки SSL сертификата на сервере
# Использование: ./scripts/setup-ssl.sh

set -e

SSL_DIR="/etc/nginx/ssl"
CERT_FILE="$SSL_DIR/zelyonkin.ru.crt"
KEY_FILE="$SSL_DIR/zelyonkin.ru.key"

echo "🔐 Настройка SSL сертификата..."

# Создаем директорию для сертификатов
sudo mkdir -p $SSL_DIR

# Копируем сертификат и ключ
# ВАЖНО: Замените пути на реальные пути к вашим файлам
if [ -f "certificate.crt" ] && [ -f "certificate.key" ]; then
    echo "📋 Копирование сертификата..."
    sudo cp certificate.crt $CERT_FILE
    sudo cp certificate.key $KEY_FILE
    
    # Устанавливаем правильные права доступа
    sudo chmod 600 $KEY_FILE
    sudo chmod 644 $CERT_FILE
    sudo chown root:root $CERT_FILE $KEY_FILE
    
    echo "✅ SSL сертификат установлен успешно!"
    echo "📍 Сертификат: $CERT_FILE"
    echo "📍 Ключ: $KEY_FILE"
else
    echo "⚠️  Файлы сертификата не найдены!"
    echo "Пожалуйста, поместите certificate.crt и certificate.key в корень проекта"
    exit 1
fi

# Проверяем конфигурацию Nginx
echo "🔍 Проверка конфигурации Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Конфигурация Nginx корректна"
    echo "🔄 Перезагрузка Nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен"
else
    echo "❌ Ошибка в конфигурации Nginx"
    exit 1
fi


#!/bin/bash

# Скрипт для проверки всех зависимостей перед развертыванием
# Использование: ./scripts/check-dependencies.sh

set -e

echo "🔍 Проверка зависимостей..."

ERRORS=0

# Проверка Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker установлен: $(docker --version)"
else
    echo "❌ Docker не установлен"
    ERRORS=$((ERRORS + 1))
fi

# Проверка Docker Compose
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose установлен: $(docker-compose --version)"
else
    echo "❌ Docker Compose не установлен"
    ERRORS=$((ERRORS + 1))
fi

# Проверка Nginx
if command -v nginx &> /dev/null; then
    echo "✅ Nginx установлен: $(nginx -v 2>&1)"
else
    echo "❌ Nginx не установлен"
    ERRORS=$((ERRORS + 1))
fi

# Проверка .env файла
if [ -f ".env" ]; then
    echo "✅ Файл .env найден"
    
    # Проверка обязательных переменных
    source .env
    
    REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET" "ADMIN_PASSWORD")
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Переменная $var не установлена в .env"
            ERRORS=$((ERRORS + 1))
        else
            echo "✅ Переменная $var установлена"
        fi
    done
else
    echo "❌ Файл .env не найден"
    ERRORS=$((ERRORS + 1))
fi

# Проверка SSL сертификата
if [ -f "/etc/nginx/ssl/zelyonkin.ru.crt" ] && [ -f "/etc/nginx/ssl/zelyonkin.ru.key" ]; then
    echo "✅ SSL сертификат установлен"
else
    echo "⚠️  SSL сертификат не найден в /etc/nginx/ssl/"
    echo "   Запустите: ./scripts/install-cert.sh"
fi

# Проверка конфигурации Nginx
if [ -f "/etc/nginx/sites-available/zelyonkin.ru" ]; then
    echo "✅ Конфигурация Nginx найдена"
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "✅ Конфигурация Nginx корректна"
    else
        echo "❌ Ошибка в конфигурации Nginx"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "⚠️  Конфигурация Nginx не найдена"
    echo "   Скопируйте nginx.conf в /etc/nginx/sites-available/zelyonkin.ru"
fi

# Итог
echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ Все проверки пройдены! Готово к развертыванию."
    exit 0
else
    echo "❌ Найдено $ERRORS ошибок. Исправьте их перед развертыванием."
    exit 1
fi


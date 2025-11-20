#!/bin/bash

# Скрипт для просмотра логов
# Использование: ./scripts/logs.sh [service]

SERVICE=${1:-app}

echo "📝 Логи сервиса: $SERVICE"
echo "Нажмите Ctrl+C для выхода"
echo ""

case $SERVICE in
    app)
        docker-compose logs -f app
        ;;
    postgres)
        docker-compose logs -f postgres
        ;;
    nginx)
        sudo tail -f /var/log/nginx/zelyonkin.ru.access.log /var/log/nginx/zelyonkin.ru.error.log
        ;;
    all)
        docker-compose logs -f
        ;;
    *)
        echo "Доступные сервисы: app, postgres, nginx, all"
        exit 1
        ;;
esac


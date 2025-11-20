#!/bin/bash

# Скрипт для развертывания приложения на Ubuntu 22.04
# Использование: ./scripts/deploy.sh

set -e

PROJECT_DIR="/opt/mywebsite"
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Начало развертывания..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Запустите сначала setup-server.sh"
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Запустите сначала setup-server.sh"
    exit 1
fi

# Переходим в директорию проекта
cd $PROJECT_DIR || {
    echo "❌ Директория проекта не найдена: $PROJECT_DIR"
    exit 1
}

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден. Создайте его на основе env.example"
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Остановка существующих контейнеров..."
docker-compose -f $COMPOSE_FILE down || true

# Очищаем старые образы (опционально)
read -p "Очистить старые Docker образы? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Очистка старых образов..."
    docker system prune -f
fi

# Собираем новые образы
if [ "$SKIP_BUILD" = false ]; then
    echo "🔨 Сборка Docker образов..."
    docker-compose -f $COMPOSE_FILE build --no-cache
else
    echo "⏭️  Пропуск сборки (используется --no-build)"
fi

# Запускаем контейнеры
echo "🚀 Запуск контейнеров..."
docker-compose -f $COMPOSE_FILE up -d

# Ждем готовности PostgreSQL
echo "⏳ Ожидание готовности PostgreSQL..."
timeout=60
counter=0
until docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U mywebsite > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ PostgreSQL не запустился за $timeout секунд"
        exit 1
    fi
done
echo "✅ PostgreSQL готов"

# Применяем миграции
echo "📦 Применение миграций базы данных..."
docker-compose -f $COMPOSE_FILE exec -T app npx prisma migrate deploy || {
    echo "⚠️  Ошибка при применении миграций. Пытаемся инициализировать БД..."
    docker-compose -f $COMPOSE_FILE exec -T app node scripts/init-db.js
}

# Инициализируем базу данных
echo "🔧 Инициализация базы данных..."
docker-compose -f $COMPOSE_FILE exec -T app node scripts/init-db.js || true

# Проверяем здоровье приложения
echo "🏥 Проверка здоровья приложения..."
sleep 10
health_check=$(curl -f http://localhost:3000/api/health || echo "failed")
if [ "$health_check" = "failed" ]; then
    echo "⚠️  Приложение не отвечает на health check"
    echo "Проверьте логи: docker-compose logs app"
else
    echo "✅ Приложение работает корректно"
fi

# Показываем статус
echo "📊 Статус контейнеров:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Развертывание завершено!"
echo "🌐 Приложение доступно по адресу: https://zelyonkin.ru"
echo "📝 Логи: docker-compose -f $COMPOSE_FILE logs -f"


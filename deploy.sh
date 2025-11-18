#!/bin/bash

# ============================================
# Скрипт автоматического развертывания
# Использование: ./deploy.sh [--no-build]
# ============================================

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Обработка ошибок
error_exit() {
    log_error "$1"
    exit 1
}

# Проверка аргументов
SKIP_BUILD=false
if [[ "${1:-}" == "--no-build" ]]; then
    SKIP_BUILD=true
    log_info "Режим обновления без пересборки"
fi

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 Развертывание zelyonkin.ru"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Проверка, что скрипт запущен из правильной директории
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    error_exit "Скрипт должен быть запущен из корня проекта"
fi

# Проверка наличия .env файла
if [ ! -f .env ]; then
    error_exit "Файл .env не найден! Создайте .env на основе .env.example или запустите ./setup-env.sh"
fi

# Проверка обязательных переменных в .env
log_info "Проверка переменных окружения..."
source .env 2>/dev/null || true

if [ -z "${ADMIN_PASSWORD_HASH:-}" ]; then
    error_exit "ADMIN_PASSWORD_HASH не задан в .env файле"
fi

if [ -z "${NEXTAUTH_SECRET:-}" ]; then
    log_warning "NEXTAUTH_SECRET не задан, это может быть проблемой безопасности"
fi

log_success "Переменные окружения проверены"

# Проверка Docker
log_info "Проверка Docker..."
if ! command -v docker &> /dev/null; then
    error_exit "Docker не установлен! Установите Docker или запустите ./server-setup.sh"
fi

if ! docker info &> /dev/null; then
    error_exit "Docker daemon не запущен или нет прав доступа. Проверьте: sudo usermod -aG docker \$USER"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error_exit "Docker Compose не установлен!"
fi

log_success "Docker готов к работе"

# Создание необходимых директорий
log_info "Создание директорий..."
mkdir -p database storage/uploads storage/vault || error_exit "Не удалось создать директории"
mkdir -p certbot/www certbot/conf certbot/logs || error_exit "Не удалось создать директории certbot"
log_success "Директории созданы"

# Обеспечение создания базы данных
log_info "Проверка базы данных..."
# Убеждаемся, что директория существует
mkdir -p database
chmod 755 database 2>/dev/null || true

if [ ! -f "database/db.sqlite" ]; then
    log_info "База данных не найдена, будет создана при выполнении миграций"
    # НЕ создаем файл вручную - Prisma создаст его при миграции
else
    log_success "База данных уже существует"
    chmod 666 database/db.sqlite 2>/dev/null || true
fi

# Остановка существующих контейнеров
log_info "Остановка существующих контейнеров..."
if docker-compose ps -q &> /dev/null || docker compose ps -q &> /dev/null; then
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    log_success "Старые контейнеры остановлены"
else
    log_info "Нет запущенных контейнеров"
fi

# Сборка образов (если не пропущена)
if [ "$SKIP_BUILD" = false ]; then
    log_info "Сборка Docker образов..."
    log_info "   Это может занять несколько минут..."
    if docker compose build --no-cache &> /dev/null 2>&1; then
        docker compose build --no-cache
    else
docker-compose build --no-cache
    fi
    log_success "Образы собраны"
else
    log_info "Пропуск сборки (используются существующие образы)"
fi

# Запуск контейнеров (только web, без nginx, чтобы не ждать healthcheck)
log_info "Запуск контейнера web..."
if docker compose up -d web &> /dev/null 2>&1; then
    docker compose up -d web
else
    docker-compose up -d web
fi

# Ожидание запуска контейнера (не ждем healthcheck, так как БД еще может не быть)
log_info "Ожидание запуска контейнера (10 секунд)..."
sleep 10

# Проверяем, что контейнер запущен
if docker compose ps web 2>/dev/null | grep -q "Up" || docker-compose ps web 2>/dev/null | grep -q "Up"; then
    log_success "Контейнер web запущен"
else
    log_error "Контейнер web не запустился. Проверьте логи: docker-compose logs web"
    exit 1
fi

# Выполнение миграций (ПЕРЕД проверкой healthcheck)
log_info "Выполнение миграций базы данных..."
# Убеждаемся, что директория базы данных существует и имеет правильные права
chmod 755 database 2>/dev/null || true
chmod 666 database/db.sqlite 2>/dev/null || true

# Выполняем миграции (Prisma автоматически создаст базу данных, если её нет)
log_info "Применение миграций базы данных..."
log_info "   (Это может занять некоторое время при первом запуске...)"

# Ждем еще немного, чтобы приложение полностью запустилось
sleep 5

# Выполняем миграции с несколькими попытками
MIGRATION_SUCCESS=false
for attempt in 1 2 3; do
    log_info "   Попытка $attempt из 3..."
    if docker compose exec -T web npm run db:migrate 2>&1; then
        log_success "   Миграции применены успешно"
        MIGRATION_SUCCESS=true
        break
    else
        if [ $attempt -lt 3 ]; then
            log_warning "   Попытка $attempt не удалась, ждем 5 секунд..."
            sleep 5
        else
            log_warning "   Ошибка при применении миграций, пробуем альтернативный способ..."
            if docker-compose exec -T web npm run db:migrate 2>&1; then
                log_success "   Миграции применены успешно"
                MIGRATION_SUCCESS=true
                break
            else
                log_error "   Не удалось применить миграции. Проверьте логи: docker-compose logs web"
            fi
        fi
    fi
done

# Проверяем, что база данных создана
sleep 2
if [ -f "database/db.sqlite" ]; then
    log_success "База данных создана и миграции выполнены"
    # Устанавливаем правильные права на файл базы данных
    chmod 666 database/db.sqlite 2>/dev/null || true
    chmod 755 database 2>/dev/null || true
    
    # Создание/обновление администратора
    log_info "Инициализация администратора..."
    
    # Проверяем и генерируем хеш пароля, если нужно
    source .env 2>/dev/null || true
    if [ -z "${ADMIN_PASSWORD_HASH:-}" ] || [ "$ADMIN_PASSWORD_HASH" = "" ]; then
        log_info "   🔐 Генерация хеша пароля через Docker контейнер..."
        DEFAULT_PASSWORD="1234"
        ADMIN_PASSWORD_HASH=$(docker run --rm node:20-slim sh -c "
            npm install bcryptjs 2>/dev/null && \
            node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$DEFAULT_PASSWORD', 10))\"
        " 2>/dev/null | tail -1 || echo "")
        
        if [ -n "$ADMIN_PASSWORD_HASH" ] && [ "$ADMIN_PASSWORD_HASH" != "" ]; then
            # Обновляем .env файл
            if [ -f .env ]; then
                # Заменяем пустую строку ADMIN_PASSWORD_HASH на сгенерированный хеш
                if grep -q "^ADMIN_PASSWORD_HASH=$" .env; then
                    sed -i "s|^ADMIN_PASSWORD_HASH=$|ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH|" .env
                else
                    # Если строка не найдена, добавляем в конец
                    echo "ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH" >> .env
                fi
                log_success "   Хеш пароля добавлен в .env"
                # Перезагружаем переменные окружения
                source .env 2>/dev/null || true
            fi
        else
            log_warning "   Не удалось сгенерировать хеш, будет использован db:force-fix-user"
        fi
    fi
    
    # Создаем администратора
    if docker compose exec -T web npm run db:init-admin &> /dev/null 2>&1; then
        docker compose exec -T web npm run db:init-admin 2>&1 | grep -v "^$" || log_info "   Администратор создан"
    else
        docker-compose exec -T web npm run db:init-admin 2>&1 | grep -v "^$" || log_info "   Администратор создан"
    fi
    
    # Всегда используем force-fix-user для гарантии правильного хеша и name
    log_info "   🔧 Проверка и исправление пользователя..."
    if docker compose exec -T web npm run db:force-fix-user &> /dev/null 2>&1; then
        docker compose exec -T web npm run db:force-fix-user 2>&1 | grep -v "^$" || log_info "   Пользователь исправлен"
    else
        docker-compose exec -T web npm run db:force-fix-user 2>&1 | grep -v "^$" || log_info "   Пользователь исправлен"
    fi
    
    log_success "Администратор инициализирован"
else
    log_error "База данных не создана!"
    log_info "Попробуйте выполнить вручную:"
    log_info "docker-compose exec web npm run db:migrate"
    log_info "docker-compose exec web npm run db:force-fix-user"
    log_error "Развертывание не завершено. См. FIX-DATABASE.md для инструкций"
    exit 1
fi

# Теперь запускаем nginx (после того, как web контейнер готов)
log_info "🌐 Запуск Nginx..."
if docker compose up -d nginx &> /dev/null 2>&1; then
    docker compose up -d nginx
else
    docker-compose up -d nginx
fi

# Проверяем финальный статус
sleep 5
log_info "📊 Проверка статуса контейнеров..."
if docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null; then
    docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
fi

# Проверка healthcheck (после запуска nginx)
echo ""
log_info "Проверка healthcheck..."
sleep 10
if curl -sf http://localhost/api/health &> /dev/null || curl -sf http://localhost:3000/api/health &> /dev/null; then
    log_success "Healthcheck прошел успешно"
else
    log_warning "Healthcheck не доступен (возможно, приложение еще запускается)"
    log_info "Проверьте логи: docker-compose logs web"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
log_success "Развертывание завершено!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Сайт должен быть доступен по адресу:"
echo "   - HTTP:  http://zelyonkin.ru"
echo "   - HTTPS: https://zelyonkin.ru (после настройки SSL)"
echo ""
echo "📋 Полезные команды:"
echo "  - Просмотр логов: docker-compose logs -f"
echo "  - Логи web: docker-compose logs -f web"
echo "  - Остановка: docker-compose down"
echo "  - Перезапуск: docker-compose restart"
echo "  - Настройка SSL: ./setup-ssl.sh"
echo "  - Healthcheck: curl http://localhost/api/health"
echo ""


#!/bin/bash

# ============================================
# Единый скрипт полной установки и развертывания
# Использование: ./install.sh
# ============================================

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для логирования
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

error_exit() {
    log_error "$1"
    exit 1
}

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 Автоматическая установка zelyonkin.ru"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Проверка, что скрипт запущен из правильной директории
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    error_exit "Скрипт должен быть запущен из корня проекта"
fi

# Проверка Docker
log_info "Проверка окружения..."
if ! command -v docker &> /dev/null; then
    error_exit "Docker не установлен! Запустите сначала: ./server-setup.sh"
fi

if ! docker info &> /dev/null; then
    error_exit "Docker daemon не запущен или нет прав доступа. Проверьте: sudo usermod -aG docker \$USER"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error_exit "Docker Compose не установлен! Запустите сначала: ./server-setup.sh"
fi

log_success "Docker и Docker Compose установлены"
echo ""

# Шаг 1: Создание .env файла
log_info "Шаг 1/5: Настройка переменных окружения..."
if [ ! -f .env ]; then
    if [ -f setup-env.sh ]; then
        chmod +x setup-env.sh
        # Используем --no-hash для пропуска генерации хеша (будет сгенерирован позже через Docker)
        if echo "" | ./setup-env.sh --no-hash; then
            log_success "Файл .env создан"
    else
            error_exit "Не удалось создать .env файл"
        fi
    else
        error_exit "setup-env.sh не найден!"
    fi
else
    log_info "Файл .env уже существует, пропускаем создание"
fi

# Проверка обязательных переменных
if [ -f .env ]; then
    source .env 2>/dev/null || true
    if [ -z "${ADMIN_PASSWORD_HASH:-}" ] || [ "$ADMIN_PASSWORD_HASH" = "" ]; then
        log_info "ADMIN_PASSWORD_HASH не задан в .env (это нормально)"
        log_info "   Хеш будет автоматически сгенерирован после запуска контейнера"
    fi
fi
echo ""

# Шаг 2: Создание необходимых директорий
log_info "Шаг 2/5: Создание директорий..."
mkdir -p database storage/uploads storage/vault || error_exit "Не удалось создать директории storage"
mkdir -p certbot/www certbot/conf certbot/logs || error_exit "Не удалось создать директории certbot"
log_success "Все директории созданы"

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
echo ""

# Шаг 3: Установка прав на скрипты
log_info "Шаг 3/5: Установка прав на скрипты..."
chmod +x *.sh 2>/dev/null || true
log_success "Права установлены"
echo ""

# Шаг 4: Остановка старых контейнеров
log_info "Шаг 4/5: Остановка старых контейнеров..."
if docker-compose ps -q &> /dev/null || docker compose ps -q &> /dev/null; then
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    log_success "Старые контейнеры остановлены"
else
    log_info "Нет запущенных контейнеров"
fi
echo ""

# Шаг 5: Сборка и запуск
log_info "Шаг 5/5: Сборка и запуск приложения..."
log_info "   Это может занять несколько минут..."
echo ""

# Сборка образов
log_info "   📦 Сборка Docker образов..."
if docker compose build --no-cache &> /dev/null 2>&1; then
    docker compose build --no-cache
else
docker-compose build --no-cache
fi
log_success "   Образы собраны"

# Запуск контейнеров (только web, без nginx, чтобы не ждать healthcheck)
log_info "   ▶️  Запуск контейнера web..."
if docker compose up -d web &> /dev/null 2>&1; then
    docker compose up -d web
else
    docker-compose up -d web
fi

# Ожидание запуска контейнера (не ждем healthcheck, так как БД еще нет)
log_info "   ⏳ Ожидание запуска контейнера (10 секунд)..."
sleep 10

# Проверяем, что контейнер запущен
if docker compose ps web 2>/dev/null | grep -q "Up" || docker-compose ps web 2>/dev/null | grep -q "Up"; then
    log_success "   Контейнер web запущен"
else
    log_error "   Контейнер web не запустился. Проверьте логи: docker-compose logs web"
    exit 1
fi

# Выполнение миграций (ПЕРЕД проверкой healthcheck)
log_info "   🗄️  Выполнение миграций базы данных..."
# Убеждаемся, что директория базы данных существует и имеет правильные права
chmod 755 database 2>/dev/null || true
chmod 666 database/db.sqlite 2>/dev/null || true

# Выполняем миграции (Prisma автоматически создаст базу данных, если её нет)
log_info "   Применение миграций базы данных..."
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
    log_success "   База данных создана и миграции выполнены"
    # Устанавливаем правильные права на файл базы данных
    chmod 666 database/db.sqlite 2>/dev/null || true
    chmod 755 database 2>/dev/null || true
    
    # Создание администратора по умолчанию
    log_info "   👤 Создание администратора..."
    
    # Проверяем и генерируем хеш пароля, если нужно
    source .env 2>/dev/null || true
    if [ -z "${ADMIN_PASSWORD_HASH:-}" ] || [ "$ADMIN_PASSWORD_HASH" = "" ]; then
        log_info "   🔐 Генерация хеша пароля через Docker контейнер..."
        DEFAULT_PASSWORD="1234"
        
        # Генерируем хеш с таймаутом
        ADMIN_PASSWORD_HASH=$(timeout 30 docker run --rm node:20-slim sh -c "
            npm install bcryptjs --silent --no-audit --no-fund 2>/dev/null && \
            node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$DEFAULT_PASSWORD', 10))\"
        " 2>/dev/null | tail -1 | grep -E '^\$2[aby]' || echo "")
        
        if [ -n "$ADMIN_PASSWORD_HASH" ] && [ "$ADMIN_PASSWORD_HASH" != "" ] && echo "$ADMIN_PASSWORD_HASH" | grep -qE '^\$2[aby]'; then
            # Обновляем .env файл
            if [ -f .env ]; then
                # Заменяем пустую строку ADMIN_PASSWORD_HASH на сгенерированный хеш
                if grep -q "^ADMIN_PASSWORD_HASH=$" .env; then
                    # Используем правильный разделитель для sed
                    sed -i "s|^ADMIN_PASSWORD_HASH=$|ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH|" .env
                elif grep -q "^ADMIN_PASSWORD_HASH=\"\"" .env; then
                    sed -i "s|^ADMIN_PASSWORD_HASH=\"\"|ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH|" .env
                else
                    # Если строка не найдена, добавляем в конец
                    echo "ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH" >> .env
                fi
                log_success "   ✅ Хеш пароля добавлен в .env"
                # Перезагружаем переменные окружения
                source .env 2>/dev/null || true
            fi
        else
            log_warning "   ⚠️  Не удалось сгенерировать хеш через Docker"
            log_info "   Хеш будет сгенерирован через db:force-fix-user"
        fi
    else
        log_info "   ✅ Хеш пароля уже задан в .env"
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
    
    log_success "   Администратор инициализирован"
else
    log_error "   База данных не создана!"
    log_info "   Попробуйте выполнить вручную:"
    log_info "   docker-compose exec web npm run db:migrate"
    log_info "   docker-compose exec web npm run db:force-fix-user"
    log_error "   Установка не завершена. См. FIX-DATABASE.md для инструкций"
    exit 1
fi

# Теперь запускаем nginx (после того, как web контейнер готов)
log_info "   🌐 Запуск Nginx..."
if docker compose up -d nginx &> /dev/null 2>&1; then
    docker compose up -d nginx
else
    docker-compose up -d nginx
fi

# Проверяем финальный статус
sleep 5
log_info "   📊 Проверка статуса контейнеров..."
if docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null; then
    docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
fi

# Проверка статуса
echo ""
log_info "   📊 Статус контейнеров:"
if docker compose ps &> /dev/null 2>&1; then
    docker compose ps
else
docker-compose ps
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
log_success "Установка завершена успешно!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Получите SSL сертификат:"
echo "   ./setup-ssl.sh"
echo ""
echo "2. Проверьте статус:"
echo "   docker-compose ps"
echo ""
echo "3. Просмотрите логи:"
echo "   docker-compose logs -f web"
echo ""
echo "4. Проверьте healthcheck:"
echo "   curl http://localhost/api/health"
echo ""
echo "5. После получения SSL сертификата сайт будет доступен:"
echo "   https://zelyonkin.ru"
echo ""
echo "⚠️  ВАЖНО:"
echo "   - Пароль по умолчанию: 1234"
echo "   - Обязательно смените пароль после первого входа!"
echo "   - Настройте SSL сертификат перед использованием"
echo ""
echo "📋 Полезные команды:"
echo "   - Просмотр логов: docker-compose logs -f"
echo "   - Остановка: docker-compose down"
echo "   - Перезапуск: docker-compose restart"
echo "   - Бэкап: ./backup.sh"
echo "   - Обновление без пересборки: ./deploy.sh --no-build"
echo ""


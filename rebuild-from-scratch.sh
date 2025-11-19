#!/bin/bash
# Скрипт полной пересборки проекта с нуля
# Удаляет все контейнеры, volumes, образы и пересоздает все заново
# Использование: ./rebuild-from-scratch.sh [--remove-images]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Определяем команду docker-compose
if command -v docker compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
    USE_COMPOSE_V2=true
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    USE_COMPOSE_V2=false
else
    echo "❌ Docker Compose не найден"
    exit 1
fi

# Флаги
REMOVE_IMAGES=false
if [[ "${1:-}" == "--remove-images" ]]; then
    REMOVE_IMAGES=true
fi

log_info() { echo "ℹ️  $1"; }
log_success() { echo "✅ $1"; }
log_warning() { echo "⚠️  $1"; }
log_error() { echo "❌ $1"; exit 1; }

echo "=========================================="
echo "🔄 Полная пересборка проекта с нуля"
echo "=========================================="
echo ""

# Подтверждение
echo "⚠️  ВНИМАНИЕ: Этот скрипт удалит:"
echo "   - Все контейнеры проекта"
echo "   - Все volumes (включая данные БД)"
if [ "$REMOVE_IMAGES" = true ]; then
    echo "   - Все образы проекта"
fi
echo ""
read -p "Продолжить? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Отменено пользователем"
    exit 0
fi

# 1. Остановка всех контейнеров
log_info "Остановка всех контейнеров..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true
log_success "Контейнеры остановлены"

# 2. Удаление volumes
log_info "Удаление volumes (включая данные БД)..."
$COMPOSE_CMD down -v --remove-orphans 2>/dev/null || true
log_success "Volumes удалены"

# 3. Удаление образов (опционально)
if [ "$REMOVE_IMAGES" = true ]; then
    log_info "Удаление образов проекта..."
    # Получаем имена образов из docker-compose.yml
    local images=$($COMPOSE_CMD config 2>/dev/null | grep -E "^\s+image:" | sed 's/.*image: *//' | tr -d '"' || echo "")
    if [ -n "$images" ]; then
        echo "$images" | while read -r img; do
            if [ -n "$img" ]; then
                docker rmi "$img" 2>/dev/null || true
            fi
        done
    fi
    # Удаляем образы, собранные из Dockerfile
    docker images | grep -E "portfolio|my-portfolio-site" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    log_success "Образы удалены"
fi

# 4. Очистка директории database
log_info "Очистка директории database..."
if [ -d "database" ]; then
    rm -rf database/* 2>/dev/null || true
    # Оставляем .gitkeep, если он есть
    touch database/.gitkeep 2>/dev/null || true
    log_success "Директория database очищена"
else
    mkdir -p database
    touch database/.gitkeep
    log_success "Директория database создана"
fi

# 5. Пересоздание .env файла
log_info "Пересоздание .env файла..."
if [ -f "setup-env.sh" ]; then
    chmod +x setup-env.sh 2>/dev/null || true
    # Запускаем setup-env.sh с --no-hash для быстрой генерации (хеш будет создан в install.sh)
    echo "" | ./setup-env.sh --no-hash 2>/dev/null || {
        log_warning "Не удалось автоматически создать .env, создаем вручную..."
        # Создаем минимальный .env
        cat > .env << 'EOF'
NEXTAUTH_URL=http://zelyonkin.ru
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ADMIN_USERNAME=skre4karta
ADMIN_EMAIL=zelyonkin.d@gmail.com
ADMIN_PASSWORD_HASH=
DATABASE_URL="file:/app/database/db.sqlite"
VAULT_ENCRYPTION_KEY=$(openssl rand -base64 32)
ENCRYPTED_STORAGE_SALT=$(openssl rand -base64 16)
NEXT_PUBLIC_ADMIN_USERNAME=skre4karta
NODE_ENV=production
EOF
        # Генерируем секреты
        if command -v openssl &> /dev/null; then
            NEXTAUTH_SECRET=$(openssl rand -base64 32)
            VAULT_KEY=$(openssl rand -base64 32)
            STORAGE_SALT=$(openssl rand -base64 16)
            sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|g" .env
            sed -i "s|VAULT_ENCRYPTION_KEY=.*|VAULT_ENCRYPTION_KEY=$VAULT_KEY|g" .env
            sed -i "s|ENCRYPTED_STORAGE_SALT=.*|ENCRYPTED_STORAGE_SALT=$STORAGE_SALT|g" .env
        fi
    }
    log_success ".env файл пересоздан"
else
    log_error "setup-env.sh не найден"
fi

# 6. Пересборка образов
log_info "Пересборка образов (это может занять время)..."
$COMPOSE_CMD build --no-cache
log_success "Образы пересобраны"

# 7. Запуск контейнеров
log_info "Запуск контейнеров..."
$COMPOSE_CMD up -d
log_success "Контейнеры запущены"

# 8. Ожидание запуска web контейнера
log_info "Ожидание запуска web контейнера (30 секунд)..."
sleep 30

# Проверяем, что контейнер запустился
retry_count=0
max_retries=10
while [ $retry_count -lt $max_retries ]; do
    if $COMPOSE_CMD ps web 2>/dev/null | grep -q "Up"; then
        log_success "Контейнер web запущен и работает"
        break
    fi
    retry_count=$((retry_count + 1))
    log_info "Ожидание запуска контейнера... ($retry_count/$max_retries)"
    sleep 3
done

if [ $retry_count -eq $max_retries ]; then
    log_error "Контейнер web не запустился после $max_retries попыток"
fi

# 9. Выполнение миграций и создание администратора через install.sh
log_info "Выполнение миграций и создание администратора..."
if [ -f "install.sh" ]; then
    chmod +x install.sh 2>/dev/null || true
    # Запускаем только часть install.sh, связанную с БД и администратором
    # Или можно запустить полный install.sh, но пропустив уже выполненные шаги
    log_info "Запуск install.sh для настройки БД..."
    ./install.sh 2>&1 | tee rebuild.log || {
        log_warning "install.sh завершился с ошибками, проверьте логи в rebuild.log"
    }
else
    log_warning "install.sh не найден, выполняем миграции вручную..."
    $COMPOSE_CMD exec -T -w /app web sh -c 'export DATABASE_URL="file:/app/database/db.sqlite" && npx prisma migrate deploy' || true
    $COMPOSE_CMD exec -T -w /app web sh -c 'export DATABASE_URL="file:/app/database/db.sqlite" && npm run db:init-admin' || true
fi

# 10. Финальная проверка
log_info "Финальная проверка работоспособности..."
sleep 5

# Проверка статуса контейнеров
if $COMPOSE_CMD ps | grep -q "Up"; then
    log_success "Контейнеры работают"
else
    log_warning "Некоторые контейнеры не запущены"
fi

# Проверка healthcheck
log_info "Проверка healthcheck..."
if $COMPOSE_CMD exec -T web node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" 2>/dev/null; then
    log_success "Healthcheck прошел успешно"
else
    log_warning "Healthcheck не прошел, проверьте логи: $COMPOSE_CMD logs web"
fi

# Проверка БД
log_info "Проверка базы данных..."
if $COMPOSE_CMD exec -T -w /app web sh -c 'export DATABASE_URL="file:/app/database/db.sqlite" && test -f /app/database/db.sqlite' 2>/dev/null; then
    db_size=$($COMPOSE_CMD exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
    if [ "$db_size" -gt 0 ]; then
        log_success "База данных создана (размер: ${db_size} байт)"
    else
        log_warning "База данных существует, но пуста"
    fi
else
    log_warning "База данных не найдена"
fi

echo ""
echo "=========================================="
log_success "Полная пересборка завершена!"
echo "=========================================="
echo ""
echo "📋 Следующие шаги:"
echo "   1. Проверьте логи: $COMPOSE_CMD logs web"
echo "   2. Проверьте healthcheck: curl http://localhost:3000/api/health"
echo "   3. Запустите диагностику: ./diagnose-web.sh"
echo "   4. Проверьте создание администратора: $COMPOSE_CMD exec web npm run db:check-auth"
echo ""


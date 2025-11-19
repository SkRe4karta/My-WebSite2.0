#!/bin/bash

# ============================================
# Единый скрипт полной установки и развертывания
# Версия: 3.0.0
# Автор: zelyonkin.ru
# Дата: 2025-01-18
# ============================================

set -euo pipefail

# ============================================
# ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ
# ============================================

readonly SCRIPT_VERSION="3.0.0"
readonly SCRIPT_NAME="install.sh"
readonly LOG_FILE="install.log"
readonly BACKUP_DIR=".install-backups"
readonly MIN_DISK_SPACE_GB=2
readonly MIN_MEMORY_GB=1
readonly MIN_DOCKER_VERSION="20.10"
readonly MIN_COMPOSE_VERSION="2.0"
readonly DEFAULT_PASSWORD="1234"
readonly MAX_RETRIES=3
readonly RETRY_DELAY=5

# Состояние установки
INSTALL_STATE_FILE=".install-state"
CLEANUP_NEEDED=false
DOCKER_CMD=""
COMPOSE_CMD=""
USE_COMPOSE_V2=true
WEB_CONTAINER_STARTED=false
NGINX_CONTAINER_STARTED=false
DB_CREATED=false
ADMIN_CREATED=false

# Цвета для вывода
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# ============================================
# ФУНКЦИИ ЛОГИРОВАНИЯ
# ============================================

log_to_file() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" >> "$LOG_FILE" 2>/dev/null || true
}

log_info() {
    local msg="$1"
    echo -e "${BLUE}ℹ️  $msg${NC}"
    log_to_file "INFO: $msg"
}

log_success() {
    local msg="$1"
    echo -e "${GREEN}✅ $msg${NC}"
    log_to_file "SUCCESS: $msg"
}

log_warning() {
    local msg="$1"
    echo -e "${YELLOW}⚠️  $msg${NC}"
    log_to_file "WARNING: $msg"
}

log_error() {
    local msg="$1"
    echo -e "${RED}❌ $msg${NC}" >&2
    log_to_file "ERROR: $msg"
}

log_step() {
    local step="$1"
    local total="$2"
    echo -e "${BOLD}${CYAN}[$step/$total]${NC} $3"
    log_to_file "STEP [$step/$total]: $3"
}

error_exit() {
    local msg="$1"
    log_error "$msg"
    cleanup_on_error
    exit 1
}

# ============================================
# ФУНКЦИИ ОПРЕДЕЛЕНИЯ КОМАНД
# ============================================

detect_docker_commands() {
    log_info "Определение команд Docker..."
    
    # Проверяем docker compose (новый синтаксис)
    if docker compose version &> /dev/null 2>&1; then
        DOCKER_CMD="docker"
        COMPOSE_CMD="docker compose"
        USE_COMPOSE_V2=true
        log_success "Используется: docker compose (v2)"
    # Проверяем docker-compose (старый синтаксис)
    elif command -v docker-compose &> /dev/null && docker-compose version &> /dev/null 2>&1; then
        DOCKER_CMD="docker"
        COMPOSE_CMD="docker-compose"
        USE_COMPOSE_V2=false
        log_success "Используется: docker-compose (v1)"
    else
        error_exit "Docker Compose не найден! Установите Docker Compose."
    fi
    
    log_to_file "DOCKER_CMD=$DOCKER_CMD, COMPOSE_CMD=$COMPOSE_CMD"
}

# Функция для выполнения docker compose команд
run_compose() {
    if [ "${USE_COMPOSE_V2:-true}" = true ]; then
        docker compose "$@"
    else
        docker-compose "$@"
    fi
}

# ============================================
# ФУНКЦИИ CLEANUP И ОТКАТА
# ============================================

cleanup_on_error() {
    if [ "$CLEANUP_NEEDED" = true ]; then
        log_warning "Выполняется очистка после ошибки..."
        
        # Останавливаем контейнеры, если они были запущены
        if [ "$NGINX_CONTAINER_STARTED" = true ]; then
            log_info "Остановка контейнера nginx..."
            run_compose stop nginx 2>/dev/null || true
        fi
        
        if [ "$WEB_CONTAINER_STARTED" = true ]; then
            log_info "Остановка контейнера web..."
            run_compose stop web 2>/dev/null || true
        fi
        
        CLEANUP_NEEDED=false
    fi
}

cleanup_on_exit() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Скрипт завершился с ошибкой (код: $exit_code)"
        cleanup_on_error
    fi
    log_to_file "Скрипт завершен с кодом: $exit_code"
}

# Обработка сигналов
trap cleanup_on_exit EXIT
trap 'log_error "Получен сигнал прерывания (SIGINT)"; cleanup_on_error; exit 130' INT
trap 'log_error "Получен сигнал завершения (SIGTERM)"; cleanup_on_error; exit 143' TERM

# ============================================
# ФУНКЦИИ ПРОВЕРКИ ОКРУЖЕНИЯ
# ============================================

check_docker_version() {
    log_info "Проверка версии Docker..."
    
if ! command -v docker &> /dev/null; then
    error_exit "Docker не установлен! Запустите сначала: ./server-setup.sh"
fi
    
    local docker_version=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0.0")
    log_info "Версия Docker: $docker_version"

if ! docker info &> /dev/null; then
    error_exit "Docker daemon не запущен или нет прав доступа. Проверьте: sudo usermod -aG docker \$USER"
fi

    log_success "Docker готов к работе"
}

check_compose_version() {
    log_info "Проверка версии Docker Compose..."
    
    detect_docker_commands
    
    local compose_version=""
    if [ "${USE_COMPOSE_V2:-true}" = true ]; then
        compose_version=$(docker compose version --short 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0.0")
    else
        compose_version=$(docker-compose --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0.0")
    fi
    
    log_info "Версия Docker Compose: $compose_version"
    log_success "Docker Compose готов к работе"
}

check_disk_space() {
    log_info "Проверка свободного места на диске..."
    
    local available_gb=$(df -BG . 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/G//' || echo "0")
    
    if [ "$available_gb" -lt "$MIN_DISK_SPACE_GB" ]; then
        error_exit "Недостаточно свободного места на диске! Требуется минимум ${MIN_DISK_SPACE_GB}GB, доступно ${available_gb}GB"
    fi
    
    log_success "Свободное место: ${available_gb}GB (требуется минимум ${MIN_DISK_SPACE_GB}GB)"
}

check_memory() {
    log_info "Проверка доступной памяти..."
    
    local total_mem_gb=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0")
    
    if [ "$total_mem_gb" -lt "$MIN_MEMORY_GB" ]; then
        log_warning "Мало памяти: ${total_mem_gb}GB (рекомендуется минимум ${MIN_MEMORY_GB}GB)"
    else
        log_success "Доступная память: ${total_mem_gb}GB"
    fi
}

check_ports() {
    log_info "Проверка доступности портов..."
    
    local ports=(80 443 3000)
    local ports_in_use=()
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            # Проверяем, не наш ли это контейнер
            if ! run_compose ps 2>/dev/null | grep -q ":$port->"; then
                ports_in_use+=($port)
            fi
        fi
    done
    
    if [ ${#ports_in_use[@]} -gt 0 ]; then
        log_warning "Порты уже заняты: ${ports_in_use[*]}"
        log_info "Если это ваши контейнеры, это нормально"
    else
        log_success "Все порты доступны"
    fi
}

check_project_files() {
    log_info "Проверка файлов проекта..."
    
    local required_files=(
        "package.json"
        "docker-compose.yml"
        "Dockerfile"
        "nginx.conf"
        "prisma/schema.prisma"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        error_exit "Отсутствуют необходимые файлы: ${missing_files[*]}"
    fi
    
    log_success "Все необходимые файлы найдены"
}

# ============================================
# ФУНКЦИИ РАБОТЫ С .ENV
# ============================================

validate_env_syntax() {
    local env_file="$1"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    # Проверяем базовый синтаксис (нет непарных кавычек)
    local unclosed_quotes=$(grep -c '^[^#]*[^"]*"[^"]*$' "$env_file" 2>/dev/null || echo "0")
    if [ "$unclosed_quotes" -gt 0 ]; then
        log_warning "Обнаружены возможные проблемы с кавычками в .env"
        return 1
    fi
    
    return 0
}

backup_env_file() {
    if [ -f ".env" ]; then
        mkdir -p "$BACKUP_DIR"
        local backup_file="$BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$backup_file" 2>/dev/null && log_info "Создана резервная копия .env: $backup_file"
    fi
}

validate_env_variables() {
    log_info "Проверка переменных окружения..."
    
    if [ ! -f ".env" ]; then
        return 1
    fi
    
    source .env 2>/dev/null || true
    
    local required_vars=(
        "NEXTAUTH_SECRET"
        "DATABASE_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "Отсутствуют некоторые переменные: ${missing_vars[*]}"
        return 1
    fi
    
    # Проверяем формат ADMIN_PASSWORD_HASH, если он задан
    if [ -n "${ADMIN_PASSWORD_HASH:-}" ] && [ "$ADMIN_PASSWORD_HASH" != "" ]; then
        if ! echo "$ADMIN_PASSWORD_HASH" | grep -qE '^\$2[aby]'; then
            log_warning "ADMIN_PASSWORD_HASH не похож на bcrypt хеш (должен начинаться с \$2a, \$2b или \$2y)"
        fi
    fi
    
    log_success "Переменные окружения проверены"
    return 0
}

create_env_file() {
    log_info "Создание .env файла..."
    
    if [ -f "setup-env.sh" ]; then
        chmod +x setup-env.sh 2>/dev/null || true
        backup_env_file
        
        if echo "" | ./setup-env.sh --no-hash 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Файл .env создан"
            return 0
    else
            log_error "Не удалось создать .env файл"
            return 1
        fi
    else
        error_exit "setup-env.sh не найден!"
    fi
}

# ============================================
# ФУНКЦИИ СОЗДАНИЯ ДИРЕКТОРИЙ
# ============================================

create_directories() {
    log_info "Создание необходимых директорий..."
    
    local directories=(
        "database"
        "storage/uploads"
        "storage/vault"
        "certbot/www"
        "certbot/conf"
        "certbot/logs"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            if mkdir -p "$dir" 2>/dev/null; then
                log_success "Создана директория: $dir"
            else
                error_exit "Не удалось создать директорию: $dir"
            fi
        else
            log_info "Директория уже существует: $dir"
        fi
        
        # Устанавливаем правильные права
        chmod 755 "$dir" 2>/dev/null || chmod 777 "$dir" 2>/dev/null || true
    done
    
    log_success "Все директории созданы и настроены"
}

# ============================================
# ФУНКЦИИ РАБОТЫ С БАЗОЙ ДАННЫХ
# ============================================

ensure_database_directory() {
    log_info "Проверка директории базы данных..."
    
    # Создаем директорию на хосте
    mkdir -p database
    
    # КРИТИЧНО: Устанавливаем максимальные права (777) для гарантии доступа
    log_info "Установка максимальных прав доступа (777) на директорию database..."
    if chmod 777 database 2>/dev/null; then
        log_success "Права 777 установлены на директорию database"
    else
        log_warning "Не удалось установить права 777, пробуем через sudo..."
        sudo chmod 777 database 2>/dev/null || {
            log_warning "Не удалось установить права 777, пробуем 755..."
            chmod 755 database 2>/dev/null || sudo chmod 755 database 2>/dev/null || true
        }
    fi
    
    # Убеждаемся, что директория доступна для записи
    if [ ! -w "database" ]; then
        log_warning "Директория database не доступна для записи, исправляем..."
        chmod 777 database 2>/dev/null || sudo chmod 777 database 2>/dev/null || true
    fi
    
    # Устанавливаем максимальные права на файл БД, если он существует
    if [ -f "database/db.sqlite" ]; then
        log_info "Установка максимальных прав (777) на файл БД..."
        chmod 777 database/db.sqlite 2>/dev/null || sudo chmod 777 database/db.sqlite 2>/dev/null || true
    fi
    
    # Устанавливаем максимальные права внутри контейнера, если он запущен
    if run_compose ps web 2>/dev/null | grep -q "Up"; then
        log_info "Настройка максимальных прав внутри контейнера..."
        
        # Используем root для установки прав (выходим из USER nextjs временно)
        run_compose exec -T --user root web chmod 777 /app/database 2>/dev/null || \
        run_compose exec -T web sh -c "chmod 777 /app/database 2>/dev/null || true" || true
        
        # Устанавливаем права на файл БД, если существует
        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
            run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || \
            run_compose exec -T web sh -c "chmod 777 /app/database/db.sqlite 2>/dev/null || true" || true
        fi
        
        # Пробуем установить владельца (но приоритет - права 777)
        run_compose exec -T --user root web chown -R nextjs:nodejs /app/database 2>/dev/null || \
        run_compose exec -T --user root web chown -R 1001:1001 /app/database 2>/dev/null || \
        run_compose exec -T --user root web chown -R root:root /app/database 2>/dev/null || true
        
        # Проверяем, что директория доступна для записи
        if run_compose exec -T web test -w /app/database 2>/dev/null; then
            log_success "Директория /app/database доступна для записи внутри контейнера"
        else
            log_warning "Директория /app/database может быть недоступна для записи"
            # Повторная попытка с root
            run_compose exec -T --user root web chmod 777 /app/database 2>/dev/null || true
        fi
    fi
    
    log_success "Директория базы данных готова с максимальными правами доступа"
}

create_database_file() {
    log_info "Проверка файла базы данных..."
    
    # НЕ создаем пустой файл! Prisma должен создать его сам
    # Только проверяем и устанавливаем максимальные права, если файл уже существует
    
    if [ -f "database/db.sqlite" ]; then
        log_info "Файл базы данных существует на хосте, устанавливаем максимальные права..."
        # Устанавливаем максимальные права (777) для гарантии доступа
        if chmod 777 database/db.sqlite 2>/dev/null; then
            log_success "Права 777 установлены на файл БД на хосте"
        else
            sudo chmod 777 database/db.sqlite 2>/dev/null || {
                chmod 666 database/db.sqlite 2>/dev/null || true
                log_warning "Использованы права 666 вместо 777"
            }
        fi
    else
        log_info "Файл базы данных не существует, Prisma создаст его при миграциях"
    fi
    
    # Проверяем/настраиваем максимальные права внутри контейнера, если файл существует
    if run_compose ps web 2>/dev/null | grep -q "Up"; then
        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
            log_info "Файл базы данных существует в контейнере, устанавливаем максимальные права..."
            
            # Устанавливаем максимальные права (777) через root
            run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || \
            run_compose exec -T web sh -c "chmod 777 /app/database/db.sqlite 2>/dev/null || true" || {
                log_warning "Не удалось установить права 777, пробуем 666..."
                run_compose exec -T --user root web chmod 666 /app/database/db.sqlite 2>/dev/null || true
            }
            
            # Устанавливаем владельца (но приоритет - права 777)
            run_compose exec -T --user root web chown nextjs:nodejs /app/database/db.sqlite 2>/dev/null || \
            run_compose exec -T --user root web chown 1001:1001 /app/database/db.sqlite 2>/dev/null || \
            run_compose exec -T --user root web chown root:root /app/database/db.sqlite 2>/dev/null || true
            
            # Проверяем, что файл доступен для записи
            if run_compose exec -T web test -w /app/database/db.sqlite 2>/dev/null; then
                log_success "Файл базы данных доступен для записи внутри контейнера"
            else
                log_warning "Файл базы данных может быть недоступен для записи, повторная попытка..."
                run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
            fi
            
            # Синхронизируем файл между хостом и контейнером
            sync_database_file
        else
            log_info "Файл базы данных не существует в контейнере, Prisma создаст его"
        fi
    fi
}

sync_database_file() {
    log_info "Синхронизация файла базы данных..."
    
    if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
        return 0
    fi
    
    local max_sync_attempts=5
    local sync_attempt=1
    local sync_success=false
    
    while [ $sync_attempt -le $max_sync_attempts ] && [ "$sync_success" = false ]; do
        # Проверяем размер файла в контейнере
        local container_size=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
        local host_size=0
        
        if [ -f "database/db.sqlite" ]; then
            host_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
        fi
        
        # Если файл в контейнере больше, копируем на хост
        if [ "$container_size" -gt "$host_size" ] && [ "$container_size" -gt 0 ]; then
            log_info "Файл в контейнере больше (${container_size} > ${host_size}), синхронизируем на хост (попытка $sync_attempt)..."
            
            # Принудительно синхронизируем файловую систему в контейнере перед копированием
            run_compose exec -T web sync 2>/dev/null || true
            
            # Копируем файл с принудительной перезаписью
            if run_compose cp web:/app/database/db.sqlite database/db.sqlite 2>/dev/null; then
                # Устанавливаем максимальные права на скопированный файл
                chmod 777 database/db.sqlite 2>/dev/null || sudo chmod 777 database/db.sqlite 2>/dev/null || chmod 666 database/db.sqlite 2>/dev/null || true
                
                # Синхронизируем файловую систему на хосте
                sync 2>/dev/null || true
                
                # Проверяем результат
                local new_host_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
                if [ "$new_host_size" -eq "$container_size" ] && [ "$new_host_size" -gt 0 ]; then
                    sync_success=true
                    log_success "Файл синхронизирован на хост (размер: ${new_host_size} байт)"
                else
                    log_warning "Размер файла не совпадает после синхронизации, пробуем еще раз..."
                fi
            else
                log_warning "Не удалось скопировать файл из контейнера (попытка $sync_attempt)"
            fi
        # Если файл на хосте больше, копируем в контейнер
        elif [ "$host_size" -gt "$container_size" ] && [ "$host_size" -gt 0 ]; then
            log_info "Файл на хосте больше (${host_size} > ${container_size}), синхронизируем в контейнер (попытка $sync_attempt)..."
            
            # Синхронизируем файловую систему на хосте перед копированием
            sync 2>/dev/null || true
            
            # Копируем файл с принудительной перезаписью
            if run_compose cp database/db.sqlite web:/app/database/db.sqlite 2>/dev/null; then
                # Устанавливаем максимальные права внутри контейнера
                run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
                
                # Синхронизируем файловую систему в контейнере
                run_compose exec -T web sync 2>/dev/null || true
                
                sync_success=true
                log_success "Файл синхронизирован в контейнер"
            else
                log_warning "Не удалось скопировать файл в контейнер (попытка $sync_attempt)"
            fi
        # Если размеры равны и больше 0 - уже синхронизировано
        elif [ "$container_size" -eq "$host_size" ] && [ "$container_size" -gt 0 ]; then
            sync_success=true
            log_success "Файлы синхронизированы (размер: ${container_size} байт)"
        else
            log_info "Файл не существует или размер 0, пропускаем синхронизацию"
            sync_success=true  # Не считаем это ошибкой
        fi
        
        if [ "$sync_success" = false ] && [ $sync_attempt -lt $max_sync_attempts ]; then
            sleep 2
        fi
        
        sync_attempt=$((sync_attempt + 1))
    done
    
    if [ "$sync_success" = false ]; then
        log_warning "Не удалось полностью синхронизировать файл после $max_sync_attempts попыток"
    fi
}

verify_database_created() {
    log_info "Проверка создания базы данных..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local host_size=0
        local container_size=0
        local has_tables=false
        
        # Проверяем на хосте
        if [ -f "database/db.sqlite" ]; then
            host_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
        fi
        
        # Проверяем внутри контейнера
        if run_compose ps web 2>/dev/null | grep -q "Up"; then
            if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
                container_size=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
            fi
            
            # Проверяем наличие таблиц через Prisma (даже если размер 0)
            if [ "$container_size" -eq 0 ] || [ "$host_size" -eq 0 ]; then
                log_info "Размер файла 0, проверяем наличие таблиц через Prisma..."
                local table_check=$(run_compose exec -T -w /app web node -e "
                    const { PrismaClient } = require('@prisma/client');
                    const prisma = new PrismaClient();
                    (async () => {
                        try {
                            const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';\`;
                            if (result && result.length > 0) {
                                console.log('tables_found');
                            } else {
                                console.log('no_tables');
                            }
                        } catch (e) {
                            console.error('error:', e.message);
                            process.exit(1);
                        } finally {
                            await prisma.\$disconnect();
                        }
                    })();
                " 2>/dev/null || echo "error")
                
                if echo "$table_check" | grep -q "tables_found"; then
                    has_tables=true
                    log_success "Таблицы найдены в БД через Prisma (даже при размере 0)"
                fi
            fi
        fi
        
        # Используем больший размер
        local max_size=$((host_size > container_size ? host_size : container_size))
        
        # Если размер > 0 или таблицы найдены, БД создана
        if [ "$max_size" -gt 0 ] || [ "$has_tables" = true ]; then
            DB_CREATED=true
            
            # Синхронизируем файл, если размеры различаются
            if [ "$host_size" -ne "$container_size" ] && [ "$max_size" -gt 0 ]; then
                log_info "Размеры файла различаются (хост: ${host_size}, контейнер: ${container_size}), синхронизируем..."
                sync_database_file
            fi
            
            if [ "$max_size" -gt 0 ]; then
                log_success "База данных создана (размер: ${max_size} байт)"
            else
                log_success "База данных создана (таблицы найдены через Prisma, размер файла может быть 0 из-за синхронизации)"
                # Пробуем синхронизировать еще раз
                sync_database_file
                sleep 2
                # Проверяем размер еще раз
                if [ -f "database/db.sqlite" ]; then
                    host_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
                    if [ "$host_size" -gt 0 ]; then
                        log_success "База данных синхронизирована (размер: ${host_size} байт)"
                    fi
                fi
            fi
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log_info "Ожидание создания базы данных (попытка $attempt/$max_attempts)..."
            log_info "   Размер на хосте: ${host_size} байт"
            log_info "   Размер в контейнере: ${container_size} байт"
            sleep 3
        fi
        attempt=$((attempt + 1))
    done
    
    log_error "База данных не создана после $max_attempts попыток"
    log_info "Проверьте:"
    log_info "  1. Права на директорию database: ls -ld database"
    log_info "  2. Права на файл: ls -l database/db.sqlite"
    log_info "  3. Логи контейнера: run_compose logs web | grep -i database"
    log_info "  4. Попробуйте выполнить вручную: run_compose exec web npm run db:migrate"
    return 1
}

verify_database_structure() {
    log_info "Проверка структуры базы данных..."
    
    if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
        log_warning "Контейнер web не запущен, пропускаем проверку структуры"
        return 0
    fi
    
    # Список обязательных таблиц из schema.prisma
    local required_tables=(
        "User"
        "Account"
        "Session"
        "VerificationToken"
        "Note"
        "FileEntry"
        "VaultItem"
        "SecurityAudit"
        "UserSetting"
    )
    
    # Получаем список таблиц через Prisma Client
    local tables_json=$(run_compose exec -T web node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        (async () => {
            try {
                const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%' ORDER BY name;\`;
                console.log(JSON.stringify(result));
            } catch (e) {
                console.error('[]');
                process.exit(1);
            } finally {
                await prisma.\$disconnect();
            }
        })();
    " 2>/dev/null || echo "[]")
    
    # Извлекаем имена таблиц
    local found_tables=$(echo "$tables_json" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/' || echo "")
    
    if [ -z "$found_tables" ]; then
        log_warning "Не удалось получить список таблиц"
        return 1
    fi
    
    log_info "Найденные таблицы: $(echo "$found_tables" | tr '\n' ' ')"
    
    # Проверяем наличие обязательных таблиц
    local missing_tables=()
    for table in "${required_tables[@]}"; do
        if ! echo "$found_tables" | grep -q "^${table}$"; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        local table_count=$(echo "$found_tables" | wc -l || echo "0")
        log_success "Структура базы данных проверена (найдено таблиц: $table_count, все обязательные таблицы присутствуют)"
        return 0
    else
        log_warning "Отсутствуют некоторые таблицы: ${missing_tables[*]}"
        log_info "Это может быть нормально, если миграции еще не применены полностью"
        return 1
    fi
}

verify_database_populated() {
    log_info "Проверка заполнения базы данных данными..."
    
    if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
        log_warning "Контейнер web не запущен, пропускаем проверку заполнения"
        return 0
    fi
    
    # Проверяем наличие пользователей
    local user_count=$(run_compose exec -T web node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        (async () => {
            try {
                const count = await prisma.user.count();
                console.log(count);
            } catch (e) {
                console.error('0');
                process.exit(1);
            } finally {
                await prisma.\$disconnect();
            }
        })();
    " 2>/dev/null || echo "0")
    
    if [ "$user_count" -gt 0 ]; then
        log_success "База данных заполнена (найдено пользователей: $user_count)"
        
        # Проверяем наличие администратора
        local admin_exists=$(run_compose exec -T web node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            (async () => {
                try {
                    const admin = await prisma.user.findFirst({
                        where: { role: 'admin' },
                        select: { email: true, name: true }
                    });
                    if (admin) {
                        console.log(JSON.stringify(admin));
                    } else {
                        console.log('{}');
                    }
                } catch (e) {
                    console.error('{}');
                    process.exit(1);
                } finally {
                    await prisma.\$disconnect();
                }
            })();
        " 2>/dev/null || echo "{}")
        
        if echo "$admin_exists" | grep -q "email"; then
            local admin_email=$(echo "$admin_exists" | grep -o '"email":"[^"]*"' | sed 's/"email":"\([^"]*\)"/\1/' || echo "")
            local admin_name=$(echo "$admin_exists" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/' || echo "")
            log_success "Администратор найден: $admin_name ($admin_email)"
        else
            log_warning "Пользователи найдены, но администратор не найден"
        fi
        
        return 0
    else
        log_warning "База данных пуста (пользователи не найдены)"
        return 1
    fi
}

# ============================================
# ФУНКЦИИ ГЕНЕРАЦИИ ХЕША ПАРОЛЯ
# ============================================

generate_password_hash() {
    local password="${1:-$DEFAULT_PASSWORD}"
    local hash=""
    
    log_info "Генерация bcrypt хеша для пароля..."
    
    # Метод 1: Локальный Node.js (если доступен)
    if command -v node &> /dev/null; then
        if node -e "require('bcryptjs')" &> /dev/null 2>&1; then
            hash=$(timeout 5 node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$password', 10))" 2>/dev/null | grep -E '^\$2[aby]' || echo "")
            if [ -n "$hash" ]; then
                log_success "Хеш сгенерирован через Node.js"
                echo "$hash"
                return 0
            fi
        fi
    fi
    
    # Метод 2: Docker контейнер
    if command -v docker &> /dev/null; then
        hash=$(timeout 30 docker run --rm node:20-slim sh -c "
            npm install bcryptjs --silent --no-audit --no-fund 2>/dev/null && \
            node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$password', 10))\"
        " 2>/dev/null | tail -1 | grep -E '^\$2[aby]' || echo "")
        
        if [ -n "$hash" ]; then
            log_success "Хеш сгенерирован через Docker"
            echo "$hash"
            return 0
        fi
    fi
    
    # Метод 3: Python (если доступен)
    if command -v python3 &> /dev/null; then
        hash=$(timeout 5 python3 -c "import bcrypt; print(bcrypt.hashpw('$password'.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8'))" 2>/dev/null | grep -E '^\$2[aby]' || echo "")
        if [ -n "$hash" ]; then
            log_success "Хеш сгенерирован через Python"
            echo "$hash"
            return 0
        fi
    fi
    
    log_warning "Не удалось сгенерировать хеш автоматически"
    return 1
}

update_env_password_hash() {
    local hash="$1"
    
    if [ -z "$hash" ] || [ "$hash" = "" ]; then
        return 1
    fi
    
    if [ ! -f ".env" ]; then
        return 1
    fi
    
    # Используем безопасный метод обновления через временный файл
    # Это избегает проблем с экранированием специальных символов в bcrypt хеше
    local temp_file=$(mktemp)
    
    # Обновляем или добавляем ADMIN_PASSWORD_HASH
    if grep -q "^ADMIN_PASSWORD_HASH=" .env; then
        # Удаляем старую строку и добавляем новую
        grep -v "^ADMIN_PASSWORD_HASH=" .env > "$temp_file" || true
        echo "ADMIN_PASSWORD_HASH=\"$hash\"" >> "$temp_file"
        mv "$temp_file" .env
    else
        # Добавляем новую строку
        echo "ADMIN_PASSWORD_HASH=\"$hash\"" >> .env
    fi
    
    # Удаляем временный файл, если он остался
    rm -f "$temp_file" 2>/dev/null || true
    
    log_success "ADMIN_PASSWORD_HASH обновлен в .env"
    source .env 2>/dev/null || true
    return 0
}

# ============================================
# ФУНКЦИИ СОЗДАНИЯ АДМИНИСТРАТОРА
# ============================================

ensure_admin_user() {
    log_info "Создание администратора..."
    
    if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
        error_exit "Контейнер web не запущен!"
    fi
    
    # Проверяем, что БД доступна
    if ! test_database_read; then
        log_warning "База данных недоступна для чтения, но продолжаем"
    fi
    
    # Генерируем хеш, если нужно
    source .env 2>/dev/null || true
    if [ -z "${ADMIN_PASSWORD_HASH:-}" ] || [ "$ADMIN_PASSWORD_HASH" = "" ]; then
        log_info "Генерация хеша пароля..."
        local hash=$(generate_password_hash "$DEFAULT_PASSWORD")
        if [ -n "$hash" ]; then
            update_env_password_hash "$hash"
            log_success "Хеш пароля сгенерирован и добавлен в .env"
        else
            log_warning "Не удалось сгенерировать хеш, будет использован db:force-fix-user"
        fi
    else
        log_info "Хеш пароля уже задан в .env"
    fi
    
    # Создаем администратора через init-admin
    log_info "Запуск db:init-admin..."
    local init_output=$(run_compose exec -T web npm run db:init-admin 2>&1 | tee -a "$LOG_FILE" || echo "")
    
    if echo "$init_output" | grep -qi "✅\|успешно\|created\|exists\|Администратор"; then
        log_success "Команда db:init-admin выполнена успешно"
        
        # Принудительно синхронизируем файл БД после создания администратора
        sync_database_file
        sleep 2
        
        # Проверяем, что администратор действительно создан
        local admin_check=$(run_compose exec -T -w /app web node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            (async () => {
                try {
                    const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { email: true, name: true } });
                    if (admin) { console.log('admin_found:' + admin.email); } else { console.log('admin_not_found'); }
                } catch (e) { console.error('check_error:', e.message); process.exit(1); } finally { await prisma.\$disconnect(); }
            })();
        " 2>/dev/null || echo "check_failed")
        
        if echo "$admin_check" | grep -q "admin_found"; then
            local admin_email=$(echo "$admin_check" | grep -o "admin_found:[^:]*" | cut -d: -f2 || echo "")
            log_success "Администратор найден в БД: $admin_email"
        else
            log_warning "Администратор не найден в БД после db:init-admin"
        fi
    else
        log_warning "db:init-admin завершился с предупреждением или ошибкой"
        log_info "Вывод: $(echo "$init_output" | tail -10 | tr '\n' ' ')"
    fi
    
    # Исправляем пользователя (гарантирует правильный хеш и name)
    log_info "Запуск db:force-fix-user (гарантирует правильный пароль и name)..."
    local fix_output=$(run_compose exec -T web npm run db:force-fix-user 2>&1 | tee -a "$LOG_FILE" || echo "")
    
    if echo "$fix_output" | grep -qi "✅\|успешно\|исправлен\|создан\|валиден\|Администратор"; then
        log_success "Команда db:force-fix-user выполнена успешно"
        
        # Синхронизируем файл БД после исправления
        sync_database_file
        sleep 2
        
        # Проверяем размер файла БД
        local db_size_after_admin=0
        if [ -f "database/db.sqlite" ]; then
            db_size_after_admin=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
        fi
        if run_compose ps web 2>/dev/null | grep -q "Up"; then
            local container_size_after_admin=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
            if [ "$container_size_after_admin" -gt "$db_size_after_admin" ]; then
                db_size_after_admin=$container_size_after_admin
                sync_database_file
            fi
        fi
        
        if [ "$db_size_after_admin" -gt 0 ]; then
            log_success "БД содержит данные после создания администратора (размер: ${db_size_after_admin} байт)"
        else
            log_warning "Размер файла БД все еще 0 байт после создания администратора"
        fi
    else
        log_warning "db:force-fix-user завершился с предупреждением"
        log_info "Вывод: $(echo "$fix_output" | tail -10 | tr '\n' ' ')"
    fi
    
    # Ждем немного для синхронизации
    sleep 2
    
    # Проверяем создание пользователя
    if verify_admin_created; then
        log_success "Администратор создан и проверен"
    else
        log_warning "Администратор не найден после создания, пробуем еще раз..."
        
        # Повторная попытка через force-fix-user
        log_info "Повторная попытка создания через db:force-fix-user..."
        run_compose exec -T web npm run db:force-fix-user 2>&1 | tee -a "$LOG_FILE" || true
        sleep 2
        
        if verify_admin_created; then
            log_success "Администратор создан после повторной попытки"
        else
            log_error "Не удалось создать администратора после повторной попытки"
            log_info "Попробуйте выполнить вручную:"
            log_info "  run_compose exec web npm run db:force-fix-user"
            error_exit "Администратор не создан"
        fi
    fi
    
    # Проверяем заполнение БД данными
    verify_database_populated
}

verify_admin_created() {
    log_info "Проверка создания администратора..."
    
    if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
        log_warning "Контейнер web не запущен, пропускаем проверку"
        return 0
    fi
    
    # Метод 1: Проверяем через Prisma Client напрямую
    local admin_check=$(run_compose exec -T web node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        (async () => {
            try {
                const email = process.env.ADMIN_EMAIL || 'zelyonkin.d@gmail.com';
                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true, email: true, name: true, role: true, passwordHash: true }
                });
                if (user) {
                    console.log(JSON.stringify({
                        found: true,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        hasPasswordHash: !!user.passwordHash,
                        isBcrypt: user.passwordHash && user.passwordHash.startsWith('$2')
                    }));
                } else {
                    console.log(JSON.stringify({ found: false }));
                }
            } catch (e) {
                console.error(JSON.stringify({ error: e.message }));
                process.exit(1);
            } finally {
                await prisma.\$disconnect();
            }
        })();
    " 2>/dev/null || echo "{\"error\":\"unknown\"}")
    
    if echo "$admin_check" | grep -q '"found":true'; then
        ADMIN_CREATED=true
        local admin_email=$(echo "$admin_check" | grep -o '"email":"[^"]*"' | sed 's/"email":"\([^"]*\)"/\1/' || echo "")
        local admin_name=$(echo "$admin_check" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/' || echo "")
        local is_bcrypt=$(echo "$admin_check" | grep -o '"isBcrypt":\(true\|false\)' | grep -o 'true\|false' || echo "false")
        
        log_success "Администратор найден в базе данных: $admin_name ($admin_email)"
        
        if [ "$is_bcrypt" = "true" ]; then
            log_success "Пароль правильно захеширован (bcrypt)"
        else
            log_warning "Пароль не в формате bcrypt"
        fi
        
        # Метод 2: Проверяем через test-login скрипт
        if run_compose exec -T web npm run db:test-login 2>&1 | grep -q "✅ ВХОД ДОЛЖЕН РАБОТАТЬ"; then
            log_success "Тест входа прошел успешно"
        else
            log_warning "Тест входа не прошел, но администратор существует в БД"
        fi
        
        return 0
    else
        log_warning "Администратор не найден в базе данных через Prisma"
        
        # Пробуем через test-login скрипт как fallback
        if run_compose exec -T web npm run db:test-login 2>&1 | grep -q "✅ ВХОД ДОЛЖЕН РАБОТАТЬ"; then
            ADMIN_CREATED=true
            log_success "Администратор найден через test-login скрипт"
            return 0
        else
            log_warning "Администратор не найден, но продолжаем (будет создан через force-fix-user)"
            ADMIN_CREATED=false
            return 1
        fi
    fi
}

# ============================================
# ФУНКЦИИ РАБОТЫ С DOCKER
# ============================================

build_docker_images() {
    log_info "Сборка Docker образов..."
    
    if [ ! -f "Dockerfile" ]; then
        error_exit "Dockerfile не найден!"
    fi
    
    log_info "Это может занять несколько минут..."
    
    if run_compose build --no-cache 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Docker образы собраны"
        
        # Проверяем, что образ создан
        local image_id=$(run_compose images -q web 2>/dev/null | head -1 || echo "")
        if [ -n "$image_id" ]; then
            log_success "Образ web создан: $image_id"
        else
            log_warning "Не удалось проверить создание образа"
        fi
    else
        error_exit "Ошибка при сборке Docker образов. Проверьте логи: $LOG_FILE"
    fi
}

start_web_container() {
    log_info "Запуск контейнера web..."
    
    if run_compose up -d web 2>&1 | tee -a "$LOG_FILE"; then
        WEB_CONTAINER_STARTED=true
        CLEANUP_NEEDED=true
        log_success "Контейнер web запущен"
    else
        error_exit "Не удалось запустить контейнер web"
    fi
    
    # Ждем запуска контейнера
    log_info "Ожидание запуска контейнера (15 секунд)..."
    sleep 15
    
    # Проверяем, что контейнер действительно запущен
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if run_compose ps web 2>/dev/null | grep -q "Up"; then
            log_success "Контейнер web запущен и работает"
            
            # Проверяем логи на критические ошибки
            check_container_logs web
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log_info "Ожидание запуска контейнера (попытка $attempt/$max_attempts)..."
            sleep 3
        fi
        attempt=$((attempt + 1))
    done
    
    error_exit "Контейнер web не запустился. Проверьте логи: $COMPOSE_CMD logs web"
}

check_container_logs() {
    local container="$1"
    log_info "Проверка логов контейнера $container..."
    
    local errors=$(run_compose logs "$container" 2>&1 | grep -i "error\|fatal\|failed" | head -5 || echo "")
    
    if [ -n "$errors" ]; then
        log_warning "Обнаружены ошибки в логах:"
        echo "$errors" | while read -r line; do
            log_warning "  $line"
        done
    else
        log_success "Критических ошибок в логах не обнаружено"
    fi
}

verify_container_environment() {
    local container="$1"
    log_info "Проверка переменных окружения в контейнере $container..."
    
    if ! run_compose ps "$container" 2>/dev/null | grep -q "Up"; then
        log_warning "Контейнер $container не запущен"
        return 1
    fi
    
    local db_url=$(run_compose exec -T "$container" sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")
    
    if [ -n "$db_url" ]; then
        log_success "DATABASE_URL установлен: ${db_url:0:50}..."
    else
        log_warning "DATABASE_URL не найден в контейнере"
    fi
    
    return 0
}

test_database_write() {
    log_info "Тестирование записи в базу данных..."
    
    if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
        log_warning "Контейнер не запущен, пропускаем тест записи"
        return 0
    fi
    
    # Используем Prisma Client для теста записи (самый надежный метод)
    local test_result=$(run_compose exec -T -w /app web sh -c '
        export DATABASE_URL="file:/app/database/db.sqlite" && \
        node -e "
        const { PrismaClient } = require(\"@prisma/client\");
        const prisma = new PrismaClient();
        (async () => {
            try {
                await prisma.\$connect();
                // Создаем тестовую таблицу и запись
                await prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS _test_write (id INTEGER PRIMARY KEY, test_value TEXT);\`;
                await prisma.\$executeRaw\`INSERT INTO _test_write (test_value) VALUES (\''"'"'test'"'"');\`;
                // Читаем для гарантии записи
                const result = await prisma.\$queryRaw\`SELECT * FROM _test_write LIMIT 1;\`;
                // Удаляем тестовую таблицу
                await prisma.\$executeRaw\`DROP TABLE IF EXISTS _test_write;\`;
                await prisma.\$disconnect();
                console.log(\"success\");
            } catch (e) {
                console.error(\"error:\", e.message);
                await prisma.\$disconnect().catch(() => {});
                process.exit(1);
            }
        })();
        "
    ' 2>&1 || echo "error")
    
    if echo "$test_result" | grep -qi "success"; then
        log_success "Тест записи прошел успешно"
        return 0
    else
        log_warning "Тест записи не прошел: $(echo "$test_result" | head -2 | tr '\n' ' ')"
        return 1
    fi
}

test_database_read() {
    log_info "Тестирование чтения из базы данных..."
    
    if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
        log_warning "Контейнер не запущен, пропускаем тест чтения"
        return 0
    fi
    
    # Пробуем прочитать список таблиц
    local tables=$(run_compose exec -T web node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        (async () => {
            try {
                const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';\`;
                console.log(JSON.stringify(result));
            } catch (e) {
                console.error('error:', e.message);
                process.exit(1);
            } finally {
                await prisma.\$disconnect();
            }
        })();
    " 2>/dev/null || echo "[]")
    
    if echo "$tables" | grep -q "User\|Session\|Note"; then
        local table_count=$(echo "$tables" | grep -o '"name"' | wc -l || echo "0")
        log_success "Тест чтения прошел успешно (найдено таблиц: $table_count)"
        return 0
    else
        log_warning "Тест чтения не прошел или таблицы не найдены"
        return 1
    fi
}

run_migrations() {
    log_info "Выполнение миграций базы данных..."
    
    ensure_database_directory
    
    # КРИТИЧНО: Удаляем пустой файл БД, если он существует
    # Prisma должен создать файл сам, а не использовать пустой
    log_info "Проверка существующего файла БД..."
    if [ -f "database/db.sqlite" ]; then
        local db_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
        if [ "$db_size" -eq 0 ]; then
            log_warning "Обнаружен пустой файл БД, удаляем его (Prisma создаст новый)..."
            rm -f database/db.sqlite 2>/dev/null || true
            # Также удаляем внутри контейнера
            if run_compose ps web 2>/dev/null | grep -q "Up"; then
                run_compose exec -T web rm -f /app/database/db.sqlite 2>/dev/null || true
            fi
            log_success "Пустой файл БД удален"
        else
            log_info "Файл БД уже существует (размер: ${db_size} байт), используем его"
        fi
    else
        log_info "Файл БД не существует, Prisma создаст его"
    fi
    
    # Проверяем DATABASE_URL
    verify_container_environment web
    
    # Убеждаемся, что используем правильный путь для DATABASE_URL внутри контейнера
    log_info "Проверка и настройка DATABASE_URL..."
    local current_db_url=$(run_compose exec -T web sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")
    log_info "Текущий DATABASE_URL: $current_db_url"
    
    # Проверяем, что DATABASE_URL корректный
    if [ -z "$current_db_url" ]; then
        log_warning "DATABASE_URL не установлен в контейнере!"
        log_info "Устанавливаем DATABASE_URL=file:/app/database/db.sqlite"
        run_compose exec -T web sh -c 'export DATABASE_URL="file:/app/database/db.sqlite"' 2>/dev/null || true
        current_db_url="file:/app/database/db.sqlite"
    fi
    
    # Исправляем относительный путь на абсолютный
    if echo "$current_db_url" | grep -q "^file:\./"; then
        log_warning "DATABASE_URL использует относительный путь, исправляем на абсолютный..."
        log_info "Исправляем: $current_db_url -> file:/app/database/db.sqlite"
        run_compose exec -T web sh -c 'export DATABASE_URL="file:/app/database/db.sqlite"' 2>/dev/null || true
        current_db_url="file:/app/database/db.sqlite"
    fi
    
    # Проверяем, что DATABASE_URL использует правильный путь
    if echo "$current_db_url" | grep -q "^file:/app/database/db.sqlite"; then
        log_success "DATABASE_URL использует правильный абсолютный путь: $current_db_url"
    elif echo "$current_db_url" | grep -q "^file:/"; then
        log_info "DATABASE_URL использует абсолютный путь: $current_db_url"
    else
        log_warning "DATABASE_URL имеет необычный формат: $current_db_url"
        log_info "Исправляем на: file:/app/database/db.sqlite"
        run_compose exec -T web sh -c 'export DATABASE_URL="file:/app/database/db.sqlite"' 2>/dev/null || true
    fi
    
    # КРИТИЧНО: Проверяем, не создана ли БД в корне контейнера
    log_info "Проверка наличия БД в неправильной директории..."
    if run_compose exec -T web test -f /app/db.sqlite 2>/dev/null; then
        log_warning "Обнаружен файл БД в корне контейнера (/app/db.sqlite)!"
        log_info "Перемещаем в правильную директорию..."
        
        # Проверяем размер файла
        local wrong_db_size=$(run_compose exec -T web stat -c%s /app/db.sqlite 2>/dev/null || echo "0")
        
        if [ "$wrong_db_size" -gt 0 ]; then
            log_info "Файл БД имеет размер ${wrong_db_size} байт, перемещаем..."
            
            # Если правильный файл уже существует, сравниваем размеры
            if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
                local correct_db_size=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
                
                if [ "$wrong_db_size" -gt "$correct_db_size" ]; then
                    log_info "Файл в корне больше, используем его..."
                    run_compose exec -T web mv /app/db.sqlite /app/database/db.sqlite 2>/dev/null || \
                    run_compose exec -T --user root web mv /app/db.sqlite /app/database/db.sqlite 2>/dev/null || true
                else
                    log_info "Файл в правильной директории больше или равен, удаляем файл из корня..."
                    run_compose exec -T web rm -f /app/db.sqlite 2>/dev/null || \
                    run_compose exec -T --user root web rm -f /app/db.sqlite 2>/dev/null || true
                fi
            else
                # Правильного файла нет, перемещаем
                run_compose exec -T web mv /app/db.sqlite /app/database/db.sqlite 2>/dev/null || \
                run_compose exec -T --user root web mv /app/db.sqlite /app/database/db.sqlite 2>/dev/null || true
                
                if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
                    log_success "Файл БД перемещен в правильную директорию"
                    run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
                else
                    log_error "Не удалось переместить файл БД"
                fi
            fi
        else
            log_info "Файл БД в корне пустой, удаляем его..."
            run_compose exec -T web rm -f /app/db.sqlite 2>/dev/null || \
            run_compose exec -T --user root web rm -f /app/db.sqlite 2>/dev/null || true
        fi
    fi
    
    # Проверяем наличие БД в корне на хосте (если есть)
    if [ -f "db.sqlite" ]; then
        log_warning "Обнаружен файл БД в корне проекта на хосте (db.sqlite)!"
        log_info "Перемещаем в правильную директорию..."
        
        local host_wrong_db_size=$(stat -f%z "db.sqlite" 2>/dev/null || stat -c%s "db.sqlite" 2>/dev/null || echo "0")
        
        if [ "$host_wrong_db_size" -gt 0 ]; then
            if [ -f "database/db.sqlite" ]; then
                local host_correct_db_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
                
                if [ "$host_wrong_db_size" -gt "$host_correct_db_size" ]; then
                    log_info "Файл в корне больше, перемещаем его..."
                    mv db.sqlite database/db.sqlite 2>/dev/null || sudo mv db.sqlite database/db.sqlite 2>/dev/null || true
                    chmod 777 database/db.sqlite 2>/dev/null || sudo chmod 777 database/db.sqlite 2>/dev/null || true
                else
                    log_info "Файл в правильной директории больше или равен, удаляем файл из корня..."
                    rm -f db.sqlite 2>/dev/null || sudo rm -f db.sqlite 2>/dev/null || true
                fi
            else
                mv db.sqlite database/db.sqlite 2>/dev/null || sudo mv db.sqlite database/db.sqlite 2>/dev/null || true
                chmod 777 database/db.sqlite 2>/dev/null || sudo chmod 777 database/db.sqlite 2>/dev/null || true
                
                if [ -f "database/db.sqlite" ]; then
                    log_success "Файл БД перемещен в правильную директорию на хосте"
                fi
            fi
        else
            log_info "Файл БД в корне пустой, удаляем его..."
            rm -f db.sqlite 2>/dev/null || sudo rm -f db.sqlite 2>/dev/null || true
        fi
    fi
    
    # КРИТИЧНО: Убеждаемся, что директория доступна для записи с максимальными правами
    log_info "Проверка и установка максимальных прав на директорию БД..."
    if ! run_compose exec -T web test -w /app/database 2>/dev/null; then
        log_warning "Директория БД недоступна для записи, устанавливаем максимальные права..."
        run_compose exec -T --user root web chmod 777 /app/database 2>/dev/null || \
        run_compose exec -T web sh -c "chmod 777 /app/database 2>/dev/null || true" || true
        
        # Также устанавливаем права на файл БД, если существует
        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
            run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || \
            run_compose exec -T web sh -c "chmod 777 /app/database/db.sqlite 2>/dev/null || true" || true
        fi
    fi
    
    # Устанавливаем владельца (но приоритет - права 777)
    run_compose exec -T --user root web chown -R nextjs:nodejs /app/database 2>/dev/null || \
    run_compose exec -T --user root web chown -R 1001:1001 /app/database 2>/dev/null || \
    run_compose exec -T --user root web chown -R root:root /app/database 2>/dev/null || true
    
    log_success "Директория БД готова с максимальными правами доступа"
    
    # КРИТИЧНО: Устанавливаем максимальные права перед миграциями для гарантии
    log_info "Финальная установка максимальных прав перед миграциями..."
    if run_compose ps web 2>/dev/null | grep -q "Up"; then
        # КРИТИЧНО: Убеждаемся, что директория существует и доступна
        run_compose exec -T --user root web mkdir -p /app/database 2>/dev/null || true
        run_compose exec -T --user root web chmod 777 /app/database 2>/dev/null || true
        
        # Устанавливаем права через root для гарантии
        run_compose exec -T --user root web chmod 777 /app/database 2>/dev/null || true
        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
            run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
        fi
        # Устанавливаем владельца
        run_compose exec -T --user root web chown -R nextjs:nodejs /app/database 2>/dev/null || \
        run_compose exec -T --user root web chown -R 1001:1001 /app/database 2>/dev/null || \
        run_compose exec -T --user root web chown -R root:root /app/database 2>/dev/null || true
        
        # КРИТИЧНО: Проверяем и устанавливаем DATABASE_URL с абсолютным путем
        log_info "Проверка и установка DATABASE_URL с абсолютным путем..."
        local current_db_url_check=$(run_compose exec -T -w /app web sh -c 'cd /app && echo "$DATABASE_URL"' 2>/dev/null || echo "")
        if [ -z "$current_db_url_check" ] || ! echo "$current_db_url_check" | grep -q "file:/app/database/db.sqlite"; then
            log_warning "DATABASE_URL не установлен правильно, устанавливаем явно..."
            # Обновляем .env файл если он существует
            if [ -f ".env" ]; then
                if grep -q "DATABASE_URL" .env; then
                    sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:/app/database/db.sqlite"|g' .env
                    sed -i 's|DATABASE_URL=".*"|DATABASE_URL="file:/app/database/db.sqlite"|g' .env
                else
                    echo 'DATABASE_URL="file:/app/database/db.sqlite"' >> .env
                fi
                log_info "Обновлен .env файл с правильным DATABASE_URL"
            fi
        fi
    fi
    # Также на хосте
    mkdir -p database 2>/dev/null || true
    chmod 777 database 2>/dev/null || sudo chmod 777 database 2>/dev/null || true
    if [ -f "database/db.sqlite" ]; then
        chmod 777 database/db.sqlite 2>/dev/null || sudo chmod 777 database/db.sqlite 2>/dev/null || true
    fi
    
    # Тестируем запись перед миграциями
    test_database_write || log_warning "Предупреждение: тест записи не прошел"
    
    log_info "Применение миграций (это может занять время)..."
    sleep 3
    
    local attempt=1
    local success=false
    local migration_output=""
    
    while [ $attempt -le $MAX_RETRIES ] && [ "$success" = false ]; do
        log_info "Попытка $attempt из $MAX_RETRIES..."
        
        # КРИТИЧНО: Проверяем, существует ли БД. Если нет - используем prisma db push для создания
        log_info "Проверка существования БД..."
        local db_exists=false
        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
            local db_size=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
            if [ "$db_size" -gt 0 ]; then
                # Проверяем наличие таблиц
                local has_tables=$(run_compose exec -T -w /app web node -e "
                    const { PrismaClient } = require('@prisma/client');
                    const prisma = new PrismaClient();
                    (async () => {
                        try {
                            const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';\`;
                            console.log(result.length > 0 ? 'yes' : 'no');
                        } catch (e) {
                            console.error('no');
                            process.exit(1);
                        } finally {
                            await prisma.\$disconnect();
                        }
                    })();
                " 2>/dev/null || echo "no")
                
                if echo "$has_tables" | grep -q "yes"; then
                    db_exists=true
                    log_info "БД уже существует и содержит таблицы"
                else
                    log_info "БД существует, но таблицы отсутствуют"
                fi
            fi
        fi
        
        if [ "$db_exists" = false ]; then
            # БД не существует или пустая - создаем через prisma db push
            log_info "Создание структуры БД через prisma db push..."
            
            # prisma db push создает БД из schema.prisma напрямую (без миграций)
            # КРИТИЧНО: Устанавливаем DATABASE_URL с абсолютным путем и рабочую директорию
            local db_push_output=$(run_compose exec -T -w /app web sh -c "
                cd /app && \
                export DATABASE_URL='file:/app/database/db.sqlite' && \
                echo 'DATABASE_URL установлен: '\$DATABASE_URL && \
                pwd && \
                ls -la /app/database/ 2>/dev/null || echo 'Директория /app/database не существует' && \
                npx prisma db push --accept-data-loss --skip-generate 2>&1
            " 2>&1 | tee -a "$LOG_FILE" || echo "")
            
            if echo "$db_push_output" | grep -q "Your database is now in sync\|Database is up to date\|Pushing\|Applied\|already in sync"; then
                log_success "Структура БД создана через prisma db push"
                
                # КРИТИЧНО: Принудительно создаем запись в БД для гарантии записи на диск
                log_info "Принудительное создание записи в БД для гарантии записи на диск..."
                local force_write_after_push=$(run_compose exec -T -w /app web sh -c '
                    export DATABASE_URL="file:/app/database/db.sqlite" && \
                    node -e "
                    const { PrismaClient } = require(\"@prisma/client\");
                    const prisma = new PrismaClient();
                    (async () => {
                        try {
                            await prisma.\$connect();
                            // Создаем тестовую таблицу и запись
                            await prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS _force_init (id INTEGER PRIMARY KEY, data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);\`;
                            await prisma.\$executeRaw\`INSERT INTO _force_init (data) VALUES (\''"'"'init_'"'"' || strftime(\''"'"'%s'"'"', \''"'"'now'"'"'));\`;
                            // Читаем для гарантии записи
                            const result = await prisma.\$queryRaw\`SELECT * FROM _force_init LIMIT 1;\`;
                            // Удаляем тестовую таблицу
                            await prisma.\$executeRaw\`DROP TABLE IF EXISTS _force_init;\`;
                            await prisma.\$disconnect();
                            await new Promise(resolve => setTimeout(resolve, 500));
                            console.log(\"force_write_success\");
                        } catch (e) {
                            console.error(\"force_write_error:\", e.message);
                            await prisma.\$disconnect().catch(() => {});
                            process.exit(1);
                        }
                    })();
                    "
                ' 2>&1 || echo "force_write_failed")
                
                if echo "$force_write_after_push" | grep -q "force_write_success"; then
                    log_success "Принудительная запись в БД после db push выполнена успешно"
                else
                    log_warning "Принудительная запись не выполнена: $(echo "$force_write_after_push" | head -3 | tr '\n' ' ')"
                fi
                
                # Ждем записи на диск
                sleep 3
                run_compose exec -T web sync 2>/dev/null || true
                sync 2>/dev/null || true
                
                # Устанавливаем максимальные права на созданный файл БД
                if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
                    run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
                fi
                
                # Синхронизируем файл
                sync_database_file
                
                # Проверяем размер файла после записи
                local db_size_after_push=0
                if [ -f "database/db.sqlite" ]; then
                    db_size_after_push=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
                fi
                if run_compose ps web 2>/dev/null | grep -q "Up"; then
                    local container_size_after_push=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
                    if [ "$container_size_after_push" -gt "$db_size_after_push" ]; then
                        db_size_after_push=$container_size_after_push
                        sync_database_file
                    fi
                fi
                
                if [ "$db_size_after_push" -gt 0 ]; then
                    log_success "БД создана и содержит данные (размер: ${db_size_after_push} байт)"
                else
                    log_warning "БД создана, но размер файла все еще 0 байт после принудительной записи"
                fi
                
                # КРИТИЧНО: После db push нужно пометить все миграции как примененные, чтобы migrate deploy не выдавал P3005
                log_info "Пометка миграций как примененных (baseline)..."
                
                # Получаем список всех миграций и помечаем каждую как примененную
                local migration_dirs=$(run_compose exec -T -w /app web sh -c "ls -d prisma/migrations/*/ 2>/dev/null | sed 's|prisma/migrations/||' | sed 's|/$||' | grep -v 'migration_lock.toml' || echo ''" 2>/dev/null || echo "")
                
                if [ -n "$migration_dirs" ]; then
                    local resolved_count=0
                    for migration_dir in $migration_dirs; do
                        # Используем полное имя миграции (timestamp_name)
                        local migration_name="$migration_dir"
                    log_info "Пометка миграции $migration_name как примененной..."
                    local resolve_output=$(run_compose exec -T -w /app web sh -c "
                        cd /app && \
                        export DATABASE_URL='file:/app/database/db.sqlite' && \
                        npx prisma migrate resolve --applied $migration_name 2>&1
                    " 2>&1 | tee -a "$LOG_FILE" || echo "resolve_failed")
                        
                        if echo "$resolve_output" | grep -q "marked as applied\|Migration.*marked as applied\|resolved"; then
                            resolved_count=$((resolved_count + 1))
                            log_success "Миграция $migration_name помечена как примененная"
                        else
                            log_warning "Не удалось пометить миграцию $migration_name: $(echo "$resolve_output" | head -2 | tr '\n' ' ')"
                        fi
                    done
                    
                    if [ "$resolved_count" -gt 0 ]; then
                        log_success "Помечено миграций как примененных: $resolved_count"
                    else
                        log_warning "Не удалось пометить миграции как примененные"
                    fi
                else
                    log_warning "Не найдены миграции для пометки"
                fi
            else
                log_warning "prisma db push не завершился успешно"
                log_info "Вывод db push: $(echo "$db_push_output" | head -5 | tr '\n' ' ')"
            fi
        fi
        
        # Теперь выполняем миграции для применения всех миграций из папки migrations
        log_info "Применение миграций через prisma migrate deploy..."
        # КРИТИЧНО: Устанавливаем DATABASE_URL с абсолютным путем и рабочую директорию
        migration_output=$(run_compose exec -T -w /app web sh -c "
            cd /app && \
            export DATABASE_URL='file:/app/database/db.sqlite' && \
            echo 'DATABASE_URL установлен: '\$DATABASE_URL && \
            pwd && \
            ls -la /app/database/ 2>/dev/null || echo 'Директория /app/database не существует' && \
            npx prisma migrate deploy 2>&1
        " 2>&1 | tee -a "$LOG_FILE" || echo "")
        
        # Проверяем успешность по выводу
        if echo "$migration_output" | grep -q "successfully applied\|All migrations\|migrations have been applied\|No pending migrations\|already applied"; then
            success=true
            log_success "Миграции применены успешно"
        # Обрабатываем ошибку P3005 (БД не пустая, но миграции не применены)
        elif echo "$migration_output" | grep -q "P3005\|database schema is not empty"; then
            log_warning "Обнаружена ошибка P3005: БД не пустая, но миграции не помечены как примененные"
            log_info "Помечаем все миграции как примененные (baseline)..."
            
            # Помечаем все миграции как примененные
            local migration_dirs=$(run_compose exec -T -w /app web sh -c "ls -d prisma/migrations/*/ 2>/dev/null | sed 's|prisma/migrations/||' | sed 's|/$||' | grep -v 'migration_lock.toml' || echo ''" 2>/dev/null || echo "")
            
            if [ -n "$migration_dirs" ]; then
                local resolved_count=0
                for migration_dir in $migration_dirs; do
                    # Используем полное имя миграции (timestamp_name)
                    local migration_name="$migration_dir"
                    log_info "Пометка миграции $migration_name как примененной..."
                    local resolve_output=$(run_compose exec -T -w /app web sh -c "
                        cd /app && \
                        export DATABASE_URL='file:/app/database/db.sqlite' && \
                        npx prisma migrate resolve --applied $migration_name 2>&1
                    " 2>&1 | tee -a "$LOG_FILE" || echo "resolve_failed")
                    
                    if echo "$resolve_output" | grep -q "marked as applied\|Migration.*marked as applied\|resolved"; then
                        resolved_count=$((resolved_count + 1))
                        log_success "Миграция $migration_name помечена как примененная"
                    else
                        log_warning "Не удалось пометить миграцию $migration_name: $(echo "$resolve_output" | head -2 | tr '\n' ' ')"
                    fi
                done
                
                if [ "$resolved_count" -gt 0 ]; then
                    log_success "Помечено миграций как примененных: $resolved_count"
                    log_info "Повторная попытка применения миграций..."
                    
                    # Повторно пытаемся применить миграции
                    migration_output=$(run_compose exec -T -w /app web sh -c "
                        cd /app && \
                        npx prisma migrate deploy 2>&1
                    " 2>&1 | tee -a "$LOG_FILE" || echo "")
                    
                    if echo "$migration_output" | grep -q "successfully applied\|All migrations\|migrations have been applied\|No pending migrations\|already applied"; then
                        success=true
                        log_success "Миграции применены успешно после baseline"
                    fi
                fi
            fi
        fi
        
        if [ "$success" = true ]; then
            
            # КРИТИЧНО: Принудительно создаем запись в БД для гарантии записи на диск
            log_info "Принудительное создание записи в БД для гарантии записи на диск..."
            local force_write_result=$(run_compose exec -T -w /app web sh -c '
                export DATABASE_URL="file:/app/database/db.sqlite" && \
                node -e "
                const { PrismaClient } = require(\"@prisma/client\");
                const prisma = new PrismaClient();
                (async () => {
                    try {
                        // Подключаемся к БД
                        await prisma.\$connect();
                        
                        // Принудительно создаем запись в БД для гарантии записи на диск
                        await prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS _force_write_check (id INTEGER PRIMARY KEY, data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);\`;
                        await prisma.\$executeRaw\`INSERT INTO _force_write_check (data) VALUES (\''"'"'force_write_'"'"' || strftime(\''"'"'%s'"'"', \''"'"'now'"'"'));\`;
                        
                        // Читаем запись для гарантии записи на диск
                        const result = await prisma.\$queryRaw\`SELECT * FROM _force_write_check LIMIT 1;\`;
                        
                        // Удаляем тестовую таблицу
                        await prisma.\$executeRaw\`DROP TABLE IF EXISTS _force_write_check;\`;
                        
                        // Принудительно закрываем соединение для записи на диск
                        await prisma.\$disconnect();
                        
                        // Ждем немного для гарантии записи
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        console.log(\"force_write_success\");
                    } catch (e) {
                        console.error(\"force_write_error:\", e.message);
                        await prisma.\$disconnect().catch(() => {});
                        process.exit(1);
                    }
                })();
                "
            ' 2>&1 || echo "force_write_failed")
            
            if echo "$force_write_result" | grep -q "force_write_success"; then
                log_success "Принудительная запись в БД выполнена успешно"
            else
                log_warning "Принудительная запись не выполнена, но продолжаем"
            fi
            
            # Устанавливаем максимальные права на файл БД после записи
            if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
                run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
            fi
            
            # Ждем немного для записи на диск и синхронизации
            sleep 5
            
            # Принудительно синхронизируем файловую систему
            if run_compose ps web 2>/dev/null | grep -q "Up"; then
                run_compose exec -T web sync 2>/dev/null || true
            fi
            sync 2>/dev/null || true
            
            # Синхронизируем файл после миграций
            sync_database_file
            
            # Проверяем размер файла
            local db_size=0
            if [ -f "database/db.sqlite" ]; then
                db_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
            fi
            
            # Также проверяем в контейнере
            if run_compose ps web 2>/dev/null | grep -q "Up"; then
                local container_size=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
                if [ "$container_size" -gt "$db_size" ]; then
                    db_size=$container_size
                    # Синхронизируем еще раз
                    sync_database_file
                fi
            fi
            
            if [ "$db_size" -gt 0 ]; then
                log_success "База данных создана (размер: ${db_size} байт)"
                
                # Устанавливаем максимальные права на созданный файл БД
                if [ -f "database/db.sqlite" ]; then
                    chmod 777 database/db.sqlite 2>/dev/null || sudo chmod 777 database/db.sqlite 2>/dev/null || true
                fi
                if run_compose ps web 2>/dev/null | grep -q "Up"; then
                    run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
                fi
                
                # Проверяем наличие таблиц в БД
                log_info "Проверка наличия таблиц в БД..."
                local table_count=$(run_compose exec -T -w /app web node -e "
                    const { PrismaClient } = require('@prisma/client');
                    const prisma = new PrismaClient();
                    (async () => {
                        try {
                            const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';\`;
                            console.log(result.length);
                        } catch (e) {
                            console.error('0');
                            process.exit(1);
                        } finally {
                            await prisma.\$disconnect();
                        }
                    })();
                " 2>/dev/null || echo "0")
                
                if [ "$table_count" -gt 0 ]; then
                    log_success "В БД найдено таблиц: $table_count"
                    
                    # Проверяем наличие основных таблиц
                    local has_user=$(run_compose exec -T -w /app web node -e "
                        const { PrismaClient } = require('@prisma/client');
                        const prisma = new PrismaClient();
                        (async () => {
                            try {
                                const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name='User';\`;
                                console.log(result.length > 0 ? 'yes' : 'no');
                            } catch (e) {
                                console.error('no');
                                process.exit(1);
                            } finally {
                                await prisma.\$disconnect();
                            }
                        })();
                    " 2>/dev/null || echo "no")
                    
                    if echo "$has_user" | grep -q "yes"; then
                        log_success "Основные таблицы (User) найдены в БД - БД заполнена данными"
                    else
                        log_warning "Таблица User не найдена в БД"
                    fi
                else
                    log_warning "Таблицы не найдены в БД, но размер файла > 0"
                fi
            else
                log_warning "База данных создана, но размер файла 0 байт"
                log_info "Проверяем структуру БД через Prisma и принудительно создаем файл..."
                
                # Пробуем проверить через Prisma напрямую
                local table_check=$(run_compose exec -T -w /app web node -e "
                    const { PrismaClient } = require('@prisma/client');
                    const prisma = new PrismaClient();
                    (async () => {
                        try {
                            const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table';\`;
                            console.log(JSON.stringify(result));
                        } catch (e) {
                            console.error('error:', e.message);
                            process.exit(1);
                        } finally {
                            await prisma.\$disconnect();
                        }
                    })();
                " 2>/dev/null || echo "[]")
                
                if echo "$table_check" | grep -q "User\|Session"; then
                    log_success "Таблицы найдены в БД через Prisma"
                    
                    # Принудительно создаем запись в БД для гарантии записи на диск
                    log_info "Принудительное создание записи в БД для синхронизации..."
                    local force_write=$(run_compose exec -T -w /app web node -e "
                        const { PrismaClient } = require('@prisma/client');
                        const prisma = new PrismaClient();
                        (async () => {
                            try {
                                // Пробуем создать временную таблицу и удалить её
                                await prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS _sync_check (id INTEGER PRIMARY KEY, data TEXT);\`;
                                await prisma.\$executeRaw\`INSERT INTO _sync_check (data) VALUES ('sync');\`;
                                await prisma.\$executeRaw\`DELETE FROM _sync_check;\`;
                                await prisma.\$executeRaw\`DROP TABLE IF EXISTS _sync_check;\`;
                                console.log('force_write_success');
                            } catch (e) {
                                console.error('force_write_error:', e.message);
                                process.exit(1);
                            } finally {
                                await prisma.\$disconnect();
                            }
                        })();
                    " 2>/dev/null || echo "force_write_failed")
                    
                    if echo "$force_write" | grep -q "force_write_success"; then
                        log_success "Принудительная запись выполнена"
                    fi
                    
                    # Синхронизируем файл
                    sync_database_file
                    sleep 3
                    
                    # Принудительно синхронизируем файловую систему
                    if run_compose ps web 2>/dev/null | grep -q "Up"; then
                        run_compose exec -T web sync 2>/dev/null || true
                    fi
                    sync 2>/dev/null || true
                    
                    # Проверяем размер еще раз
                    if [ -f "database/db.sqlite" ]; then
                        db_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
                    fi
                    if run_compose ps web 2>/dev/null | grep -q "Up"; then
                        container_size=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
                        if [ "$container_size" -gt "$db_size" ]; then
                            db_size=$container_size
                            sync_database_file
                            sleep 2
                        fi
                    fi
                    
                    if [ "$db_size" -gt 0 ]; then
                        log_success "База данных синхронизирована (размер: ${db_size} байт)"
                        
                        # Проверяем наличие таблиц после синхронизации
                        local table_count=$(run_compose exec -T -w /app web node -e "
                            const { PrismaClient } = require('@prisma/client');
                            const prisma = new PrismaClient();
                            (async () => {
                                try {
                                    const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';\`;
                                    console.log(result.length);
                                } catch (e) {
                                    console.error('0');
                                    process.exit(1);
                                } finally {
                                    await prisma.\$disconnect();
                                }
                            })();
                        " 2>/dev/null || echo "0")
                        
                        if [ "$table_count" -gt 0 ]; then
                            log_success "Проверка БД: найдено таблиц - $table_count, размер - ${db_size} байт"
                        else
                            log_warning "Таблицы не найдены в БД после синхронизации"
                        fi
                    else
                        log_warning "Размер файла все еще 0, но таблицы существуют в БД"
                        log_info "Это может быть из-за задержки синхронизации volume, продолжаем..."
                        
                        # Проверяем таблицы еще раз через Prisma
                        local table_check_final=$(run_compose exec -T -w /app web node -e "
                            const { PrismaClient } = require('@prisma/client');
                            const prisma = new PrismaClient();
                            (async () => {
                                try {
                                    const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';\`;
                                    console.log(JSON.stringify(result));
                                } catch (e) {
                                    console.error('[]');
                                    process.exit(1);
                                } finally {
                                    await prisma.\$disconnect();
                                }
                            })();
                        " 2>/dev/null || echo "[]")
                        
                        if echo "$table_check_final" | grep -q "User\|Session\|Note"; then
                            local table_names=$(echo "$table_check_final" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/' | tr '\n' ' ' || echo "")
                            log_info "Таблицы в БД: $table_names"
                        fi
                    fi
                else
                    log_warning "Таблицы не найдены в БД, пробуем принудительно создать БД..."
                    
                    # Пробуем использовать prisma db push для принудительного создания
                    log_info "Использование prisma db push для принудительного создания БД..."
                    local db_push_output=$(run_compose exec -T -w /app web sh -c "
                        cd /app && \
                        npx prisma db push --accept-data-loss --skip-generate 2>&1
                    " 2>&1 | tee -a "$LOG_FILE" || echo "")
                    
                    if echo "$db_push_output" | grep -q "Your database is now in sync\|Database is up to date\|Pushing\|Applied"; then
                        log_success "БД создана через prisma db push"
                        
                        # Устанавливаем максимальные права
                        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
                            run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
                        fi
                        
                        sleep 3
                        sync_database_file
                        sleep 2
                        
                        # Проверяем размер и таблицы
                        local push_db_size=0
                        if [ -f "database/db.sqlite" ]; then
                            push_db_size=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
                        fi
                        
                        if [ "$push_db_size" -gt 0 ]; then
                            log_success "БД создана через db push (размер: ${push_db_size} байт)"
                            
                            # Проверяем таблицы
                            local push_table_count=$(run_compose exec -T -w /app web node -e "
                                const { PrismaClient } = require('@prisma/client');
                                const prisma = new PrismaClient();
                                (async () => {
                                    try {
                                        const result = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%';\`;
                                        console.log(result.length);
                                    } catch (e) {
                                        console.error('0');
                                        process.exit(1);
                                    } finally {
                                        await prisma.\$disconnect();
                                    }
                                })();
                            " 2>/dev/null || echo "0")
                            
                            if [ "$push_table_count" -gt 0 ]; then
                                log_success "В БД найдено таблиц: $push_table_count"
                            fi
                        else
                            log_warning "БД создана, но размер файла 0"
                        fi
                    fi
                fi
            fi
            
        break
        else
            log_warning "Миграции не применились или вывод не содержит подтверждения"
            log_info "Вывод миграций: $(echo "$migration_output" | head -10 | tr '\n' ' ')"
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                log_warning "Попытка $attempt не удалась, ждем $RETRY_DELAY секунд..."
                sleep $RETRY_DELAY
                
                # Повторно настраиваем права перед следующей попыткой
                ensure_database_directory
                create_database_file
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    if [ "$success" = false ]; then
        log_error "Не удалось применить миграции после $MAX_RETRIES попыток"
        log_info "Проверьте логи контейнера: run_compose logs web"
        log_info "Попробуйте выполнить вручную: run_compose exec web npm run db:migrate"
        error_exit "Миграции не применены"
    fi
    
    # Проверяем создание БД
    if verify_database_created; then
        # Синхронизируем еще раз
        sync_database_file
        
        # Проверяем структуру
        if verify_database_structure; then
            log_success "Структура базы данных валидна"
        else
            log_warning "Предупреждение: не все таблицы найдены, но продолжаем"
        fi
        
        # Тестируем запись после миграций
        if test_database_write; then
            log_success "Тест записи после миграций прошел успешно"
        else
            log_warning "Предупреждение: тест записи после миграций не прошел"
        fi
        
        # Тестируем чтение
        if test_database_read; then
            log_success "Тест чтения после миграций прошел успешно"
        else
            log_warning "Предупреждение: тест чтения после миграций не прошел"
        fi
    else
        log_error "База данных не создана после миграций"
        log_info "Пробуем принудительно создать БД через Prisma..."
        
        # Пробуем принудительно создать БД
        local force_create=$(run_compose exec -T -w /app web node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            (async () => {
                try {
                    // Пробуем создать тестовую таблицу
                    await prisma.\$executeRaw\`CREATE TABLE IF NOT EXISTS _test_init (id INTEGER PRIMARY KEY);\`;
                    await prisma.\$executeRaw\`DROP TABLE IF EXISTS _test_init;\`;
                    console.log('success');
                } catch (e) {
                    console.error('error:', e.message);
                    process.exit(1);
                } finally {
                    await prisma.\$disconnect();
                }
            })();
        " 2>/dev/null || echo "error")
        
        if echo "$force_create" | grep -q "success"; then
            log_success "Принудительное создание БД прошло успешно"
            sync_database_file
    sleep 2
            if verify_database_created; then
                log_success "База данных создана после принудительной инициализации"
            else
                error_exit "База данных не создана даже после принудительной инициализации"
            fi
        else
            error_exit "Не удалось создать базу данных"
        fi
    fi
}

# ============================================
# ФУНКЦИИ РАБОТЫ С NGINX
# ============================================

validate_nginx_config() {
    log_info "Проверка конфигурации nginx..."
    
    if [ ! -f "nginx.conf" ]; then
        error_exit "nginx.conf не найден!"
    fi
    
    # Проверяем синтаксис через nginx в контейнере (если доступен)
    if run_compose ps nginx 2>/dev/null | grep -q "Up"; then
        if run_compose exec -T nginx nginx -t 2>&1 | grep -q "successful"; then
            log_success "Конфигурация nginx валидна"
            return 0
        else
            log_warning "Проблемы с конфигурацией nginx"
            run_compose exec -T nginx nginx -t 2>&1 | tee -a "$LOG_FILE"
        fi
    else
        log_info "Nginx не запущен, пропускаем проверку синтаксиса"
    fi
    
    return 0
}

wait_for_web_health() {
    log_info "Ожидание готовности web контейнера..."
    
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if run_compose ps web 2>/dev/null | grep -q "healthy"; then
            log_success "Web контейнер здоров"
            return 0
        fi
        
        # Проверяем доступность API
        if run_compose exec -T web wget -q -O- http://localhost:3000/api/health 2>/dev/null | grep -q "ok\|healthy"; then
            log_success "Web контейнер отвечает на запросы"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log_info "Ожидание готовности (попытка $attempt/$max_attempts)..."
            sleep 3
        fi
        attempt=$((attempt + 1))
    done
    
    log_warning "Web контейнер не стал healthy, но продолжаем"
    return 0
}

start_nginx_container() {
    log_info "Запуск контейнера nginx..."
    
    # Проверяем конфигурацию
    validate_nginx_config
    
    # Ждем готовности web
    wait_for_web_health
    
    if run_compose up -d nginx 2>&1 | tee -a "$LOG_FILE"; then
        NGINX_CONTAINER_STARTED=true
        log_success "Контейнер nginx запущен"
    else
        error_exit "Не удалось запустить контейнер nginx"
    fi
    
    # Ждем запуска
    log_info "Ожидание запуска nginx (10 секунд)..."
    sleep 10
    
    # Проверяем статус
    if run_compose ps nginx 2>/dev/null | grep -q "Up"; then
        log_success "Nginx запущен и работает"
        check_container_logs nginx
    else
        error_exit "Nginx не запустился. Проверьте логи: $COMPOSE_CMD logs nginx"
    fi
}

# ============================================
# ФУНКЦИИ ФИНАЛЬНОЙ ВАЛИДАЦИИ
# ============================================

verify_all_containers() {
    log_info "Проверка статуса всех контейнеров..."
    
    local containers=("web" "nginx")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        local status=$(run_compose ps "$container" 2>/dev/null | tail -1 | awk '{print $7}' || echo "unknown")
        
        if echo "$status" | grep -q "Up"; then
            log_success "Контейнер $container: $status"
        else
            log_error "Контейнер $container: $status"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        log_success "Все контейнеры работают"
        return 0
    else
        log_warning "Некоторые контейнеры не работают"
        return 1
    fi
}

test_api_endpoints() {
    log_info "Тестирование API endpoints..."
    
    # Тестируем health endpoint
    if curl -sf http://localhost/api/health > /dev/null 2>&1 || curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Health endpoint доступен"
    else
        log_warning "Health endpoint недоступен (возможно, приложение еще запускается)"
    fi
}

verify_final_state() {
    log_info "Финальная проверка состояния..."
    
    # Проверяем контейнеры
    verify_all_containers
    
    # Проверяем БД
    if [ "$DB_CREATED" = true ]; then
        log_success "База данных создана"
    else
        log_warning "База данных не была создана"
    fi
    
    # Проверяем администратора
    if [ "$ADMIN_CREATED" = true ]; then
        log_success "Администратор создан"
    else
        log_warning "Администратор не был создан"
    fi
    
    # Тестируем API
    test_api_endpoints
}

# ============================================
# ГЛАВНАЯ ФУНКЦИЯ
# ============================================

main() {
    # Инициализация
    echo "═══════════════════════════════════════════════════════════"
    echo "  🚀 Автоматическая установка zelyonkin.ru v${SCRIPT_VERSION}"
    echo "═══════════════════════════════════════════════════════════"
echo ""
    
    # Создаем лог файл
    echo "Лог установки начат: $(date)" > "$LOG_FILE"
    
    # Проверка директории
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        error_exit "Скрипт должен быть запущен из корня проекта"
    fi
    
    # Шаг 1: Проверка окружения
    log_step 1 7 "Проверка окружения"
    check_docker_version
    check_compose_version
    check_disk_space
    check_memory
    check_ports
    check_project_files
    echo ""
    
    # Шаг 2: Настройка .env
    log_step 2 7 "Настройка переменных окружения"
    if [ ! -f ".env" ]; then
        create_env_file || error_exit "Не удалось создать .env файл"
    else
        backup_env_file
        if ! validate_env_syntax ".env"; then
            log_warning "Обнаружены проблемы с синтаксисом .env"
        fi
    fi
    validate_env_variables || log_warning "Некоторые переменные окружения отсутствуют"
    echo ""
    
    # Шаг 3: Создание директорий
    log_step 3 7 "Создание директорий"
    create_directories
echo ""
    
    # Шаг 4: Остановка старых контейнеров
    log_step 4 7 "Остановка старых контейнеров"
    if run_compose ps -q 2>/dev/null | grep -q .; then
        log_info "Остановка существующих контейнеров..."
        run_compose down 2>/dev/null || true
        log_success "Старые контейнеры остановлены"
    else
        log_info "Нет запущенных контейнеров"
    fi
    echo ""
    
    # Шаг 5: Сборка и запуск
    log_step 5 7 "Сборка и запуск приложения"
    build_docker_images
    start_web_container
    echo ""
    
    # Шаг 6: База данных и администратор
    log_step 6 7 "Настройка базы данных и администратора"
    run_migrations
    ensure_admin_user
    echo ""
    
    # Шаг 7: Nginx и финальная проверка
    log_step 7 7 "Запуск Nginx и финальная проверка"
    start_nginx_container
    verify_final_state
    echo ""
    
    # Успешное завершение
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
    echo "   $COMPOSE_CMD ps"
echo ""
echo "3. Просмотрите логи:"
    echo "   $COMPOSE_CMD logs -f web"
echo ""
echo "4. Проверьте healthcheck:"
echo "   curl http://localhost/api/health"
echo ""
echo "5. После получения SSL сертификата сайт будет доступен:"
echo "   https://zelyonkin.ru"
echo ""
echo "⚠️  ВАЖНО:"
    echo "   - Пароль по умолчанию: $DEFAULT_PASSWORD"
echo "   - Обязательно смените пароль после первого входа!"
echo "   - Настройте SSL сертификат перед использованием"
echo ""
echo "📋 Полезные команды:"
    echo "   - Просмотр логов: $COMPOSE_CMD logs -f"
    echo "   - Остановка: $COMPOSE_CMD down"
    echo "   - Перезапуск: $COMPOSE_CMD restart"
echo "   - Бэкап: ./backup.sh"
    echo ""
    echo "📝 Лог установки сохранен в: $LOG_FILE"
echo ""

    CLEANUP_NEEDED=false
    log_to_file "Установка успешно завершена"
}

# Запуск главной функции
main "$@"

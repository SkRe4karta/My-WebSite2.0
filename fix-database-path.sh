#!/bin/bash
# Скрипт для исправления пути к базе данных
# Перемещает БД из корня в правильную директорию и исправляет DATABASE_URL

set -e

echo "🔧 Исправление пути к базе данных..."
echo ""

# Определяем команду docker compose
if command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    USE_COMPOSE_V2=true
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    USE_COMPOSE_V2=false
else
    echo "❌ Docker Compose не найден!"
    exit 1
fi

# Функция для выполнения docker compose команд (подавляет предупреждения о переменных)
run_compose() {
    if [ "$USE_COMPOSE_V2" = true ]; then
        docker compose "$@" 2>&1 | grep -v "WARN.*variable is not set" || true
    else
        docker-compose "$@" 2>&1 | grep -v "WARN.*variable is not set" || true
    fi
}

# Проверяем, запущен ли контейнер web
if ! run_compose ps web 2>/dev/null | grep -q "Up"; then
    echo "⚠️  Контейнер web не запущен. Запускаем..."
    run_compose up -d web
    sleep 10
fi

echo "📋 Проверка текущего DATABASE_URL:"
CURRENT_DB_URL=$(run_compose exec -T web sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")
echo "   Текущий: $CURRENT_DB_URL"
echo ""

# Исправляем DATABASE_URL в .env файле
if [ -f ".env" ]; then
    echo "📝 Исправление DATABASE_URL в .env файле..."
    if grep -q 'DATABASE_URL="file:\./database/db.sqlite"' .env; then
        sed -i 's|DATABASE_URL="file:\./database/db.sqlite"|DATABASE_URL="file:/app/database/db.sqlite"|g' .env
        echo "   ✅ Исправлено в .env"
    elif grep -q "DATABASE_URL=file:\./database/db.sqlite" .env; then
        sed -i 's|DATABASE_URL=file:\./database/db.sqlite|DATABASE_URL=file:/app/database/db.sqlite|g' .env
        echo "   ✅ Исправлено в .env"
    else
        echo "   ℹ️  DATABASE_URL в .env уже правильный или не найден"
    fi
else
    echo "   ⚠️  Файл .env не найден"
fi

echo ""

# Проверяем наличие БД в корне контейнера
echo "🔍 Проверка наличия БД в неправильных местах..."
if run_compose exec -T web test -f /app/db.sqlite 2>/dev/null; then
    echo "   ⚠️  Найден файл /app/db.sqlite в корне контейнера!"
    
    WRONG_SIZE=$(run_compose exec -T web stat -c%s /app/db.sqlite 2>/dev/null || echo "0")
    echo "   Размер: ${WRONG_SIZE} байт"
    
    if [ "$WRONG_SIZE" -gt 0 ]; then
        # Проверяем, есть ли правильный файл
        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
            CORRECT_SIZE=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
            echo "   Размер правильного файла: ${CORRECT_SIZE} байт"
            
            if [ "$WRONG_SIZE" -gt "$CORRECT_SIZE" ]; then
                echo "   📦 Файл в корне больше, перемещаем его..."
                run_compose exec -T --user root web mv /app/db.sqlite /app/database/db.sqlite 2>/dev/null || \
                run_compose exec -T web sh -c "sudo mv /app/db.sqlite /app/database/db.sqlite" 2>/dev/null || {
                    echo "   ❌ Не удалось переместить файл автоматически"
                    echo "   💡 Выполните вручную: docker-compose exec --user root web mv /app/db.sqlite /app/database/db.sqlite"
                }
            else
                echo "   🗑️  Файл в правильной директории больше, удаляем файл из корня..."
                run_compose exec -T --user root web rm -f /app/db.sqlite 2>/dev/null || \
                run_compose exec -T web sh -c "sudo rm -f /app/db.sqlite" 2>/dev/null || true
            fi
        else
            echo "   📦 Правильного файла нет, перемещаем..."
            run_compose exec -T --user root web mv /app/db.sqlite /app/database/db.sqlite 2>/dev/null || \
            run_compose exec -T web sh -c "sudo mv /app/db.sqlite /app/database/db.sqlite" 2>/dev/null || {
                echo "   ❌ Не удалось переместить файл автоматически"
                echo "   💡 Выполните вручную: docker-compose exec --user root web mv /app/db.sqlite /app/database/db.sqlite"
            }
        fi
        
        # Устанавливаем права
        if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
            run_compose exec -T --user root web chmod 777 /app/database/db.sqlite 2>/dev/null || true
            echo "   ✅ Файл перемещен и права установлены"
        fi
    else
        echo "   🗑️  Файл пустой, удаляем..."
        run_compose exec -T --user root web rm -f /app/db.sqlite 2>/dev/null || true
    fi
else
    echo "   ✅ Файл БД не найден в корне контейнера"
fi

echo ""

# Проверяем наличие БД в корне на хосте
if [ -f "db.sqlite" ]; then
    echo "   ⚠️  Найден файл db.sqlite в корне проекта на хосте!"
    
    HOST_WRONG_SIZE=$(stat -f%z "db.sqlite" 2>/dev/null || stat -c%s "db.sqlite" 2>/dev/null || echo "0")
    echo "   Размер: ${HOST_WRONG_SIZE} байт"
    
    if [ "$HOST_WRONG_SIZE" -gt 0 ]; then
        # Проверяем, есть ли правильный файл
        if [ -f "database/db.sqlite" ]; then
            HOST_CORRECT_SIZE=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
            echo "   Размер правильного файла: ${HOST_CORRECT_SIZE} байт"
            
            if [ "$HOST_WRONG_SIZE" -gt "$HOST_CORRECT_SIZE" ]; then
                echo "   📦 Файл в корне больше, перемещаем его..."
                mv db.sqlite database/db.sqlite 2>/dev/null || sudo mv db.sqlite database/db.sqlite 2>/dev/null || {
                    echo "   ❌ Не удалось переместить файл автоматически"
                    echo "   💡 Выполните вручную: sudo mv db.sqlite database/db.sqlite"
                }
            else
                echo "   🗑️  Файл в правильной директории больше, удаляем файл из корня..."
                rm -f db.sqlite 2>/dev/null || sudo rm -f db.sqlite 2>/dev/null || true
            fi
        else
            echo "   📦 Правильного файла нет, перемещаем..."
            mv db.sqlite database/db.sqlite 2>/dev/null || sudo mv db.sqlite database/db.sqlite 2>/dev/null || {
                echo "   ❌ Не удалось переместить файл автоматически"
                echo "   💡 Выполните вручную: sudo mv db.sqlite database/db.sqlite"
            }
        fi
        
        # Устанавливаем права
        if [ -f "database/db.sqlite" ]; then
            chmod 777 database/db.sqlite 2>/dev/null || sudo chmod 777 database/db.sqlite 2>/dev/null || true
            echo "   ✅ Файл перемещен и права установлены"
        fi
    else
        echo "   🗑️  Файл пустой, удаляем..."
        rm -f db.sqlite 2>/dev/null || sudo rm -f db.sqlite 2>/dev/null || true
    fi
else
    echo "   ✅ Файл БД не найден в корне проекта на хосте"
fi

echo ""

# Перезапускаем контейнер для применения изменений
echo "🔄 Перезапуск контейнера web для применения изменений..."
run_compose restart web
sleep 5

echo ""

# Проверяем финальный DATABASE_URL
echo "📋 Проверка финального DATABASE_URL:"
FINAL_DB_URL=$(run_compose exec -T web sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")
echo "   Финальный: $FINAL_DB_URL"

if echo "$FINAL_DB_URL" | grep -q "file:/app/database/db.sqlite"; then
    echo "   ✅ DATABASE_URL правильный!"
else
    echo "   ⚠️  DATABASE_URL все еще неправильный"
    echo "   💡 Убедитесь, что в .env и docker-compose.yml указан: DATABASE_URL=file:/app/database/db.sqlite"
fi

echo ""

# Проверяем наличие БД в правильной директории
echo "📋 Проверка наличия БД в правильной директории:"
if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
    DB_SIZE=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
    echo "   ✅ БД найдена: /app/database/db.sqlite (размер: ${DB_SIZE} байт)"
else
    echo "   ⚠️  БД не найдена в правильной директории"
    echo "   💡 БД будет создана при следующем запуске миграций"
fi

if [ -f "database/db.sqlite" ]; then
    HOST_DB_SIZE=$(stat -f%z "database/db.sqlite" 2>/dev/null || stat -c%s "database/db.sqlite" 2>/dev/null || echo "0")
    echo "   ✅ БД найдена на хосте: database/db.sqlite (размер: ${HOST_DB_SIZE} байт)"
else
    echo "   ⚠️  БД не найдена на хосте в database/db.sqlite"
fi

echo ""
echo "✅ Исправление завершено!"


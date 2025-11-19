#!/bin/bash
# Диагностический скрипт для проверки контейнера web и базы данных

echo "🔍 Полная диагностика контейнера web и базы данных..."
echo ""

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

# Функция для выполнения docker compose команд (подавляет предупреждения о переменных)
run_compose() {
    if [ "$USE_COMPOSE_V2" = true ]; then
        docker compose "$@" 2>&1 | grep -v "WARN.*variable is not set" || true
    else
        docker-compose "$@" 2>&1 | grep -v "WARN.*variable is not set" || true
    fi
}

# 1. Статус контейнера
echo "1️⃣ Статус контейнера web:"
run_compose ps web 2>/dev/null || echo "❌ Контейнер web не найден"
echo ""

# 2. Логи контейнера (последние 30 строк)
echo "2️⃣ Последние 30 строк логов web:"
run_compose logs web --tail=30 2>/dev/null | grep -v "WARN.*variable is not set" || echo "❌ Не удалось получить логи"
echo ""

# 3. Проверка DATABASE_URL в контейнере
echo "3️⃣ DATABASE_URL в контейнере:"
run_compose exec -T web sh -c 'echo "DATABASE_URL=$DATABASE_URL"' 2>/dev/null || echo "❌ Не удалось получить DATABASE_URL"
echo ""

# 4. Проверка существования файла БД
echo "4️⃣ Проверка файла БД:"
echo "   На хосте:"
if [ -f "database/db.sqlite" ]; then
    local_size=$(stat -c%s "database/db.sqlite" 2>/dev/null || stat -f%z "database/db.sqlite" 2>/dev/null || echo "0")
    echo "   ✅ database/db.sqlite существует (размер: ${local_size} байт)"
    ls -lh database/db.sqlite 2>/dev/null || true
else
    echo "   ❌ database/db.sqlite не найден на хосте"
fi

echo "   В контейнере:"
if run_compose exec -T web test -f /app/database/db.sqlite 2>/dev/null; then
    container_size=$(run_compose exec -T web stat -c%s /app/database/db.sqlite 2>/dev/null || echo "0")
    echo "   ✅ /app/database/db.sqlite существует (размер: ${container_size} байт)"
    run_compose exec -T web ls -lh /app/database/db.sqlite 2>/dev/null | grep -v "WARN.*variable is not set" || true
else
    echo "   ❌ /app/database/db.sqlite не найден в контейнере"
fi
echo ""

# 5. Проверка прав доступа
echo "5️⃣ Права доступа:"
echo "   На хосте:"
ls -ld database 2>/dev/null || echo "   ❌ Директория database не найдена"
ls -l database/db.sqlite 2>/dev/null || echo "   ❌ Файл db.sqlite не найден"

echo "   В контейнере:"
run_compose exec -T web ls -ld /app/database 2>/dev/null | grep -v "WARN.*variable is not set" || echo "   ❌ Директория /app/database не найдена"
run_compose exec -T web ls -l /app/database/db.sqlite 2>/dev/null | grep -v "WARN.*variable is not set" || echo "   ❌ Файл db.sqlite не найден"
echo ""

# 6. Проверка подключения к БД через Prisma
echo "6️⃣ Проверка подключения к БД через Prisma:"
run_compose exec -T -w /app web sh -c '
    export DATABASE_URL="file:/app/database/db.sqlite" && \
    node -e "
    const { PrismaClient } = require(\"@prisma/client\");
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });
    (async () => {
        try {
            await prisma.\$connect();
            console.log(\"✅ Подключение к БД успешно\");
            
            // КРИТИЧНО: Проверяем ВСЕ таблицы, включая системные, для диагностики
            const allTables = await prisma.\$queryRaw\`SELECT name, type FROM sqlite_master WHERE type IN (\"table\", \"view\") ORDER BY name;\`;
            console.log(\"📋 Все таблицы/представления в sqlite_master:\", allTables.length);
            if (allTables.length > 0) {
                allTables.forEach(t => console.log(\"   -\", t.name, \"(\" + t.type + \")\"));
            }
            
            // Проверяем пользовательские таблицы
            const tables = await prisma.\$queryRaw\`SELECT name FROM sqlite_master WHERE type=\"table\" AND name NOT LIKE \"sqlite_%\" AND name NOT LIKE \"_%\" ORDER BY name;\`;
            console.log(\"📋 Пользовательские таблицы:\", tables.length);
            if (tables.length > 0) {
                tables.forEach(t => console.log(\"   -\", t.name));
            } else {
                console.log(\"   ⚠️  Пользовательские таблицы не найдены через sqlite_master\");
            }
            
            // Проверяем наличие пользователей через Prisma Client (даже если sqlite_master пуст)
            try {
                const userCount = await prisma.user.count();
                console.log(\"👥 Найдено пользователей:\", userCount);
                
                if (userCount > 0) {
                    const users = await prisma.user.findMany({
                        select: { email: true, name: true, role: true }
                    });
                    users.forEach(u => console.log(\"   -\", u.email, \"(\" + (u.name || \"без имени\") + \", роль: \" + u.role + \")\"));
                } else {
                    console.log(\"   ⚠️  Пользователи не найдены в БД\");
                }
            } catch (userError) {
                console.log(\"   ⚠️  Не удалось проверить пользователей через Prisma Client:\", userError.message);
            }
        } catch (e) {
            console.error(\"❌ Ошибка:\", e.message);
            process.exit(1);
        } finally {
            try { await prisma.\$disconnect(); } catch (err) {}
        }
    })();
    "
' 2>&1 | grep -v "WARN.*variable is not set"
echo ""

# 7. Проверка переменных окружения
echo "7️⃣ Переменные окружения в контейнере:"
run_compose exec -T web sh -c 'env | grep -E "DATABASE_URL|ADMIN_|NEXTAUTH_" | sort' 2>/dev/null | grep -v "WARN.*variable is not set" || echo "❌ Не удалось получить переменные окружения"
echo ""

# 8. Проверка .env файла на хосте и сравнение с контейнером
echo "8️⃣ DATABASE_URL в .env файле и сравнение:"
if [ -f ".env" ]; then
    # Игнорируем строки, которые выглядят как случайные переменные (без знака = или с неправильным форматом)
    env_db_url=$(grep "^DATABASE_URL=" .env | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || echo "")
    if [ -n "$env_db_url" ] && [ "$env_db_url" != "" ]; then
        echo "   .env файл: $env_db_url"
    else
        echo "   ❌ DATABASE_URL не найден в .env или пустой"
    fi
else
    echo "   ❌ .env файл не найден"
    env_db_url=""
fi

# Сравниваем с DATABASE_URL в контейнере
if [ -n "$env_db_url" ] && [ "$env_db_url" != "" ]; then
    container_db_url=$(run_compose exec -T web sh -c 'echo "$DATABASE_URL"' 2>/dev/null | grep -v "WARN.*variable is not set" || echo "")
    if [ -n "$container_db_url" ] && [ "$container_db_url" != "" ]; then
        echo "   Контейнер: $container_db_url"
        if [ "$env_db_url" != "$container_db_url" ]; then
            echo "   ⚠️  ВНИМАНИЕ: DATABASE_URL в .env и контейнере не совпадают!"
            echo "   Рекомендуется перезапустить контейнер: run_compose restart web"
        else
            echo "   ✅ DATABASE_URL совпадает в .env и контейнере"
        fi
        
        # Проверяем, что используется абсолютный путь
        if echo "$container_db_url" | grep -q "^file:\./"; then
            echo "   ⚠️  ВНИМАНИЕ: DATABASE_URL использует относительный путь!"
            echo "   Рекомендуется использовать: file:/app/database/db.sqlite"
        elif echo "$container_db_url" | grep -q "^file:/app/database/db.sqlite"; then
            echo "   ✅ DATABASE_URL использует правильный абсолютный путь"
        fi
    else
        echo "   ⚠️  Не удалось получить DATABASE_URL из контейнера"
    fi
fi
echo ""

# 9. Проверка доступности порта 3000
echo "9️⃣ Проверка порта 3000 в контейнере:"
run_compose exec -T web netstat -tlnp 2>/dev/null | grep 3000 || \
run_compose exec -T web ss -tlnp 2>/dev/null | grep 3000 || \
echo "   ⚠️  Порт 3000 не найден (возможно, приложение не запущено)"
echo ""

# 10. Проверка healthcheck
echo "🔟 Проверка healthcheck:"
run_compose exec -T web node -e "
    require('http').get('http://localhost:3000/api/health', (r) => {
        console.log('Status:', r.statusCode);
        process.exit(r.statusCode === 200 ? 0 : 1);
    }).on('error', (e) => {
        console.error('Error:', e.message);
        process.exit(1);
    });
" 2>&1 | grep -v "WARN.*variable is not set" | grep -E "Status:|Error:" || echo "   ❌ Healthcheck не прошел"
echo ""

echo "✅ Диагностика завершена"


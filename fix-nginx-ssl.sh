#!/bin/bash

# ============================================
# Скрипт для исправления nginx.conf на сервере
# Удаляет активный HTTPS блок до получения SSL сертификатов
# ============================================

set -euo pipefail

NGINX_CONF="/var/www/zelyonkin.ru/nginx.conf"

if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ Файл $NGINX_CONF не найден!"
    exit 1
fi

# Создаем резервную копию
cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Резервная копия создана"

# Проверяем, есть ли незакомментированный HTTPS блок
if grep -q "^[[:space:]]*listen[[:space:]]*443[[:space:]]*ssl" "$NGINX_CONF"; then
    echo "⚠️  Найден активный HTTPS блок, закомментируем его..."
    
    # Находим начало HTTPS server блока (строка с "listen 443")
    START_LINE=$(grep -n "^[[:space:]]*listen[[:space:]]*443[[:space:]]*ssl" "$NGINX_CONF" | head -1 | cut -d: -f1)
    
    if [ -n "$START_LINE" ]; then
        # Находим начало server блока (ищем предыдущий "server {")
        SERVER_START=$(sed -n "1,${START_LINE}p" "$NGINX_CONF" | grep -n "^[[:space:]]*server[[:space:]]*{" | tail -1 | cut -d: -f1)
        
        # Находим конец этого server блока
        # Считаем открывающие и закрывающие скобки
        TEMP_FILE=$(mktemp)
        sed -n "${SERVER_START},$ p" "$NGINX_CONF" > "$TEMP_FILE"
        
        BRACE_COUNT=0
        END_LINE=$SERVER_START
        while IFS= read -r line; do
            END_LINE=$((END_LINE + 1))
            OPEN=$(echo "$line" | grep -o '{' | wc -l)
            CLOSE=$(echo "$line" | grep -o '}' | wc -l)
            BRACE_COUNT=$((BRACE_COUNT + OPEN - CLOSE))
            if [ $BRACE_COUNT -eq 0 ] && [ $END_LINE -gt $SERVER_START ]; then
                break
            fi
        done < "$TEMP_FILE"
        rm "$TEMP_FILE"
        
        # Закомментируем весь блок
        sed -i "${SERVER_START},${END_LINE}s/^/# /" "$NGINX_CONF"
        echo "✅ HTTPS блок закомментирован (строки ${SERVER_START}-${END_LINE})"
    fi
else
    echo "ℹ️  Активный HTTPS блок не найден, возможно уже исправлено"
fi

# Проверяем синтаксис
if command -v nginx &> /dev/null; then
    if nginx -t -c "$NGINX_CONF" 2>/dev/null; then
        echo "✅ Синтаксис nginx.conf корректен"
    else
        echo "⚠️  Проверьте синтаксис вручную: nginx -t"
    fi
fi

echo ""
echo "📋 Следующие шаги:"
echo "1. Перезапустите nginx: docker-compose restart nginx"
echo "2. Проверьте статус: docker-compose ps"
echo "3. Проверьте логи: docker-compose logs nginx"


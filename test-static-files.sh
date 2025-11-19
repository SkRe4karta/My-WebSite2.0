#!/bin/bash
# Скрипт для диагностики проблем со статическими файлами

echo "🔍 Диагностика статических файлов Next.js..."
echo ""

DOMAIN="${1:-zelyonkin.ru}"
PROTOCOL="${2:-http}"

echo "📋 Тестирование домена: $PROTOCOL://$DOMAIN"
echo ""

# Проверка статуса контейнеров
echo "1️⃣ Проверка статуса контейнеров:"
docker-compose ps | grep -E "web|nginx" || echo "❌ Контейнеры не найдены"
echo ""

# Проверка доступности web контейнера
echo "2️⃣ Проверка доступности web:3000 из nginx:"
docker-compose exec -T nginx wget -O- --timeout=5 --spider http://web:3000/api/health 2>&1 | head -5 || echo "❌ web:3000 недоступен"
echo ""

# Проверка главной страницы
echo "3️⃣ Проверка главной страницы:"
curl -I "$PROTOCOL://$DOMAIN" 2>&1 | head -10
echo ""

# Проверка статических файлов (CSS)
echo "4️⃣ Поиск CSS файлов в HTML:"
CSS_FILES=$(curl -s "$PROTOCOL://$DOMAIN" | grep -oP '/_next/static/css/[^"]+' | head -3)
if [ -n "$CSS_FILES" ]; then
    echo "Найдены CSS файлы:"
    echo "$CSS_FILES"
    echo ""
    echo "5️⃣ Проверка доступности CSS файлов:"
    for css_file in $CSS_FILES; do
        echo "   Тестирую: $css_file"
        STATUS=$(curl -I "$PROTOCOL://$DOMAIN$css_file" 2>&1 | head -1)
        if echo "$STATUS" | grep -q "200\|304"; then
            echo "   ✅ Доступен: $STATUS"
        else
            echo "   ❌ Недоступен: $STATUS"
        fi
    done
else
    echo "❌ CSS файлы не найдены в HTML"
fi
echo ""

# Проверка JavaScript файлов
echo "6️⃣ Поиск JS файлов в HTML:"
JS_FILES=$(curl -s "$PROTOCOL://$DOMAIN" | grep -oP '/_next/static/chunks/[^"]+' | head -3)
if [ -n "$JS_FILES" ]; then
    echo "Найдены JS файлы:"
    echo "$JS_FILES"
    echo ""
    echo "7️⃣ Проверка доступности JS файлов:"
    for js_file in $JS_FILES; do
        echo "   Тестирую: $js_file"
        STATUS=$(curl -I "$PROTOCOL://$DOMAIN$js_file" 2>&1 | head -1)
        if echo "$STATUS" | grep -q "200\|304"; then
            echo "   ✅ Доступен: $STATUS"
        else
            echo "   ❌ Недоступен: $STATUS"
        fi
    done
else
    echo "❌ JS файлы не найдены в HTML"
fi
echo ""

# Проверка логов nginx
echo "8️⃣ Последние ошибки в логах nginx:"
docker-compose logs nginx --tail=20 | grep -i "error\|warn\|failed" || echo "Ошибок не найдено"
echo ""

# Проверка логов web
echo "9️⃣ Последние ошибки в логах web:"
docker-compose logs web --tail=20 | grep -i "error\|warn\|failed" || echo "Ошибок не найдено"
echo ""

# Проверка прямого доступа к web контейнеру
echo "🔟 Прямой доступ к web:3000/_next/static:"
docker-compose exec -T web curl -I http://localhost:3000/_next/static/css/ 2>&1 | head -5 || echo "❌ Недоступен"
echo ""

echo "✅ Диагностика завершена"
echo ""
echo "💡 Если CSS/JS файлы недоступны, проверьте:"
echo "   1. Контейнер web запущен и отвечает на порту 3000"
echo "   2. Nginx правильно проксирует запросы к web:3000"
echo "   3. Права доступа к статическим файлам в контейнере web"
echo "   4. CSP заголовки не блокируют загрузку файлов"


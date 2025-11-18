#!/bin/bash

# Скрипт для генерации bcrypt хеша пароля
# Использование: ./generate-password-hash.sh [пароль]

set -e

PASSWORD="${1:-1234}"

echo "🔐 Генерация bcrypt хеша для пароля..."

# Способ 1: Docker контейнер
if command -v docker &> /dev/null; then
    echo "Используем Docker контейнер..."
    HASH=$(docker run --rm node:20-slim sh -c "
        npm install bcryptjs 2>/dev/null && \
        node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$PASSWORD', 10))\"
    " 2>/dev/null | tail -1)
    
    if [ -n "$HASH" ]; then
        echo ""
        echo "✅ Хеш сгенерирован:"
        echo "$HASH"
        echo ""
        echo "Добавьте в .env файл:"
        echo "ADMIN_PASSWORD_HASH=$HASH"
        exit 0
    fi
fi

# Способ 2: Локальный Node.js
if command -v node &> /dev/null; then
    echo "Используем локальный Node.js..."
    if node -e "require('bcryptjs')" &> /dev/null; then
        HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$PASSWORD', 10))")
        echo ""
        echo "✅ Хеш сгенерирован:"
        echo "$HASH"
        echo ""
        echo "Добавьте в .env файл:"
        echo "ADMIN_PASSWORD_HASH=$HASH"
        exit 0
    fi
fi

echo "❌ Не удалось сгенерировать хеш. Установите Docker или Node.js с bcryptjs."
exit 1


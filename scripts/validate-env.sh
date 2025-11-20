#!/bin/bash

# Скрипт для валидации .env файла
# Использование: ./scripts/validate-env.sh

set -e

if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден"
    exit 1
fi

echo "🔍 Валидация .env файла..."

ERRORS=0

# Загружаем переменные
source .env

# Проверка обязательных переменных
REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "ADMIN_EMAIL"
    "ADMIN_USERNAME"
    "ADMIN_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ $var не установлена"
        ERRORS=$((ERRORS + 1))
    else
        # Скрываем значения для безопасности
        if [[ $var == *"PASSWORD"* ]] || [[ $var == *"SECRET"* ]]; then
            echo "✅ $var установлена (скрыто)"
        else
            echo "✅ $var установлена"
        fi
    fi
done

# Проверка формата DATABASE_URL
if [[ $DATABASE_URL == postgresql://* ]]; then
    echo "✅ DATABASE_URL использует PostgreSQL"
elif [[ $DATABASE_URL == file:* ]]; then
    echo "⚠️  DATABASE_URL использует SQLite (не рекомендуется для production)"
else
    echo "❌ DATABASE_URL имеет неверный формат"
    ERRORS=$((ERRORS + 1))
fi

# Проверка NEXTAUTH_SECRET
if [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
    echo "⚠️  NEXTAUTH_SECRET слишком короткий (рекомендуется минимум 32 символа)"
fi

# Проверка NEXTAUTH_URL
if [[ $NEXTAUTH_URL != https://* ]]; then
    echo "⚠️  NEXTAUTH_URL должен начинаться с https:// для production"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ Валидация пройдена успешно!"
    exit 0
else
    echo "❌ Найдено $ERRORS ошибок"
    exit 1
fi


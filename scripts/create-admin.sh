#!/bin/bash

# Скрипт для создания нового администратора
# Использование: ./scripts/create-admin.sh

set -e

echo "👤 Создание нового администратора..."

read -p "Email: " EMAIL
read -p "Имя пользователя: " USERNAME
read -sp "Пароль: " PASSWORD
echo ""

if [ -z "$EMAIL" ] || [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    echo "❌ Все поля обязательны"
    exit 1
fi

# Создаем администратора через Docker
docker-compose exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
    const email = process.env.EMAIL || '$EMAIL';
    const username = process.env.USERNAME || '$USERNAME';
    const password = process.env.PASSWORD || '$PASSWORD';
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name: username,
            passwordHash,
            role: 'admin',
        },
        create: {
            email,
            name: username,
            passwordHash,
            role: 'admin',
        },
    });
    
    console.log('✅ Администратор создан/обновлен:', user.email);
    await prisma.\$disconnect();
}

createAdmin().catch(console.error);
"

echo "✅ Готово!"


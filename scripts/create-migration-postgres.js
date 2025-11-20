/**
 * Скрипт для создания миграции PostgreSQL
 * Использование: node scripts/create-migration-postgres.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Создание миграции для PostgreSQL...');

// Временно меняем provider в schema.prisma
const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Проверяем, что уже используется PostgreSQL
if (schemaContent.includes('provider = "postgresql"')) {
    console.log('✅ Schema уже настроен для PostgreSQL');
} else {
    console.log('⚠️  Schema использует SQLite. Обновите schema.prisma вручную.');
    process.exit(1);
}

try {
    // Создаем новую миграцию
    console.log('📦 Создание миграции...');
    execSync('npx prisma migrate dev --name init_postgresql --create-only', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
    });

    console.log('✅ Миграция создана успешно!');
    console.log('📝 Следующий шаг:');
    console.log('1. Проверьте созданную миграцию в prisma/migrations/');
    console.log('2. Примените миграцию: npx prisma migrate deploy');
} catch (error) {
    console.error('❌ Ошибка при создании миграции:', error.message);
    process.exit(1);
}


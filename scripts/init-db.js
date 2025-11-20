/**
 * Скрипт для инициализации production базы данных
 * Использование: node scripts/init-db.js
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function initDatabase() {
  console.log('🚀 Инициализация базы данных...');

  try {
    // Применяем миграции
    console.log('📦 Применение миграций...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Проверяем наличие админа
    const adminEmail = process.env.ADMIN_EMAIL || 'zelyonkin.d@gmail.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      console.log('👤 Создание администратора...');
      const bcrypt = require('bcryptjs');
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        console.error('❌ ADMIN_PASSWORD не установлен в переменных окружения');
        console.error('Установите ADMIN_PASSWORD в .env файле');
        process.exit(1);
      }
      
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await prisma.user.create({
        data: {
          email: adminEmail,
          name: process.env.ADMIN_USERNAME || 'skre4karta',
          passwordHash,
          role: 'admin',
        },
      });

      console.log(`✅ Администратор создан: ${adminEmail}`);
      console.log(`👤 Имя пользователя: ${process.env.ADMIN_USERNAME || 'skre4karta'}`);
      console.log('⚠️  НЕ ЗАБУДЬТЕ СМЕНИТЬ ПАРОЛЬ после первого входа!');
    } else {
      console.log('✅ Администратор уже существует');
    }

    console.log('✅ База данных инициализирована успешно!');
  } catch (error) {
    console.error('❌ Ошибка при инициализации:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('🎉 Инициализация завершена!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };

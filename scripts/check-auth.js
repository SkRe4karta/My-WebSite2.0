/**
 * Скрипт для проверки настроек аутентификации
 * Использование: node scripts/check-auth.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuth() {
  console.log('🔍 Проверка настроек аутентификации...\n');

  // Проверка переменных окружения
  console.log('📋 Переменные окружения:');
  console.log(`   - ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || '❌ НЕ ЗАДАН'}`);
  console.log(`   - ADMIN_USERNAME: ${process.env.ADMIN_USERNAME || '❌ НЕ ЗАДАН'}`);
  console.log(`   - ADMIN_PASSWORD_HASH: ${process.env.ADMIN_PASSWORD_HASH ? '✅ Задан' : '❌ НЕ ЗАДАН'}`);
  console.log(`   - NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Задан' : '❌ НЕ ЗАДАН'}`);
  console.log(`   - NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ НЕ ЗАДАН'}`);
  console.log('');

  // Проверка базы данных
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'zelyonkin.d@gmail.com';
    const admin = await prisma.user.findUnique({ 
      where: { email: adminEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        createdAt: true,
      }
    });

    if (admin) {
      console.log('✅ Администратор найден в базе данных:');
      console.log(`   - ID: ${admin.id}`);
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Имя: ${admin.name}`);
      console.log(`   - Роль: ${admin.role}`);
      console.log(`   - Пароль хеширован: ${admin.passwordHash.startsWith('$2') ? '✅ Да' : '❌ Нет (plain text)'}`);
      console.log(`   - Создан: ${admin.createdAt}`);
    } else {
      console.log('❌ Администратор НЕ найден в базе данных!');
      console.log('   Запустите: npm run db:init-admin');
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error.message);
  }

  await prisma.$disconnect();
}

checkAuth()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  });


/**
 * Скрипт для тестирования входа
 * Использование: node scripts/test-login.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  const testUsername = 'skre4karta';
  const testPassword = '1234';
  const testEmail = 'zelyonkin.d@gmail.com';

  console.log('🧪 Тестирование входа...\n');
  console.log(`Попытка входа с:`);
  console.log(`   - Логин: ${testUsername}`);
  console.log(`   - Email: ${testEmail}`);
  console.log(`   - Пароль: ${testPassword}\n`);

  try {
    // Ищем пользователя
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: testEmail },
          { name: testUsername },
        ],
      },
    });

    if (!user) {
      console.log('❌ Пользователь не найден!');
      console.log('\n📋 Все пользователи в БД:');
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
      
      if (allUsers.length === 0) {
        console.log('   (БД пуста - пользователи не созданы)');
        console.log('\n💡 Запустите: npm run db:init-admin');
      } else {
        allUsers.forEach(u => {
          console.log(`   - Email: ${u.email}, Name: ${u.name || '(не задано)'}, Role: ${u.role}`);
        });
      }
      process.exit(1);
    }

    console.log('✅ Пользователь найден:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name || '(не задано)'}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - PasswordHash: ${user.passwordHash.substring(0, 30)}...`);

    // Проверяем пароль
    console.log('\n🔐 Проверка пароля...');
    const isBcrypt = user.passwordHash.startsWith('$2');
    console.log(`   - Формат: ${isBcrypt ? 'bcrypt' : 'plain text'}`);

    let passwordValid = false;
    if (isBcrypt) {
      passwordValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`   - Результат: ${passwordValid ? '✅ Валиден' : '❌ Неверный'}`);
    } else {
      passwordValid = testPassword === user.passwordHash;
      console.log(`   - Результат: ${passwordValid ? '✅ Валиден (plain text)' : '❌ Неверный'}`);
    }

    if (passwordValid) {
      console.log('\n✅ ВХОД ДОЛЖЕН РАБОТАТЬ!');
      console.log(`\n📝 Используйте для входа:`);
      console.log(`   - Логин: ${user.name || user.email}`);
      console.log(`   - Или Email: ${user.email}`);
      console.log(`   - Пароль: ${testPassword}`);
    } else {
      console.log('\n❌ ПАРОЛЬ НЕВЕРНЫЙ!');
      console.log(`\n💡 Возможные решения:`);
      console.log(`   1. Проверьте .env файл - ADMIN_PASSWORD_HASH должен быть хешем пароля "1234"`);
      console.log(`   2. Запустите: npm run db:fix-user`);
      console.log(`   3. Или пересоздайте пользователя: npm run db:init-admin`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });


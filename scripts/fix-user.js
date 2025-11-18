/**
 * Скрипт для исправления пользователя (обновление name и пароля)
 * Использование: node scripts/fix-user.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixUser() {
  const email = process.env.ADMIN_EMAIL || 'zelyonkin.d@gmail.com';
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const name = process.env.ADMIN_NAME || process.env.ADMIN_USERNAME || 'skre4karta';

  console.log('🔧 Исправление пользователя...\n');

  if (!passwordHash) {
    console.error('❌ ОШИБКА: ADMIN_PASSWORD_HASH не найден в переменных окружения');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(`❌ Пользователь с email ${email} не найден!`);
      console.log('   Запустите: npm run db:init-admin');
      process.exit(1);
    }

    console.log('📋 Текущие данные пользователя:');
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name || '(не задано)'}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - PasswordHash: ${user.passwordHash.substring(0, 20)}...`);

    // Обновляем name, если нужно
    if (user.name !== name) {
      console.log(`\n🔄 Обновление name: "${user.name || '(не задано)'}" -> "${name}"`);
      await prisma.user.update({
        where: { email },
        data: { name },
      });
      console.log('   ✅ Name обновлен');
    }

    // Проверяем формат пароля
    const isBcrypt = user.passwordHash.startsWith('$2');
    const needsPasswordUpdate = !isBcrypt || user.passwordHash !== passwordHash;

    if (needsPasswordUpdate) {
      console.log(`\n🔄 Обновление пароля...`);
      console.log(`   - Текущий формат: ${isBcrypt ? 'bcrypt' : 'plain text'}`);
      console.log(`   - Новый формат: bcrypt`);
      
      await prisma.user.update({
        where: { email },
        data: { passwordHash },
      });
      console.log('   ✅ Пароль обновлен на bcrypt хеш');
    } else {
      console.log('\n✅ Пароль уже в правильном формате (bcrypt)');
    }

    // Проверяем, что можно войти с паролем "1234"
    if (passwordHash.startsWith('$2')) {
      const testPassword = '1234';
      const isValid = await bcrypt.compare(testPassword, passwordHash);
      if (isValid) {
        console.log(`\n✅ Проверка пароля: пароль "1234" валиден`);
      } else {
        console.log(`\n⚠️  Проверка пароля: пароль "1234" НЕ валиден для текущего хеша`);
        console.log(`   Возможно, в .env указан хеш другого пароля`);
      }
    }

    console.log('\n✅ Пользователь исправлен!');
    console.log(`\n📝 Для входа используйте:`);
    console.log(`   - Логин: ${name} или ${email}`);
    console.log(`   - Пароль: (из .env)`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });


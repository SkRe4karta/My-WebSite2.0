/**
 * Скрипт для создания администратора по умолчанию
 * Использование: node scripts/init-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'zelyonkin.d@gmail.com';
  let passwordHash = process.env.ADMIN_PASSWORD_HASH;
  // Используем ADMIN_USERNAME как name для входа по логину
  const name = process.env.ADMIN_NAME || process.env.ADMIN_USERNAME || 'skre4karta';
  const username = process.env.ADMIN_USERNAME || 'skre4karta';
  const defaultPassword = '1234';

  console.log('📋 Параметры инициализации:');
  console.log(`   - Email: ${email}`);
  console.log(`   - Username: ${username}`);
  console.log(`   - Name: ${name}`);
  console.log(`   - PasswordHash: ${passwordHash ? '✅ Установлен' : '❌ ОТСУТСТВУЕТ (будет сгенерирован)'}`);

  // Если хеш не задан, генерируем его для пароля по умолчанию
  if (!passwordHash || passwordHash === '') {
    console.log('🔐 Генерация bcrypt хеша для пароля по умолчанию "1234"...');
    passwordHash = await bcrypt.hash(defaultPassword, 10);
    console.log(`   ✅ Хеш сгенерирован: ${passwordHash.substring(0, 30)}...`);
  }

  if (!passwordHash.startsWith('$2')) {
    console.warn('⚠️  ВНИМАНИЕ: ADMIN_PASSWORD_HASH не похож на bcrypt хеш');
    console.warn('   Генерируем новый bcrypt хеш...');
    passwordHash = await bcrypt.hash(defaultPassword, 10);
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      console.log(`🔐 Создание администратора с email: ${email}`);
      const admin = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: passwordHash,
          role: 'admin',
        },
      });
      console.log('✅ Администратор создан:');
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Имя: ${admin.name}`);
      console.log(`   - Логин: ${username}`);
      console.log(`   - Роль: ${admin.role}`);
      return admin;
    } else {
      console.log('✅ Администратор уже существует:');
      console.log(`   - Email: ${existing.email}`);
      console.log(`   - Имя: ${existing.name}`);
      console.log(`   - Логин: ${username}`);
      
      // Обновляем пароль, если он изменился в .env
      if (existing.passwordHash !== passwordHash) {
        console.log('🔄 Обновление пароля администратора...');
        await prisma.user.update({
          where: { email },
          data: { passwordHash: passwordHash, name, role: 'admin' },
        });
        console.log('   ✅ Пароль обновлен');
      }
      
      return existing;
    }
  } catch (error) {
    console.error('❌ Ошибка при создании администратора:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

ensureAdminUser()
  .then(() => {
    console.log('✅ Инициализация завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });


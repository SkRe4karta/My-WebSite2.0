/**
 * Скрипт для принудительного исправления пользователя
 * Обновляет name и пароль независимо от текущих значений
 * Использование: node scripts/force-fix-user.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function forceFixUser() {
  // Исправляем пользователя с нужным email (используем тот, который используется для входа)
  const targetEmail = 'zelyonkin.d@gmail.com'; // Исправляем именно этого пользователя
  const name = process.env.ADMIN_NAME || process.env.ADMIN_USERNAME || 'skre4karta';
  const testPassword = '1234';

  console.log('🔧 Принудительное исправление пользователя...\n');
  console.log(`📧 Ищем пользователя с email: ${targetEmail}`);
  console.log('📝 Будет использован пароль по умолчанию: "1234"\n');

  try {
    // Сначала показываем всех пользователей
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true },
    });
    
    if (allUsers.length > 0) {
      console.log('📋 Все пользователи в БД:');
      allUsers.forEach(u => {
        console.log(`   - Email: ${u.email}, Name: ${u.name || '(не задано)'}, Role: ${u.role}`);
      });
      console.log('');
    }

    let user = await prisma.user.findUnique({ where: { email: targetEmail } });

    // Если пользователь не найден, создаем его
    if (!user) {
      console.log(`\n📝 Пользователь не найден, создаем нового администратора...`);
      const correctHash = await bcrypt.hash(testPassword, 10);
      user = await prisma.user.create({
        data: {
          email: targetEmail,
          name,
          passwordHash: correctHash,
          role: 'admin',
        },
      });
      console.log('✅ Пользователь создан!');
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Role: ${user.role}`);
      
      // Проверяем вход
      console.log(`\n🧪 Проверка входа...`);
      const passwordValid = await bcrypt.compare(testPassword, user.passwordHash);
      
      if (passwordValid) {
        console.log(`   ✅ Пароль "1234" валиден!`);
      } else {
        console.log(`   ❌ Ошибка: пароль неверный`);
      }
      
      console.log('\n✅ Пользователь создан и готов к использованию!');
      console.log(`\n📝 Для входа используйте:`);
      console.log(`   - Логин: ${name}`);
      console.log(`   - Или Email: ${targetEmail}`);
      console.log(`   - Пароль: ${testPassword}`);
      
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log('📋 Текущие данные пользователя:');
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name || '(не задано)'}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - PasswordHash формат: ${user.passwordHash.startsWith('$2') ? 'bcrypt' : 'plain text'}`);

    // Принудительно обновляем name
    console.log(`\n🔄 Принудительное обновление name: "${user.name || '(не задано)'}" -> "${name}"`);
    await prisma.user.update({
      where: { email: targetEmail },
      data: { name },
    });
    console.log('   ✅ Name обновлен');

    // Генерируем правильный bcrypt хеш для пароля "1234"
    console.log(`\n🔐 Генерация bcrypt хеша для пароля "1234"...`);
    const correctHash = await bcrypt.hash(testPassword, 10);
    console.log(`   ✅ Хеш сгенерирован: ${correctHash.substring(0, 30)}...`);

    // Принудительно обновляем пароль
    console.log(`\n🔄 Принудительное обновление пароля на bcrypt хеш...`);
    await prisma.user.update({
      where: { email: targetEmail },
      data: { passwordHash: correctHash },
    });
    console.log('   ✅ Пароль обновлен');

    // Проверяем, что теперь можно войти
    console.log(`\n🧪 Проверка входа...`);
    const updatedUser = await prisma.user.findUnique({ where: { email: targetEmail } });
    const passwordValid = await bcrypt.compare(testPassword, updatedUser.passwordHash);
    
    if (passwordValid) {
      console.log(`   ✅ Пароль "1234" теперь валиден!`);
    } else {
      console.log(`   ❌ Ошибка: пароль все еще неверный`);
    }

    console.log('\n✅ Пользователь исправлен!');
    console.log(`\n📝 Для входа используйте:`);
    console.log(`   - Логин: ${name}`);
    console.log(`   - Или Email: ${targetEmail}`);
    console.log(`   - Пароль: ${testPassword}`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

forceFixUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });


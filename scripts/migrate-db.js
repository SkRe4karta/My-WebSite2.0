/**
 * Скрипт для миграции данных из SQLite в PostgreSQL
 * Использование: node scripts/migrate-db.js
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sqliteDbPath = path.join(__dirname, '../prisma/database/db.sqlite');

async function migrateData() {
  console.log('🚀 Начало миграции данных...');

  // Проверяем наличие SQLite базы
  if (!fs.existsSync(sqliteDbPath)) {
    console.log('⚠️  SQLite база данных не найдена. Пропускаем миграцию данных.');
    return;
  }

  // Временное подключение к SQLite
  const sqliteUrl = `file:${sqliteDbPath}`;
  process.env.DATABASE_URL = sqliteUrl;

  const sqlitePrisma = new PrismaClient({
    datasources: {
      db: {
        url: sqliteUrl,
      },
    },
  });

  try {
    // Подключаемся к PostgreSQL
    const postgresPrisma = new PrismaClient();

    console.log('📦 Миграция пользователей...');
    const users = await sqlitePrisma.user.findMany({
      include: {
        settings: true,
      },
    });
    for (const user of users) {
      await postgresPrisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          totpSecret: user.totpSecret,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      if (user.settings) {
        await postgresPrisma.userSetting.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            theme: user.settings.theme,
            enableAnimations: user.settings.enableAnimations,
            dailyReminderHour: user.settings.dailyReminderHour,
            backupTarget: user.settings.backupTarget,
            backupCodes: user.settings.backupCodes,
          },
        });
      }
    }

    console.log('📝 Миграция заметок...');
    const notes = await sqlitePrisma.note.findMany({
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
    for (const note of notes) {
      await postgresPrisma.note.create({
        data: {
          id: note.id,
          title: note.title,
          content: note.content,
          format: note.format,
          status: note.status,
          folder: note.folder,
          category: note.category,
          featured: note.featured,
          checklist: note.checklist,
          ownerId: note.ownerId,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
      });
      // Миграция тегов
      for (const noteTag of note.tags) {
        await postgresPrisma.tag.upsert({
          where: { name: noteTag.tag.name },
          update: {},
          create: { name: noteTag.tag.name },
        });
        await postgresPrisma.noteTag.create({
          data: {
            noteId: note.id,
            tagId: (await postgresPrisma.tag.findUnique({ where: { name: noteTag.tag.name } })).id,
          },
        });
      }
    }

    console.log('📁 Миграция файлов...');
    const files = await sqlitePrisma.fileEntry.findMany();
    for (const file of files) {
      await postgresPrisma.fileEntry.create({
        data: {
          id: file.id,
          name: file.name,
          path: file.path,
          mimeType: file.mimeType,
          size: file.size,
          isFolder: file.isFolder,
          parentId: file.parentId,
          ownerId: file.ownerId,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
      });
    }

    console.log('🔐 Миграция Vault...');
    const vaultItems = await sqlitePrisma.vaultItem.findMany();
    for (const item of vaultItems) {
      await postgresPrisma.vaultItem.create({
        data: {
          id: item.id,
          label: item.label,
          description: item.description,
          secretType: item.secretType,
          metadata: item.metadata,
          fileId: item.fileId,
          ownerId: item.ownerId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      });
    }

    console.log('💡 Миграция идей...');
    const ideas = await sqlitePrisma.ideaEntry.findMany();
    for (const idea of ideas) {
      await postgresPrisma.ideaEntry.create({
        data: {
          id: idea.id,
          title: idea.title,
          content: idea.content,
          mood: idea.mood,
          category: idea.category,
          tags: idea.tags,
          date: idea.date,
          ownerId: idea.ownerId,
          createdAt: idea.createdAt,
          updatedAt: idea.updatedAt,
        },
      });
    }

    console.log('✅ Миграция данных завершена успешно!');
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    throw error;
  } finally {
    await sqlitePrisma.$disconnect();
    await postgresPrisma.$disconnect();
  }
}

if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('🎉 Миграция завершена!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };


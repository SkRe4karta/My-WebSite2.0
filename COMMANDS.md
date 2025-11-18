# 📋 Все команды для развертывания

## 🖥️ На локальной машине

### Подготовка к коммиту

```bash
cd my-portfolio-site

# Проверка статуса
git status

# Добавление всех изменений
git add .

# Создание коммита
git commit -m "feat: управление пользователями и исправление аутентификации (v2.2.1)

- Исправлена аутентификация NextAuth (множественные пользователи)
- Добавлено управление пользователями в настройках
- Исправлены миграции БД
- Добавлены диагностические скрипты
- Автоматическое создание администратора"

# Отправка в репозиторий
git push origin main
```

---

## 🖥️ На ВМ (сервер)

### Полное обновление

```bash
# Подключение
ssh admin@82.202.138.157

# Обновление
cd /var/www/zelyonkin.ru
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
sleep 20
docker-compose exec web npm run db:migrate
docker-compose exec web npm run db:force-fix-user
```

### Проверка

```bash
# Статус
docker-compose ps

# Тест входа
docker-compose exec web npm run db:test-login

# Проверка настроек
docker-compose exec web npm run db:check-auth

# Healthcheck
curl http://localhost/api/health
```

### Диагностика

```bash
# Логи
docker-compose logs -f web

# Исправление пользователя
docker-compose exec web npm run db:force-fix-user

# Проверка всех пользователей
docker-compose exec web npx prisma studio
# Откройте http://localhost:5555
```

---

## 📝 Полезные команды

### Управление контейнерами

```bash
# Остановка
docker-compose down

# Запуск
docker-compose up -d

# Перезапуск
docker-compose restart

# Логи
docker-compose logs -f web
docker-compose logs -f nginx
```

### Работа с БД

```bash
# Миграции
docker-compose exec web npm run db:migrate

# Создание администратора
docker-compose exec web npm run db:init-admin

# Исправление пользователя
docker-compose exec web npm run db:force-fix-user

# Тест входа
docker-compose exec web npm run db:test-login

# Prisma Studio
docker-compose exec web npx prisma studio
```

### Резервное копирование

```bash
# Автоматический бэкап
./backup.sh

# Ручной бэкап
cp .env .env.backup
cp -r database database.backup
```

---

## 🆘 Решение проблем

### Не работает вход

```bash
docker-compose exec web npm run db:force-fix-user
docker-compose exec web npm run db:test-login
```

### Ошибки миграций

```bash
docker-compose exec web npx prisma migrate deploy
```

### Контейнеры не запускаются

```bash
docker-compose logs web
docker-compose restart
```

---

**Версия:** 2.2.1


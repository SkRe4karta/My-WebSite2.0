# 🚀 Быстрые команды для развертывания

## На локальной машине (подготовка)

```bash
cd my-portfolio-site

# 1. Проверка статуса
git status

# 2. Добавление всех изменений
git add .

# 3. Коммит
git commit -m "feat: управление пользователями и исправление аутентификации (v2.2.1)"

# 4. Отправка в репозиторий
git push origin main
```

## На ВМ (развертывание)

```bash
# 1. Подключение
ssh admin@82.202.138.157

# 2. Переход в директорию
cd /var/www/zelyonkin.ru

# 3. Обновление кода
git pull origin main

# 4. Остановка контейнеров
docker-compose down

# 5. Пересборка
docker-compose build --no-cache

# 6. Запуск
docker-compose up -d

# 7. Ожидание запуска
sleep 15

# 8. Миграции
docker-compose exec web npm run db:migrate

# 9. Исправление пользователя
docker-compose exec web npm run db:force-fix-user

# 10. Проверка
docker-compose ps
docker-compose exec web npm run db:test-login
```

## Одной командой (на ВМ)

```bash
cd /var/www/zelyonkin.ru && \
git pull origin main && \
docker-compose down && \
docker-compose build --no-cache && \
docker-compose up -d && \
sleep 15 && \
docker-compose exec web npm run db:migrate && \
docker-compose exec web npm run db:force-fix-user && \
echo "✅ Обновление завершено!"
```

## Проверка после обновления

```bash
# Статус контейнеров
docker-compose ps

# Логи
docker-compose logs web | tail -20

# Тест входа
docker-compose exec web npm run db:test-login

# Healthcheck
curl http://localhost/api/health
```

## Учетные данные

- **Логин:** `skre4karta` или `zelyonkin.d@gmail.com`
- **Пароль:** `1234`


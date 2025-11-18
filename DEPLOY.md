# Инструкция по развертыванию на Ubuntu 22.04

Полная инструкция по развертыванию портфолио сайта zelyonkin.ru на виртуальной машине Ubuntu 22.04 с использованием Docker и Nginx.

## Предварительные требования

- Ubuntu 22.04 LTS
- Права root или sudo
- Домен zelyonkin.ru, настроенный на IP-адрес вашего сервера
- Минимум 1GB RAM, 10GB свободного места на диске

## Шаг 1: Подготовка сервера

### 1.1 Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Установка необходимых пакетов

```bash
sudo apt install -y curl wget git ufw
```

### 1.3 Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

**Важно:** После добавления пользователя в группу docker, необходимо выйти и войти снова, либо выполнить:
```bash
newgrp docker
```

## Шаг 2: Настройка файрвола

```bash
# Разрешить SSH (если еще не настроено)
sudo ufw allow 22/tcp

# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить файрвол
sudo ufw enable
sudo ufw status
```

## Шаг 3: Копирование проекта на сервер

### 3.1 Создание директории для проекта

```bash
mkdir -p ~/portfolio
cd ~/portfolio
```

### 3.2 Копирование файлов

Скопируйте всю папку `my-portfolio-site` на сервер одним из способов:

**Вариант 1: Через SCP (с локального компьютера)**
```bash
scp -r my-portfolio-site user@your-server-ip:~/portfolio/
```

**Вариант 2: Через Git (если проект в репозитории)**
```bash
git clone https://github.com/your-username/my-portfolio-site.git
cd my-portfolio-site
```

**Вариант 3: Через архив**
```bash
# На локальной машине создайте архив
tar -czf portfolio.tar.gz my-portfolio-site/

# Скопируйте на сервер
scp portfolio.tar.gz user@your-server-ip:~/portfolio/

# На сервере распакуйте
cd ~/portfolio
tar -xzf portfolio.tar.gz
cd my-portfolio-site
```

## Шаг 4: Настройка переменных окружения

### 4.1 Создание файла .env

```bash
cp .env.example .env
nano .env
```

### 4.2 Генерация необходимых значений

**NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**ADMIN_PASSWORD_HASH:**
```bash
# На сервере с Node.js или локально
node -e "console.log(require('bcryptjs').hashSync('ваш_пароль', 10))"
```

**VAULT_ENCRYPTION_KEY:**
```bash
openssl rand -base64 32
```

**ENCRYPTED_STORAGE_SALT:**
```bash
openssl rand -base64 16
```

### 4.3 Заполнение .env файла

Отредактируйте `.env` файл, заменив все значения:

```env
NEXTAUTH_URL=https://zelyonkin.ru
NEXTAUTH_SECRET=сгенерированный_секрет
ADMIN_USERNAME=skre4karta
ADMIN_EMAIL=zelyonkin.d@gmail.com
ADMIN_PASSWORD_HASH=сгенерированный_хэш_пароля
DATABASE_URL="file:./database/db.sqlite"
VAULT_ENCRYPTION_KEY=сгенерированный_ключ
ENCRYPTED_STORAGE_SALT=сгенерированная_соль
NEXT_PUBLIC_ADMIN_USERNAME=skre4karta
NODE_ENV=production
```

## Шаг 5: Создание необходимых директорий

```bash
mkdir -p database storage/uploads storage/vault certbot/www certbot/conf certbot/logs
```

## Шаг 6: Получение SSL сертификата

### 6.1 Первый запуск для получения сертификата

```bash
# Временно измените nginx.conf, чтобы разрешить HTTP без редиректа
# Или используйте certbot в standalone режиме

docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email zelyonkin.d@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d zelyonkin.ru \
  -d www.zelyonkin.ru
```

**Альтернативный способ (standalone):**

Временно остановите nginx и запустите certbot в standalone режиме:

```bash
# Остановите nginx
docker-compose stop nginx

# Получите сертификат
docker-compose run --rm certbot certonly \
  --standalone \
  --email zelyonkin.d@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d zelyonkin.ru \
  -d www.zelyonkin.ru
```

### 6.2 Проверка сертификата

```bash
ls -la certbot/live/zelyonkin.ru/
```

Должны быть файлы: `fullchain.pem` и `privkey.pem`

## Шаг 7: Запуск приложения

### 7.1 Сборка и запуск контейнеров

```bash
# Сборка образов
docker-compose build

# Запуск в фоновом режиме
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f web
```

### 7.2 Выполнение миграций базы данных

```bash
# Войдите в контейнер
docker-compose exec web sh

# Выполните миграции
npm run db:migrate

# Выйдите из контейнера
exit
```

## Шаг 8: Проверка работы

1. Откройте браузер и перейдите на `https://zelyonkin.ru`
2. Проверьте, что сайт загружается
3. Попробуйте войти в админку: `https://zelyonkin.ru/login`
4. Используйте логин и пароль из `.env`

## Шаг 9: Настройка автоматического обновления SSL

Сертификаты Let's Encrypt действительны 90 дней. Certbot контейнер автоматически обновляет их каждые 12 часов. Для ручного обновления:

```bash
docker-compose exec certbot certbot renew
docker-compose restart nginx
```

## Шаг 10: Резервное копирование

### 10.1 Создание скрипта бэкапа

Создайте файл `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Бэкап базы данных
cp database/db.sqlite $BACKUP_DIR/db_$DATE.sqlite

# Бэкап storage
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz storage/

# Бэкап .env (опционально, храните в безопасном месте)
# cp .env $BACKUP_DIR/env_$DATE

echo "Backup completed: $DATE"
```

Сделайте скрипт исполняемым:
```bash
chmod +x backup.sh
```

### 10.2 Настройка cron для автоматических бэкапов

```bash
crontab -e
```

Добавьте строку для ежедневного бэкапа в 3:00:
```
0 3 * * * /home/$USER/portfolio/my-portfolio-site/backup.sh
```

## Управление приложением

### Остановка
```bash
docker-compose down
```

### Перезапуск
```bash
docker-compose restart
```

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Только web
docker-compose logs -f web

# Только nginx
docker-compose logs -f nginx
```

### Обновление приложения
```bash
# Остановите контейнеры
docker-compose down

# Обновите код (если используете git)
git pull

# Пересоберите и запустите
docker-compose build
docker-compose up -d
```

### Очистка неиспользуемых образов
```bash
docker system prune -a
```

## Решение проблем

### Проблема: Сайт не открывается

1. Проверьте статус контейнеров:
   ```bash
   docker-compose ps
   ```

2. Проверьте логи:
   ```bash
   docker-compose logs web
   docker-compose logs nginx
   ```

3. Проверьте, что порты открыты:
   ```bash
   sudo netstat -tlnp | grep -E ':(80|443)'
   ```

### Проблема: Ошибка SSL сертификата

1. Проверьте наличие сертификатов:
   ```bash
   ls -la certbot/live/zelyonkin.ru/
   ```

2. Проверьте права доступа:
   ```bash
   sudo chmod -R 755 certbot/
   ```

3. Перезапустите nginx:
   ```bash
   docker-compose restart nginx
   ```

### Проблема: База данных не создается

1. Проверьте права на директорию:
   ```bash
   sudo chmod -R 777 database/
   ```

2. Выполните миграции вручную:
   ```bash
   docker-compose exec web npm run db:migrate
   ```

### Проблема: Ошибка "Cannot connect to database"

1. Проверьте DATABASE_URL в .env
2. Убедитесь, что директория database существует
3. Проверьте права доступа к файлу базы данных

## Мониторинг

### Проверка использования ресурсов
```bash
docker stats
```

### Проверка места на диске
```bash
df -h
docker system df
```

## Безопасность

1. **Регулярно обновляйте систему:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Используйте сильные пароли** для админки

3. **Регулярно делайте бэкапы**

4. **Не коммитьте .env файл** в git

5. **Ограничьте доступ к серверу** через SSH ключи

## Контакты и поддержка

При возникновении проблем проверьте:
- Логи контейнеров
- Конфигурацию nginx
- Переменные окружения
- Права доступа к файлам

---

**Версия документа:** 1.1  
**Дата обновления:** 2024


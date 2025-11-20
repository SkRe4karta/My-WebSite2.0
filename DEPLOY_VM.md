# 🚀 Развертывание на VM (Виртуальная машина)

## Требования

- Ubuntu 20.04+ / Debian 11+ или другая Linux система
- Node.js 18+ и npm 9+
- PostgreSQL 14+
- Docker и Docker Compose (опционально, но рекомендуется)
- Nginx (для reverse proxy)

## Шаг 1: Подготовка сервера

### Установка Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Установка PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Установка Docker и Docker Compose (опционально)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin -y
```

### Установка Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Шаг 2: Клонирование и настройка проекта

```bash
# Создайте директорию для проекта
sudo mkdir -p /var/www
cd /var/www

# Клонируйте репозиторий (или загрузите файлы)
# git clone <your-repo-url> My-WebSite2.0
cd My-WebSite2.0

# Установите зависимости
npm install

# Создайте .env файл
cp env.example .env
nano .env
```

### Настройка .env файла

```env
# Database
DATABASE_URL="postgresql://mywebsite:your-secure-password@localhost:5432/mywebsite?schema=public"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Admin User
ADMIN_EMAIL="your-email@example.com"
ADMIN_USERNAME="skre4karta"
ADMIN_PASSWORD="your-secure-password"

# Application
NODE_ENV="production"
PORT=3000
```

Генерация NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Шаг 3: Настройка базы данных

```bash
# Создайте пользователя и базу данных PostgreSQL
sudo -u postgres psql

# В psql выполните:
CREATE USER mywebsite WITH PASSWORD 'your-secure-password';
CREATE DATABASE mywebsite OWNER mywebsite;
GRANT ALL PRIVILEGES ON DATABASE mywebsite TO mywebsite;
\q

# Инициализируйте базу данных
npm run db:init

# Создайте администратора
npm run db:seed

# Добавьте проект о сайте
npm run db:add-website-project
```

## Шаг 4: Сборка проекта

```bash
# Соберите проект
npm run build

# Проверьте, что сборка прошла успешно
ls -la .next/standalone
```

## Шаг 5: Настройка systemd service

Создайте файл сервиса:

```bash
sudo nano /etc/systemd/system/mywebsite.service
```

Содержимое:

```ini
[Unit]
Description=My-WebSite 2.0 Next.js Application
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/My-WebSite2.0
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=/var/www/My-WebSite2.0/.env
ExecStart=/usr/bin/node /var/www/My-WebSite2.0/.next/standalone/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mywebsite

[Install]
WantedBy=multi-user.target
```

Активируйте сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mywebsite
sudo systemctl start mywebsite
sudo systemctl status mywebsite
```

## Шаг 6: Настройка Nginx

Создайте конфигурацию Nginx:

```bash
sudo nano /etc/nginx/sites-available/mywebsite
```

Содержимое:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;

    # Для начала используйте HTTP
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/mywebsite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Шаг 7: Настройка SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot автоматически обновит конфигурацию Nginx для HTTPS.

## Шаг 8: Настройка файрвола

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Шаг 9: Проверка работы

1. Проверьте статус сервиса:
   ```bash
   sudo systemctl status mywebsite
   ```

2. Проверьте логи:
   ```bash
   sudo journalctl -u mywebsite -f
   ```

3. Откройте в браузере: `https://your-domain.com`

## Обновление приложения

```bash
cd /var/www/My-WebSite2.0

# Получите обновления (если используете git)
# git pull

# Установите новые зависимости
npm install

# Примените миграции БД (если есть)
npm run migrate

# Пересоберите проект
npm run build

# Перезапустите сервис
sudo systemctl restart mywebsite
```

## Мониторинг и логи

```bash
# Логи приложения
sudo journalctl -u mywebsite -n 100 -f

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Статус сервисов
sudo systemctl status mywebsite
sudo systemctl status nginx
sudo systemctl status postgresql
```

## Резервное копирование

### База данных

```bash
# Создайте скрипт бэкапа
sudo nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mywebsite"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump mywebsite > $BACKUP_DIR/db_$DATE.sql
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-db.sh

# Добавьте в crontab (ежедневно в 2:00)
sudo crontab -e
# Добавьте строку:
0 2 * * * /usr/local/bin/backup-db.sh
```

## Устранение проблем

### Приложение не запускается

1. Проверьте логи: `sudo journalctl -u mywebsite -n 50`
2. Проверьте .env файл: `cat /var/www/My-WebSite2.0/.env`
3. Проверьте права доступа: `sudo chown -R www-data:www-data /var/www/My-WebSite2.0`
4. Проверьте подключение к БД: `psql -U mywebsite -d mywebsite -h localhost`

### Белый экран / нет стилей

1. Убедитесь, что сборка прошла успешно: `ls -la .next/standalone`
2. Проверьте, что все зависимости установлены: `npm install`
3. Пересоберите проект: `npm run build`
4. Проверьте логи браузера (F12) на ошибки загрузки CSS/JS

### Ошибки подключения к БД

1. Проверьте, что PostgreSQL запущен: `sudo systemctl status postgresql`
2. Проверьте DATABASE_URL в .env
3. Проверьте права пользователя БД: `sudo -u postgres psql -c "\du"`

## Безопасность

1. **Регулярно обновляйте систему:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Используйте сильные пароли** для БД и админки

3. **Настройте fail2ban** для защиты от брутфорса:
   ```bash
   sudo apt install fail2ban -y
   ```

4. **Регулярно делайте бэкапы** базы данных и файлов

5. **Мониторьте логи** на подозрительную активность

## Производительность

1. **Включите кэширование в Nginx** (уже настроено для статики)

2. **Настройте PostgreSQL** для production:
   ```bash
   sudo nano /etc/postgresql/14/main/postgresql.conf
   # Увеличьте shared_buffers, effective_cache_size и др.
   ```

3. **Используйте PM2** (альтернатива systemd) для лучшего управления процессами:
   ```bash
   npm install -g pm2
   pm2 start .next/standalone/server.js --name mywebsite
   pm2 save
   pm2 startup
   ```


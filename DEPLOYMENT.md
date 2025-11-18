# Руководство по развертыванию zelyonkin.ru

Полное руководство по развертыванию портфолио сайта на виртуальной машине Ubuntu 22.04.

## Содержание

1. [Требования](#требования)
2. [Подготовка сервера](#подготовка-сервера)
3. [Копирование проекта](#копирование-проекта)
4. [Установка и настройка](#установка-и-настройка)
5. [Настройка SSL](#настройка-ssl)
6. [Проверка работы](#проверка-работы)
7. [Управление](#управление)
8. [Мониторинг и healthcheck](#мониторинг-и-healthcheck)
9. [Решение проблем](#решение-проблем)

---

## Требования

- Ubuntu 22.04 LTS
- Минимум 1GB RAM, 10GB свободного места на диске
- Права root или sudo
- Домен zelyonkin.ru, настроенный на IP-адрес вашего сервера
- SSH доступ к серверу

---

## Подготовка сервера

### Шаг 1: Подключение к серверу

```bash
ssh admin@82.202.138.157
```

### Шаг 2: Первоначальная настройка сервера

Если это первая настройка сервера, выполните:

```bash
cd ~/var/www/my-site
chmod +x server-setup.sh
./server-setup.sh
```

**Важно:** После установки Docker необходимо выйти и войти снова через SSH для применения изменений группы docker.

Скрипт автоматически:
- Обновит систему
- Установит Docker и Docker Compose
- Настроит файрвол (UFW)
- Создаст необходимые директории

---

## Копирование проекта

### С локального компьютера (Windows PowerShell)

```powershell
# Перейдите в папку с проектом
cd C:\Users\zelyo\.vscode\my-portfolio-site

# Скопируйте весь проект на сервер
scp -r * admin@82.202.138.157:~/var/www/my-site/
```

### Проверка копирования

На сервере проверьте, что все файлы скопированы:

```bash
ssh admin@82.202.138.157
cd ~/var/www/my-site
ls -la
```

Должны быть видны все скрипты: `install.sh`, `deploy.sh`, `Dockerfile`, `docker-compose.yml` и т.д.

---

## Установка и настройка

### Автоматическая установка (рекомендуется)

```bash
cd ~/var/www/my-site
chmod +x install.sh
./install.sh
```

Скрипт автоматически:
1. Создаст файл `.env` (если не существует)
2. Создаст необходимые директории
3. Установит права на скрипты
4. Остановит старые контейнеры (если есть)
5. Соберет Docker образы
6. Запустит контейнеры
7. Выполнит миграции базы данных
8. Проверит healthcheck

### Ручная установка

Если нужно выполнить установку вручную:

```bash
# 1. Создание .env файла
chmod +x setup-env.sh
./setup-env.sh

# 2. Создание директорий
mkdir -p database storage/uploads storage/vault
mkdir -p certbot/www certbot/conf certbot/logs

# 3. Развертывание
chmod +x deploy.sh
./deploy.sh
```

---

## Настройка SSL

После успешной установки получите SSL сертификат:

```bash
cd ~/var/www/my-site
chmod +x setup-ssl.sh
./setup-ssl.sh
```

Или вручную:

```bash
# Остановите nginx временно
docker-compose stop nginx

# Получите сертификат
docker-compose run --rm certbot certonly \
  --standalone \
  --email zelyonkin.d@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d zelyonkin.ru \
  -d www.zelyonkin.ru

# Запустите nginx снова
docker-compose start nginx
```

---

## Проверка работы

### 1. Проверка статуса контейнеров

```bash
docker-compose ps
```

Все контейнеры должны быть в статусе `Up` и `healthy`.

### 2. Проверка healthcheck

```bash
curl http://localhost/api/health
```

Должен вернуться JSON с информацией о статусе:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-18T...",
  "uptime": 123.45,
  "services": {
    "database": "ok",
    "databaseResponseTime": 5
  }
}
```

### 3. Проверка логов

```bash
# Все сервисы
docker-compose logs -f

# Только web
docker-compose logs -f web

# Только nginx
docker-compose logs -f nginx
```

### 4. Проверка сайта

Откройте в браузере:
- HTTP: `http://zelyonkin.ru` (должен редиректить на HTTPS)
- HTTPS: `https://zelyonkin.ru`

---

## Управление

### Обновление приложения

#### Полное обновление (с пересборкой)

```bash
cd ~/var/www/my-site
./deploy.sh
```

#### Быстрое обновление (без пересборки)

```bash
cd ~/var/www/my-site
./deploy.sh --no-build
```

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

# Конкретный сервис
docker-compose logs -f web
docker-compose logs -f nginx
```

### Резервное копирование

```bash
chmod +x backup.sh
./backup.sh
```

Скрипт создаст бэкапы:
- База данных: `backups/db_YYYYMMDD_HHMMSS.sqlite`
- Storage: `backups/storage_YYYYMMDD_HHMMSS.tar.gz`

---

## Мониторинг и healthcheck

### Healthcheck endpoint

Приложение предоставляет healthcheck endpoint для мониторинга:

```bash
curl http://localhost/api/health
```

Или через HTTPS:
```bash
curl https://zelyonkin.ru/api/health
```

### Docker healthcheck

Docker автоматически проверяет здоровье контейнеров:

```bash
docker ps
```

В колонке `STATUS` должно быть `Up X minutes (healthy)`.

### Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование места на диске
df -h
docker system df
```

---

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

4. Проверьте файрвол:
   ```bash
   sudo ufw status
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

### Проблема: Healthcheck не проходит

1. Проверьте логи web контейнера:
   ```bash
   docker-compose logs web
   ```

2. Проверьте подключение к базе данных:
   ```bash
   docker-compose exec web node -e "const {prisma} = require('./src/lib/db'); prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('OK')).catch(e => console.error(e))"
   ```

3. Проверьте healthcheck endpoint вручную:
   ```bash
   docker-compose exec web curl http://localhost:3000/api/health
   ```

### Проблема: Контейнеры не запускаются

1. Проверьте логи:
   ```bash
   docker-compose logs
   ```

2. Проверьте конфигурацию:
   ```bash
   docker-compose config
   ```

3. Пересоберите образы:
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Проблема: Ошибка "Permission denied"

1. Проверьте права на файлы:
   ```bash
   ls -la
   chmod +x *.sh
   ```

2. Проверьте права на директории:
   ```bash
   sudo chmod -R 755 database storage certbot
   ```

---

## Оптимизации проекта

Проект включает следующие оптимизации:

### Docker
- Multi-stage build для уменьшения размера образа
- Кеширование слоев для ускорения сборки
- Healthcheck для мониторинга состояния

### Nginx
- Gzip компрессия для уменьшения размера ответов
- Кеширование статических файлов
- Rate limiting для защиты от DDoS
- Современная SSL конфигурация

### Next.js
- Оптимизация изображений (AVIF, WebP)
- Code splitting для уменьшения размера бандлов
- Кеширование статических ресурсов
- Security headers

---

## Полезные команды

```bash
# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Перезапуск сервиса
docker-compose restart web

# Остановка всех сервисов
docker-compose down

# Очистка неиспользуемых образов
docker system prune -a

# Проверка healthcheck
curl http://localhost/api/health

# Выполнение команд в контейнере
docker-compose exec web sh

# Просмотр использования ресурсов
docker stats
```

---

## Безопасность

1. **Регулярно обновляйте систему:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Используйте сильные пароли** для админки

3. **Регулярно делайте бэкапы**

4. **Не коммитьте .env файл** в git

5. **Ограничьте доступ к серверу** через SSH ключи

6. **Настройте автоматическое обновление SSL сертификатов** (уже настроено через certbot)

---

## Контакты и поддержка

При возникновении проблем проверьте:
- Логи контейнеров: `docker-compose logs`
- Конфигурацию nginx: `nginx.conf`
- Переменные окружения: `.env`
- Права доступа к файлам: `ls -la`
- Healthcheck: `curl http://localhost/api/health`

---

**Версия документа:** 2.2.0  
**Дата обновления:** Ноябрь 2024


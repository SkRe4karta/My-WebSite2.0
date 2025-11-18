# Быстрый старт — Развертывание на Ubuntu 22.04

## Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Выход и повторный вход для применения изменений группы docker
exit
# (войдите снова)
```

## Шаг 2: Копирование проекта

```bash
# Создайте директорию
mkdir -p ~/portfolio
cd ~/portfolio

# Скопируйте папку my-portfolio-site на сервер
# (используйте scp, git clone или другой метод)
```

## Шаг 3: Настройка

```bash
cd ~/portfolio/my-portfolio-site

# Создайте .env файл
chmod +x setup-env.sh
./setup-env.sh

# Или вручную:
cp .env.example .env
nano .env  # Отредактируйте файл
```

**Важно:** 
- Используйте скрипт `./setup-env.sh` для автоматической генерации (пароль по умолчанию: `1234`)
- Или заполните все переменные в `.env` вручную:
  - `NEXTAUTH_SECRET` — сгенерируйте: `openssl rand -base64 32`
  - `ADMIN_PASSWORD_HASH` — сгенерируйте: `node -e "console.log(require('bcryptjs').hashSync('ваш_пароль', 10))"`
  - `VAULT_ENCRYPTION_KEY` — сгенерируйте: `openssl rand -base64 32`
  - `ENCRYPTED_STORAGE_SALT` — сгенерируйте: `openssl rand -base64 16`
- **⚠️ После первого входа обязательно смените пароль в настройках админки!**

## Шаг 4: Развертывание

```bash
# Создайте необходимые директории
mkdir -p database storage/uploads storage/vault
mkdir -p certbot/www certbot/conf certbot/logs

# Запустите развертывание
chmod +x deploy.sh
./deploy.sh
```

## Шаг 5: Получение SSL сертификата

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

## Шаг 6: Проверка

Откройте в браузере: `https://zelyonkin.ru`

Войдите в админку: `https://zelyonkin.ru/login`

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Обновление приложения
docker-compose down
git pull  # если используете git
docker-compose build
docker-compose up -d
```

## Решение проблем

**Сайт не открывается:**
```bash
docker-compose ps
docker-compose logs web
docker-compose logs nginx
```

**Ошибка SSL:**
```bash
ls -la certbot/live/zelyonkin.ru/
docker-compose restart nginx
```

**База данных:**
```bash
docker-compose exec web npm run db:migrate
```

---

Для подробной информации см. [DEPLOY.md](./DEPLOY.md)


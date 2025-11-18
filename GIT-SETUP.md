# Инструкция по настройке Git репозитория

## Инициализация Git репозитория

```bash
# Инициализация
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: zelyonkin.ru v2.2.0"

# Добавление remote (замените на ваш репозиторий)
git remote add origin https://github.com/your-username/my-portfolio-site.git

# Отправка на GitHub
git branch -M main
git push -u origin main
```

## Что исключено из Git

Следующие файлы и директории **НЕ** будут закоммичены (см. `.gitignore`):

- `node_modules/` - зависимости (установятся при `npm install`)
- `.next/` - build артефакты (создадутся при сборке)
- `.env*` - файлы окружения (кроме `.env.example`)
- `database/*.sqlite` - база данных (создастся при первом запуске)
- `prisma/database/*.sqlite` - база данных Prisma
- `storage/uploads/*` - загруженные файлы
- `storage/vault/*` - зашифрованные файлы
- `certbot/live/`, `certbot/archive/`, `certbot/renewal/`, `certbot/logs/` - SSL сертификаты

## Что включено в Git

- Все исходные файлы (`src/`, `public/`)
- Конфигурационные файлы (Dockerfile, docker-compose.yml, nginx.conf)
- Скрипты развертывания (`.sh` файлы)
- Prisma схема и миграции
- Документация (README.md, DEPLOYMENT.md и др.)
- `.env.example` - пример переменных окружения
- `.gitkeep` файлы для пустых директорий

## После клонирования репозитория

```bash
# Клонирование
git clone https://github.com/your-username/my-portfolio-site.git
cd my-portfolio-site

# Создание .env файла
./setup-env.sh

# Установка зависимостей (для локальной разработки)
npm install

# Или сразу развертывание на сервере
./install.sh
```


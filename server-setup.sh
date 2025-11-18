#!/bin/bash

# Скрипт для первоначальной настройки сервера Ubuntu 22.04
# Использование: ./server-setup.sh

set -e

echo "🔧 Начало настройки сервера для zelyonkin.ru..."
echo ""

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
echo "📦 Установка базовых пакетов..."
sudo apt install -y curl git openssl ufw

# Установка Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Добавление пользователя в группу docker
    sudo usermod -aG docker $USER
    echo "✅ Docker установлен"
    echo "⚠️  ВАЖНО: Необходимо выйти и войти снова для применения изменений группы docker"
    DOCKER_NEEDS_RELOGIN=true
else
    echo "✅ Docker уже установлен"
    DOCKER_NEEDS_RELOGIN=false
fi

# Установка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Установка Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose установлен"
else
    echo "✅ Docker Compose уже установлен"
fi

# Настройка файрвола
echo "🔥 Настройка файрвола..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
echo "✅ Файрвол настроен"

# Создание директории для проекта
echo "📁 Создание директории для проекта..."
mkdir -p ~/var/www
echo "✅ Директория ~/var/www создана"

echo ""
echo "✅ Настройка сервера завершена!"
echo ""

if [ "$DOCKER_NEEDS_RELOGIN" = true ]; then
    echo "⚠️  ВАЖНО: Docker был только что установлен!"
    echo "   Выполните следующие команды:"
    echo "   exit"
    echo "   # Затем войдите снова через SSH"
    echo "   # После этого запустите: cd ~/var/www/my-site && ./setup.sh"
else
    echo "📋 Следующий шаг:"
    echo "   cd ~/var/www/my-site"
    echo "   ./setup.sh"
fi
echo ""


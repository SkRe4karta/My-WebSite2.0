#!/bin/bash

# Скрипт для первоначальной настройки Ubuntu 22.04 сервера
# Использование: ./scripts/setup-server.sh

set -e

echo "🚀 Настройка сервера Ubuntu 22.04..."

# Обновление системы
echo "📦 Обновление системы..."
sudo apt-get update
sudo apt-get upgrade -y

# Установка необходимых пакетов
echo "📦 Установка базовых пакетов..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Установка Docker
echo "🐳 Установка Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✅ Docker установлен"
else
    echo "✅ Docker уже установлен"
fi

# Установка Docker Compose (standalone)
echo "🐳 Установка Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose установлен"
else
    echo "✅ Docker Compose уже установлен"
fi

# Установка Nginx
echo "🌐 Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    echo "✅ Nginx установлен"
else
    echo "✅ Nginx уже установлен"
fi

# Настройка firewall
echo "🔥 Настройка firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "✅ Firewall настроен"

# Настройка fail2ban
echo "🛡️  Настройка fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
echo "✅ Fail2ban настроен"

# Создание директорий для проекта
echo "📁 Создание директорий..."
sudo mkdir -p /opt/mywebsite
sudo mkdir -p /var/log/mywebsite
sudo chown -R $USER:$USER /opt/mywebsite
sudo chown -R $USER:$USER /var/log/mywebsite
echo "✅ Директории созданы"

# Настройка автоматических обновлений безопасности
echo "🔒 Настройка автоматических обновлений..."
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
echo "✅ Автоматические обновления настроены"

echo "✅ Настройка сервера завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Склонируйте репозиторий в /opt/mywebsite"
echo "2. Настройте .env файл"
echo "3. Установите SSL сертификат: ./scripts/setup-ssl.sh"
echo "4. Настройте Nginx: sudo cp nginx.conf /etc/nginx/sites-available/zelyonkin.ru"
echo "5. Активируйте сайт: sudo ln -s /etc/nginx/sites-available/zelyonkin.ru /etc/nginx/sites-enabled/"
echo "6. Запустите приложение: docker-compose up -d"


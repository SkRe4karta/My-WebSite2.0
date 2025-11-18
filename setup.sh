#!/bin/bash

# Скрипт setup.sh перенаправляет на install.sh для единообразия
# Использование: ./setup.sh

echo "ℹ️  Скрипт setup.sh перенаправлен на install.sh"
echo "   Запускаю install.sh..."
echo ""

if [ -f "install.sh" ]; then
    chmod +x install.sh
    ./install.sh
else
    echo "❌ install.sh не найден!"
    echo "   Используйте: ./install.sh"
    exit 1
fi

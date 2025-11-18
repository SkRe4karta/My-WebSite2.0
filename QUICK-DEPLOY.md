# Быстрая инструкция по развертыванию

## 🚀 Загрузка на ВМ

```powershell
# С локального компьютера
cd C:\Users\zelyo\.vscode\my-portfolio-site
scp -r * admin@82.202.138.157:~/var/www/my-site/
```

## 📤 Выкладка в Git

```bash
# Инициализация
git init
git add .
git commit -m "Initial commit: zelyonkin.ru v2.2.0"
git remote add origin https://github.com/your-username/my-portfolio-site.git
git branch -M main
git push -u origin main
```

## ✅ На сервере

```bash
cd ~/var/www/my-site
chmod +x *.sh
./install.sh
./setup-ssl.sh
```

**Готово!** Сайт доступен на https://zelyonkin.ru


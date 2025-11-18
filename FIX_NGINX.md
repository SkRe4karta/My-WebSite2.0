# Быстрое исправление Nginx на сервере

## Проблема
Nginx не запускается из-за отсутствия SSL сертификатов в старой конфигурации.

## Решение

### Вариант 1: Скопировать обновленный файл с локального компьютера

На локальном компьютере:
```bash
scp nginx.conf admin@82.202.138.157:/var/www/zelyonkin.ru/nginx.conf
```

На сервере:
```bash
cd /var/www/zelyonkin.ru
docker-compose restart nginx
docker-compose ps
```

### Вариант 2: Исправить файл напрямую на сервере

На сервере выполните:
```bash
cd /var/www/zelyonkin.ru

# Создайте резервную копию
cp nginx.conf nginx.conf.backup

# Удалите или закомментируйте HTTPS блок
# Найдите строки с "listen 443" и "ssl_certificate" и закомментируйте весь HTTPS server блок
# Или просто замените файл обновленной версией
```

### Вариант 3: Временное решение - отключить HTTPS блок

На сервере:
```bash
cd /var/www/zelyonkin.ru

# Найдите и закомментируйте HTTPS блок (строки примерно 99-225)
sed -i '/^  server {$/,/^  }$/ {
  /listen 443 ssl http2;/s/^/#/
  /ssl_certificate/s/^/#/
  /ssl_certificate_key/s/^/#/
}' nginx.conf

# Или проще - закомментируйте весь HTTPS server блок вручную
nano nginx.conf
# Найдите блок "server {" который содержит "listen 443"
# Закомментируйте весь блок от "server {" до соответствующего "}"
```

### Проверка после исправления

```bash
# Проверьте синтаксис
docker-compose exec nginx nginx -t

# Перезапустите
docker-compose restart nginx

# Проверьте статус
docker-compose ps

# Проверьте логи
docker-compose logs nginx
```

## После исправления

После того как Nginx запустится, вы сможете:
1. Получить SSL сертификат: `./setup-ssl.sh`
2. Раскомментировать HTTPS блок в nginx.conf
3. Включить редирект с HTTP на HTTPS


# Certbot

- `certbot/www` — challenge folder, mounted to nginx.
- `certbot/conf` — certificates (generated automatically).

Issue certificate once:

```
docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d example.com -d www.example.com
```


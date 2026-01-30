# Static portfolio (4 pages)

## Структура
- index.html — Главная
- projects.html — Проекты
- about.html — Обо мне
- admin.html — Админка (пустая, только GIF)
- styles.css — всё оформление
- assets/ — картинки и гифка

## Как заменить картинки
Положи свои файлы в `assets/` и оставь **те же имена**:
- `assets/hero-photo.png`
- `assets/about-photo.png`
- `assets/admin.gif`

## Как запустить локально
Самый простой способ — открыть `index.html` в браузере.
Если браузер ругается на локальные файлы, подними простой сервер:

### Python
python -m http.server 8080

И открой http://localhost:8080

# DRIPLY — текущее состояние проекта

Обновлено: 23 июля 2026

## Инфраструктура

- GitHub: `misha213123/shmot`
- Frontend: React + Vite + TypeScript, Vercel
- Production frontend: `https://shmot-lime.vercel.app`
- Backend: FastAPI, Render
- Production backend: `https://driply-api.onrender.com`
- Database and media storage: Supabase
- Telegram integration intentionally postponed

## Реализованный frontend

- Русский интерфейс
- Мобильная свайп-лента
- Свайп товара влево: пропустить
- Свайп товара вправо: сохранить
- Кнопки возврата, пропуска, лайка и продвижения
- Карусель фотографий по нажатию на левую/правую половину изображения
- Полоски прогресса фотографий
- Полная карточка товара с описанием, характеристиками и продавцом
- Поиск и визуальные фильтры
- Избранное на тестовом локальном состоянии
- Форма добавления объявления
- Профиль со статистикой, вкладками и сеткой товаров
- Мобильная адаптация Chrome/Safari
- Главная лента не прокручивается вертикально
- Остальные экраны имеют отдельную вертикальную прокрутку
- Анимации переходов, свайпов, кнопок и карточек
- Подготовлен typed API client: `frontend/src/lib/api.ts`

## Реализованный backend

Версия API: `0.2.0`

Модули:

- `backend/app/config.py` — environment settings and CORS
- `backend/app/database.py` — async SQLAlchemy connection
- `backend/app/models.py` — database models
- `backend/app/schemas.py` — Pydantic API contracts
- `backend/app/marketplace.py` — marketplace routes
- `backend/app/main.py` — application entrypoint

Таблицы:

- `profiles`
- `products`
- `product_images`
- `favorites`
- `swipe_actions`
- `product_views`

API:

- `POST /api/v1/profiles`
- `GET /api/v1/profiles/{profile_id}`
- `POST /api/v1/products`
- `GET /api/v1/products`
- `GET /api/v1/products/{product_id}`
- `POST /api/v1/products/{product_id}/view`
- `POST /api/v1/products/{product_id}/favorite`
- `DELETE /api/v1/products/{product_id}/favorite`
- `GET /api/v1/profiles/{profile_id}/favorites`
- `POST /api/v1/products/{product_id}/swipe`

## Важные правила UI

- Главный экран занимает ровно видимую высоту браузера и не скроллится.
- Тап по левой половине фото показывает предыдущее фото.
- Тап по правой половине фото показывает следующее фото.
- Горизонтальное перетаскивание всей карточки отвечает за like/skip.
- Полная карточка товара скроллится вертикально.
- Нижняя навигация всегда закреплена.
- Фото продавца хранятся оригиналами; первое или отмеченное фото является обложкой.
- Один товар может содержать от 1 до 10 фотографий.

## Следующие задачи

1. Подключить Supabase Auth к frontend.
2. Привязать `profiles.id` к `auth.users.id`.
3. Сделать bucket `product-images` в Supabase Storage.
4. Реализовать загрузку до 10 фото и изменение их порядка.
5. Перевести ленту с mock-массива на `GET /api/v1/products`.
6. Перевести свайпы и избранное на backend API.
7. Перевести форму публикации на `POST /api/v1/products`.
8. Добавить редактирование, удаление, архив и статус sold.
9. Реализовать чаты.
10. Построить рекомендации на событиях view, like, skip, favorite и message.

## Ограничения текущего этапа

- Авторизация ещё не подключена.
- UI пока продолжает показывать mock-товары.
- Загрузка файлов в Storage ещё не реализована.
- API создан, но production deployment и подключение к Supabase необходимо проверить после Render deploy.

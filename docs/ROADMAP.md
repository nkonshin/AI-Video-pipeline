# AI Video Pipeline — Roadmap

## Текущий статус

- Pipeline (генерация видео через CLI) — готов
- Web UI Design Spec — утверждена
- Backend Implementation Plan — написан (14 задач)
- Frontend / Integration — планирование предстоит

---

## Phase 1: Backend (FastAPI)
**Срок: 1-2 дня** | **Статус: план готов, реализация не начата**

Обёртка существующего pipeline в REST API + WebSocket.

| День | Задачи | Что получим |
|------|--------|-------------|
| День 1 | Tasks 1-7: Setup, DB модели, схемы, Settings API, Scenarios API, Videos API, Video Service | Рабочий API: CRUD видео и сценариев, генерация сценариев из шаблонов, настройки |
| День 2 | Tasks 8-14: WebSocket, генерация видео (background), Publishing API, Alembic, static files, CLAUDE.md | Полный бэкенд: запуск генерации через API, прогресс в реальном времени, публикация |

**Артефакт:** Полностью рабочий API на `localhost:8000` с тестами.

---

## Phase 2: Frontend Design & Planning
**Срок: 0.5 дня** | **Статус: предстоит**

Написание Implementation Plan для React-фронтенда на основе утверждённой дизайн-спеки.

| Задача | Описание |
|--------|----------|
| Brainstorm уточнения | Финальные вопросы по UI-деталям (анимации, transitions, responsive) |
| Plan: Frontend | Детальный план с кодом: setup Vite, Tailwind тема, Layout, каждая из 6 страниц |

**Артефакт:** `docs/superpowers/plans/YYYY-MM-DD-frontend-react.md`

---

## Phase 3: Frontend (React + Vite + Tailwind)
**Срок: 3-4 дня** | **Статус: предстоит**

Реализация всех 6 страниц интерфейса.

| День | Задачи | Что получим |
|------|--------|-------------|
| День 1 | Vite setup, Tailwind тема (Dark Premium), shadcn/ui, Layout + Sidebar, React Router | Каркас приложения с навигацией |
| День 2 | Dashboard (stats, active jobs, recent videos), Create Video (content type selector, scene editor, accordions, cost estimate) | Два главных экрана |
| День 3 | My Videos (grid/list, фильтры, video detail page с плеером), Scenarios (список, YAML редактор) | Галерея видео и управление сценариями |
| День 4 | Publishing (платформы, лог публикаций), Settings (API keys, модели, бюджет), WebSocket интеграция (прогресс-бары) | Все 6 страниц + real-time обновления |

**Артефакт:** Полный фронтенд на `localhost:5173`, подключённый к API.

---

## Phase 4: Integration & Polish
**Срок: 1-2 дня** | **Статус: предстоит**

Связка фронт + бэк, end-to-end тестирование, полировка.

| День | Задачи | Что получим |
|------|--------|-------------|
| День 1 | E2E: создать видео через UI -> генерация -> просмотр результата. Обработка ошибок, loading states, edge cases | Работающий продукт end-to-end |
| День 2 | UI polish: анимации, transitions, glassmorphism эффекты, адаптация под разные размеры экрана. Скрипт запуска (один `make run` для обоих серверов) | Production-grade внешний вид |

**Артефакт:** Готовый к демонстрации продукт.

---

## Phase 5: Optional Enhancements
**Срок: по желанию** | **Приоритет: низкий**

| Фича | Описание | Сложность |
|-------|----------|-----------|
| Docker Compose | Один `docker compose up` для всего стека | Средняя |
| Drag & Drop сцены | Перетаскивание сцен в редакторе | Низкая |
| Batch Generation | UI для массовой генерации эпизодов | Средняя |
| Voice Preview | Предпрослушка голоса перед генерацией | Низкая |
| Analytics Dashboard | Графики расходов, статистика по платформам | Средняя |
| Mobile Responsive | Адаптация под мобильные устройства | Средняя |

---

## Общая оценка

| Фаза | Срок | Кумулятивно |
|-------|------|-------------|
| Phase 1: Backend | 1-2 дня | 1-2 дня |
| Phase 2: Frontend Plan | 0.5 дня | 2-2.5 дня |
| Phase 3: Frontend | 3-4 дня | 5-6.5 дней |
| Phase 4: Integration | 1-2 дня | 6-8.5 дней |
| **Итого до MVP** | | **~7 рабочих дней** |

*Оценки даны для работы через AI-assisted coding (Claude Code). При ручной разработке сроки были бы x3-x5.*

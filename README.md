# AI Video Pipeline

Полностью автоматизированный конвейер для создания коротких видеороликов с помощью ИИ и публикации на всех популярных платформах.

## Что это?

Конвейер превращает текстовый сценарий в готовый видеоролик:

```
Сценарий → Генерация картинок → Генерация видео → Озвучка → Субтитры → Сборка → Публикация
```

**Поддерживаемые платформы:** Instagram Reels, TikTok, YouTube Shorts, ВКонтакте, Telegram

**AI-модели (Replicate.com):**
- Картинки: FLUX 1.1 Pro, FLUX Dev, FLUX Schnell, SDXL
- Видео: Hailuo 2.3, Kling v2.5/v3, Wan 2.5, Seedance, Veo 3.1
- Озвучка: Edge TTS (бесплатно, русский), Chatterbox Multilingual (русский, $0.008/запрос)

## Три типа контента

### 1. AI-мультсериал "Семейка Ягодок" (`fruit-soap`)
Тренд русского Инстаграма — мультик с антропоморфными фруктами и овощами в формате мыльной оперы. Папа Клубничка, Мама Клубничка, Сын Помидорчик, Дядя Огурец — семейные драмы, секреты, неожиданные повороты.

### 2. Ремикс персонажей (`character-remix`)
Берём известных персонажей (Шрек, Эльза, Губка Боб, Чебурашка, Маша) и помещаем в необычные контексты: записывает рэп, работает курьером, становится фитнес-блогером.

### 3. Бизнес-маскот (`mascot`)
Маскот для бизнеса — Дом Домыч для недвижимости, Гаечка для автосервиса, Бариста Бинни для кофейни. Полезный контент в весёлом формате.

## Быстрый старт

### 1. Установка

```bash
# Клонируем и устанавливаем
pip install -e .

# Или просто зависимости
pip install -r requirements.txt
```

### 2. Настройка

```bash
cp .env.example .env
# Отредактируйте .env — минимум нужен REPLICATE_API_TOKEN
```

### 3. Генерация сценария

```bash
# Мультсериал с фруктами
videopipe generate-scenario fruit-soap -o episode1.yaml

# Шрек записывает рэп
videopipe generate-scenario character-remix -c Шрек --context 0 -o shrek_rap.yaml

# Маскот для агентства недвижимости
videopipe generate-scenario mascot -b недвижимость --company "Дом Мечты" -o mascot.yaml
```

### 4. Запуск конвейера

```bash
# Полный конвейер — от генерации до публикации
videopipe run episode1.yaml

# Без публикации (только создать видео)
videopipe run episode1.yaml --skip-publish

# Пропустить генерацию картинок (использовать свои)
videopipe run episode1.yaml --skip-images --images-dir ./my_images/

# Только собрать видео из готовых компонентов
videopipe run episode1.yaml --skip-images --skip-video --skip-tts \
  --images-dir ./images/ --videos-dir ./videos/ --audio-dir ./audio/
```

### 5. Батч-генерация (несколько серий сразу)

```bash
# 10 серий мультика
videopipe batch fruit-soap -n 10 -o ./episodes/

# 3 эпизода с Шреком
videopipe batch character-remix -n 3 -c Шрек -o ./shrek/

# Полный запуск серии
python scripts/generate_series.py --type fruit-soap --episodes 10
python scripts/generate_series.py --type fruit-soap --episodes 5 --skip-publish --dry-run
```

## Настройка публикации

### Telegram
1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Добавьте бота администратором в ваш канал
3. Укажите `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHANNEL_ID` в `.env`

### Instagram
1. Укажите `INSTAGRAM_USERNAME` и `INSTAGRAM_PASSWORD` в `.env`
2. Библиотека `instagrapi` логинится автоматически
3. Сессия сохраняется для избежания повторных логинов

### YouTube
1. Создайте OAuth2 credentials в [Google Cloud Console](https://console.cloud.google.com/)
2. Скачайте `client_secret.json` в корень проекта
3. При первом запуске откроется браузер для авторизации

### ВКонтакте
1. Создайте standalone-приложение на [vk.com/dev](https://vk.com/dev)
2. Получите access token с правами `video,wall`
3. Укажите `VK_ACCESS_TOKEN` и `VK_GROUP_ID` в `.env`

### TikTok
- **С API:** Зарегистрируйте приложение на [developers.tiktok.com](https://developers.tiktok.com), получите Content Posting API
- **Без API:** Конвейер подготовит файл и метаданные для ручной загрузки

## Структура проекта

```
├── pipeline/
│   ├── cli.py                    # CLI интерфейс (videopipe)
│   ├── config.py                 # Конфигурация и модели данных
│   ├── orchestrator.py           # Главный оркестратор конвейера
│   ├── generators/
│   │   ├── replicate_client.py   # Клиент Replicate API с бюджетом
│   │   ├── image_gen.py          # Генерация картинок
│   │   ├── video_gen.py          # Генерация видео (image-to-video)
│   │   ├── tts_gen.py            # Озвучка (Edge TTS / Replicate)
│   │   ├── subtitle_gen.py       # Генерация субтитров (SRT)
│   │   └── scenario_gen.py       # Генераторы сценариев
│   ├── assembler/
│   │   └── video_assembler.py    # Сборка видео (FFmpeg)
│   └── publishers/
│       ├── base.py               # Базовый класс паблишера
│       ├── publish_manager.py    # Менеджер публикации
│       ├── telegram_pub.py       # Telegram
│       ├── instagram_pub.py      # Instagram Reels
│       ├── youtube_pub.py        # YouTube Shorts
│       ├── vk_pub.py             # ВКонтакте
│       └── tiktok_pub.py         # TikTok
├── configs/                      # Готовые конфиги сценариев
│   ├── fruit_soap_ep1.yaml
│   ├── character_remix_shrek.yaml
│   └── mascot_realestate.yaml
├── scripts/
│   ├── run_batch.sh              # Пакетный запуск
│   └── generate_series.py        # Генерация полного сезона
├── output/                       # Выходные файлы
├── .env.example                  # Пример переменных окружения
└── pyproject.toml                # Зависимости проекта
```

## Управление бюджетом

Конвейер отслеживает расходы на Replicate API:

| Модель | ~Цена за 1 запуск | Примечание |
|--------|-------------------|------------|
| FLUX 1.1 Pro (картинка) | ~$0.04 | Лучшее качество |
| FLUX Dev (картинка) | ~$0.025 | Хороший баланс |
| FLUX Schnell (картинка) | ~$0.003 | Быстро и дёшево |
| Hailuo 2.3 (видео) | ~$0.30 | По умолчанию, отличное качество |
| Hailuo 2.3 Fast (видео) | ~$0.12 | Бюджетный вариант |
| Kling v2.5 Turbo Pro (видео) | ~$0.50 | Лучшая плавность движений |
| Wan 2.2 I2V Fast (видео) | ~$0.09 | Самый дешёвый |
| Edge TTS (озвучка) | Бесплатно | Русский язык |
| Chatterbox Multilingual (озвучка) | ~$0.008 | Клонирование голоса, русский |

**Пример расчёта для 1 эпизода (4 сцены):**

| Конфигурация | Картинки | Видео | Озвучка | Итого | Эпизодов на $50 |
|---|---|---|---|---|---|
| Премиум | FLUX Pro ($0.16) | Hailuo 2.3 ($1.20) | Edge TTS ($0) | **~$1.36** | ~36 |
| Стандарт | FLUX Dev ($0.10) | Hailuo 2.3 Fast ($0.48) | Edge TTS ($0) | **~$0.58** | ~86 |
| Бюджет | FLUX Schnell ($0.012) | Wan 2.2 Fast ($0.36) | Edge TTS ($0) | **~$0.37** | ~135 |

## Кастомизация

### Свой сценарий
Создайте YAML-файл по образцу `configs/fruit_soap_ep1.yaml`. Ключевые поля:
- `scenario.scenes[]` — список сцен с промптами и текстом озвучки
- `scenario.style_prompt` — стилевой промпт для всех картинок
- `scenario.character_descriptions` — описания персонажей

### Другие модели
Поменяйте `image_model.model_id` и `video_model.model_id` в YAML:
```yaml
image_model:
  model_id: "black-forest-labs/flux-dev"        # дешевле
  # model_id: "black-forest-labs/flux-schnell"   # самый дешёвый
video_model:
  model_id: "minimax/hailuo-2.3-fast"           # быстро и дёшево
  # model_id: "kwaivgi/kling-v2.5-turbo-pro"    # лучшее движение
  # model_id: "wan-video/wan-2.2-i2v-fast"      # самый дешёвый
  # model_id: "bytedance/seedance-1-pro"        # от ByteDance
  # model_id: "google/veo-3.1"                  # топ качество (дорого)
```

### Другой движок озвучки
```yaml
tts:
  engine: edge-tts                    # бесплатно (по умолчанию)
  voice: ru-RU-DmitryNeural
  # Или через Replicate с клонированием голоса:
  # engine: replicate
  # replicate_model_id: "resemble-ai/chatterbox-multilingual"
```

### Другой голос
Edge TTS поддерживает разные голоса:
- `ru-RU-DmitryNeural` — мужской (по умолчанию)
- `ru-RU-SvetlanaNeural` — женский
- `ru-RU-DariyaNeural` — женский (альтернативный)

## Требования

- Python 3.10+
- FFmpeg (для сборки видео)
- Аккаунт на [replicate.com](https://replicate.com) с API-токеном
- Аккаунты на платформах для публикации

# Подготовка Human Dataset

## Источники данных

| Источник | Репозиторий | Данные |
|----------|-------------|--------|
| Ru-hard-detection-dataset | [CoffeBank/Ru-hard-detection-dataset](https://github.com/CoffeBank/Ru-hard-detection-dataset) | Оригинальные тексты (news, essays, scientific) |
| AINL-Eval-2025 | [iis-research-team/AINL-Eval-2025](https://github.com/iis-research-team/AINL-Eval-2025) | Train set (human-labeled) |

## Структура файлов

```
backend/src/humanDataset/
├── originsForHumanDataset/       # Исходные файлы
│   ├── original_essay.json       # 480 эссе
│   ├── original_news.json        # 480 новостей
│   └── orig_scientific.json      # 479 научных текстов
├── train.csv                     # Train set из AINL-Eval-2025
├── fullHumanDataset.json         # Полный датасет (9965 записей)
└── trainingHumanDataset.json     # Тестовый датасет (200 записей)
```

## Шаги подготовки

### 1. Скачивание исходных данных

```bash
# Ru-hard-detection-dataset
git clone https://github.com/CoffeBank/Ru-hard-detection-dataset

# AINL-Eval-2025
git clone https://github.com/iis-research-team/AINL-Eval-2025
```

### 2. Копирование файлов

Из `Ru-hard-detection-dataset/main/`:
- `news/original_news.json`
- `essay/original_essay.json`
- `scientific_texts/orig_scientific.json`

Из `AINL-Eval-2025/data/`:
- `train.csv`

### 3. Объединение датасетов

```bash
cd backend/src/humanDataset
node mergeJsons.js
```

Скрипт:
- Парсит JSON файлы из Ru-hard-detection-dataset
- Извлекает записи с `label: "human"` из train.csv
- Очищает тексты (удаляет "Введение" в начале)
- Объединяет всё в единый формат

### 4. Формирование тестового датасета

Из `fullHumanDataset.json` вручную выбрано 200 записей для `trainingHumanDataset.json`.

### 5. Нормализация ID

```bash
npx ts-node src/humanDataset/normalizeIds.ts
```

## Формат записи

```json
{
  "id": 1,
  "origin": "Lenta.ru news",
  "text": "Текст статьи..."
}
```

## Статистика

| Датасет | Записей | ID |
|---------|---------|-----|
| fullHumanDataset.json | 9965 | 1–9965 |
| trainingHumanDataset.json | 200 | 1–200 |

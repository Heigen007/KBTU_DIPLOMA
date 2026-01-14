# Подготовка Human Dataset

## Источники данных

| Источник | Репозиторий | Данные |
|----------|-------------|--------|
| Ru-hard-detection-dataset | [CoffeBank/Ru-hard-detection-dataset](https://github.com/CoffeBank/Ru-hard-detection-dataset) | Оригинальные тексты (news, essays, scientific) |
| AINL-Eval-2025 | [iis-research-team/AINL-Eval-2025](https://github.com/iis-research-team/AINL-Eval-2025) | Train set (human-labeled) |

## Структура файлов

```
backend/src/humanDataset/
├── originsForHumanDataset/           # Исходные файлы
│   ├── original_essay.json           # 480 эссе
│   ├── original_news.json            # 480 новостей
│   └── orig_scientific.json          # 479 научных текстов
├── train.csv                         # Train set из AINL-Eval-2025
├── fullHumanDataset.json             # Полный датасет (9965 записей)
├── fullHumanDatasetFiltered.json     # Отфильтрованный (9290, <500 токенов)
├── trainingHumanDataset.json         # Тестовый датасет (200 записей)
└── trainingHumanDatasetFiltered.json # Отфильтрованный (116, <500 токенов)
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

### 6. Фильтрация по токенам

RuBERT имеет лимит 512 токенов. Фильтруем записи, оставляя только тексты < 500 токенов.

```bash
npx ts-node src/humanDataset/filterByTokens.ts
```

Скрипт:
- Использует токенизатор `bert-base-multilingual-cased`
- Фильтрует записи с количеством токенов < 500
- Создаёт `*Filtered.json` файлы

| Датасет | До | После | Удалено |
|---------|-----|-------|---------|
| fullHumanDataset | 9965 | 9290 | 675 |
| trainingHumanDataset | 200 | 116 | 84 |

## Формат записи

```json
{
  "id": 1,
  "origin": "Lenta.ru news",
  "text": "Текст статьи..."
}
```

## Статистика

| Датасет | Записей |
|---------|---------|
| fullHumanDataset.json | 9965 |
| fullHumanDatasetFiltered.json | 9290 |
| trainingHumanDataset.json | 200 |
| trainingHumanDatasetFiltered.json | 116 |

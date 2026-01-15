# Подготовка Human Dataset

## Источники данных

| Источник | Репозиторий | Данные |
|----------|-------------|--------|
| Ru-hard-detection-dataset | [CoffeBank/Ru-hard-detection-dataset](https://github.com/CoffeBank/Ru-hard-detection-dataset) | Оригинальные тексты (news, essays, scientific) |
| AINL-Eval-2025 | [iis-research-team/AINL-Eval-2025](https://github.com/iis-research-team/AINL-Eval-2025) | Train set (human-labeled) |
| CoAT | [RussianNLP/CoAT](https://github.com/RussianNLP/CoAT) | datasets/binary/train.csv (label=0, >150 слов) |

### CoAT (Corpus of Artificial Texts)

Крупный корпус для русского языка, содержащий 246k человеческих текстов и искусственные тексты от 13 нейросетевых моделей.

**Цитирование:**
```bibtex
@article{shamardina2025coat,
  title={CoAT: Corpus of artificial texts},
  author={Shamardina, Tatiana and Saidov, Marat and Fenogenova, Alena and others},
  journal={Natural Language Processing},
  volume={31},
  number={1},
  pages={150--175},
  year={2025},
  publisher={Cambridge University Press}
}
```

## Структура файлов

```
backend/src/datasets/humanDataset/
├── originsForHumanDataset/           # Исходные файлы
│   ├── original_essay.json           # 480 эссе
│   ├── original_news.json            # 480 новостей
│   ├── orig_scientific.json          # 479 научных текстов
│   ├── train.csv                     # Train set из AINL-Eval-2025
│   └── train2.csv                    # CoAT binary dataset
├── output/                           # Результирующие датасеты
│   ├── fullHumanDataset.json         # Полный датасет
│   ├── fullHumanDatasetFiltered.json # Отфильтрованный (<500 токенов)
│   ├── trainingHumanDataset.json     # Тестовый датасет
│   └── trainingHumanDatasetFiltered.json
├── mergeJsons.ts                     # Скрипт объединения
├── filterByTokens.ts                 # Скрипт фильтрации
└── README.md
```

## Быстрый старт

```bash
cd backend
npm run prepare-dataset
```

Эта команда запускает оба скрипта последовательно:
1. `mergeJsons.ts` — объединяет исходные данные
2. `filterByTokens.ts` — фильтрует по лимиту токенов

## Шаги подготовки (вручную)

### 1. Скачивание исходных данных

```bash
git clone https://github.com/CoffeBank/Ru-hard-detection-dataset
git clone https://github.com/iis-research-team/AINL-Eval-2025
```

### 2. Копирование файлов в originsForHumanDataset/

Из `Ru-hard-detection-dataset/main/`:
- `news/original_news.json`
- `essay/original_essay.json`
- `scientific_texts/orig_scientific.json`

Из `AINL-Eval-2025/data/`:
- `train.csv`

### 3. Объединение датасетов

```bash
npx ts-node humanDataset/mergeJsons.ts
```

Скрипт:
- Парсит JSON файлы из Ru-hard-detection-dataset
- Извлекает записи с `label: "human"` из train.csv
- Очищает тексты (удаляет "Введение" в начале)
- Сохраняет в `output/fullHumanDataset.json`

### 4. Формирование тестового датасета

Вручную выбрать записи для `output/trainingHumanDataset.json`.

### 5. Фильтрация по токенам

```bash
npx ts-node humanDataset/filterByTokens.ts
```

RuBERT имеет лимит 512 токенов. Скрипт:
- Использует токенизатор `bert-base-multilingual-cased`
- Фильтрует записи с количеством токенов < 500
- Переиндексирует записи
- Создаёт `*Filtered.json` файлы

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
| fullHumanDataset.json | 12514 |
| fullHumanDatasetFiltered.json | 11725 |
| trainingHumanDataset.json | 200 |
| trainingHumanDatasetFiltered.json | 116 |

### По источникам

| Источник | Записей |
|----------|---------|
| Essays | 480 |
| News | 480 |
| Scientific | 479 |
| AINL-Eval-2025 train.csv | 8769 |
| RussianNLP/CoAT (>150 слов) | 2306 |

# AI Dataset Generator

Ферма для генерации AI-текстов различными моделями.

## Структура

```
backend/aiDataset/
├── generators/                    # Генераторы
│   ├── AIGeneratorFarm.ts         # Базовый абстрактный класс
│   ├── index.ts                   # Экспорты
│   └── ... (конкретные генераторы)
├── output/                        # Сгенерированные датасеты
│   ├── GPT_4.json
│   ├── Claude_3.json
│   ├── GigaChat.json
│   └── fullAIDataset.json         # Объединённый датасет
├── types.ts                       # Типы
├── mergeDatasets.ts               # Скрипт сборки
└── README.md
```

## Использование

### Создание генератора для новой модели

```typescript
import { AIGeneratorFarm } from "./generators/AIGeneratorFarm";

class OpenAIGenerator extends AIGeneratorFarm {
    constructor(apiKey: string) {
        super(apiKey, "GPT-4");
    }

    protected async callAPI(prompt: string): Promise<string> {
        // Реализация вызова OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content || "";
    }
}
```

### Генерация датасета

```typescript
const generator = new OpenAIGenerator(process.env.OPENAI_API_KEY);

// Генерация: 20 тем для каждого типа (essay, news, scientific)
// = 60 текстов (20 × 3 типа)
const entries = await generator.generateDataset(20);

// Сохранение в output/GPT_4.json
generator.saveToJSON(entries);
```

### Сборка всех датасетов

```bash
npm run merge-ai-dataset
```

## Формат записи

```json
{
  "id": 1,
  "model": "GPT-4",
  "generatedAt": "2025-01-15T12:00:00.000Z",
  "type": "essay",
  "wordCount": 200,
  "text": "Текст..."
}
```

## Типы текстов

| Тип | Описание | Стиль |
|-----|----------|-------|
| `essay` | Эссе | Академический, с аргументацией |
| `news` | Новости | Журналистский, информативный |
| `scientific` | Научные статьи | Научно-популярный |

## Длины текстов

Тексты генерируются равномерно распределёнными по длинам:
- 25% — 150 слов
- 25% — 200 слов
- 25% — 250 слов
- 25% — 300 слов

## Планируемые генераторы

- [ ] OpenAI (GPT-4, GPT-4o)
- [ ] Anthropic (Claude 3)
- [ ] Sber (GigaChat)
- [ ] Yandex (YandexGPT)
- [ ] Google (Gemini)
- [ ] Mistral
- [ ] DeepSeek

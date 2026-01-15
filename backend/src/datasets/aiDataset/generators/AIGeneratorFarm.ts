import * as fs from "fs";
import * as path from "path";
import { TextType, WordCount, GeneratedEntry } from "../types";
import { countTokens } from "../../../ai/tokenize";

const OUTPUT_DIR = path.join(__dirname, "..", "output");
const WORD_COUNTS: WordCount[] = [150, 200, 250, 300];
const MAX_TOKENS = 500;

export abstract class AIGeneratorFarm {
    protected apiKey: string;
    protected modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    // ==================== ПРОМПТЫ ====================

    /**
     * Промпт для генерации тем
     */
    protected getTopicsPrompt(type: TextType, count: number): string {
        const typeDescriptions: Record<TextType, string> = {
            essay: "школьные/студенческие эссе на исторические, литературные, общественные, философские, экологические, культурные темы",
            news: "новостные статьи на актуальные темы (политика, экономика, технологии, спорт, культура, медицина, образование, общество)",
            scientific: "научно-популярные статьи (физика, биология, медицина, экология, IT, экономика, психология, история науки)"
        };

        return `Сгенерируй ${count} разнообразных тем для написания текстов типа: ${typeDescriptions[type]}.

Требования:
- Темы должны быть на русском языке
- Темы должны быть разнообразными и интересными
- Каждая тема на отдельной строке
- Только темы, без нумерации и пояснений

Выведи только список тем:`;
    }

    /**
     * Промпт для генерации текста по теме
     */
    protected getTextPrompt(type: TextType, topic: string, wordCount: WordCount): string {
        const styleInstructions: Record<TextType, string> = {
            essay: `Напиши эссе на тему "${topic}".`,
            news: `Напиши новостную статью на тему "${topic}".`,
            scientific: `Напиши научно-популярную статью на тему "${topic}".`
        };

        return `${styleInstructions[type]}

Требования:
- Текст на русском языке
- Объём: примерно ${wordCount} слов
- Текст должен быть связным и законченным
- Не используй маркированные списки
- Выведи только сам текст, без пояснений`;
    }

    /**
     * Отправка запроса к API модели (реализуется в наследниках)
     */
    protected abstract callAPI(prompt: string): Promise<string>;

    /**
     * Генерация тем для указанного типа текста
     */
    async generateTopics(type: TextType, count: number): Promise<string[]> {
        const prompt = this.getTopicsPrompt(type, count);
        const response = await this.callAPI(prompt);

        const topics = response
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, count);

        console.log(`[${this.modelName}] Сгенерировано ${topics.length} тем для "${type}"`);
        return topics;
    }

    /**
     * Генерация текста по теме
     */
    async generateText(type: TextType, topic: string, wordCount: WordCount): Promise<string> {
        const prompt = this.getTextPrompt(type, topic, wordCount);
        const text = await this.callAPI(prompt);
        console.log(`[${this.modelName}] Сгенерирован текст (${wordCount} слов) на тему: "${topic.substring(0, 50)}..."`);
        return text.trim();
    }

    /**
     * Полный цикл генерации датасета
     * @param topicsPerType количество тем для каждого типа
     */
    async generateDataset(topicsPerType: number): Promise<GeneratedEntry[]> {
        const types: TextType[] = ["essay", "news", "scientific"];
        const entries: GeneratedEntry[] = [];
        let id = 1;

        for (const type of types) {
            console.log(`\n[${this.modelName}] Генерация тем для "${type}"...`);
            const topics = await this.generateTopics(type, topicsPerType);

            // Распределяем темы по длинам (четверть на каждую)
            const topicsPerWordCount = Math.ceil(topics.length / WORD_COUNTS.length);

            for (let i = 0; i < topics.length; i++) {
                const topic = topics[i];
                const wordCountIndex = Math.floor(i / topicsPerWordCount);
                const wordCount = WORD_COUNTS[Math.min(wordCountIndex, WORD_COUNTS.length - 1)];

                try {
                    const text = await this.generateText(type, topic, wordCount);

                    // Проверка количества токенов
                    const tokens = await countTokens(text);
                    if (tokens >= MAX_TOKENS) {
                        console.log(`[${this.modelName}] Пропущен текст (${tokens} токенов > ${MAX_TOKENS})`);
                        continue;
                    }

                    entries.push({
                        id: id++,
                        model: this.modelName,
                        generatedAt: new Date().toISOString(),
                        type,
                        topic,
                        wordCount,
                        text
                    });

                    // Задержка между запросами
                    await this.delay(1000);
                } catch (error) {
                    console.error(`[${this.modelName}] Ошибка генерации текста: ${error}`);
                }
            }
        }

        return entries;
    }

    /**
     * Сохранение записей в JSON файл модели
     */
    saveToJSON(entries: GeneratedEntry[]): string {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const filename = `${this.modelName.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);

        let existingEntries: GeneratedEntry[] = [];
        if (fs.existsSync(filepath)) {
            existingEntries = JSON.parse(fs.readFileSync(filepath, "utf-8"));
        }

        // Переиндексация
        const allEntries = [...existingEntries, ...entries];
        const reindexed = allEntries.map((entry, index) => ({
            ...entry,
            id: index + 1
        }));

        fs.writeFileSync(filepath, JSON.stringify(reindexed, null, 2), "utf-8");
        console.log(`[${this.modelName}] Сохранено ${entries.length} записей в ${filename}`);
        console.log(`[${this.modelName}] Всего записей: ${reindexed.length}`);

        return filepath;
    }

    /**
     * Собирает все JSON файлы из output в один fullAIDataset.json
     */
    static mergeAllDatasets(): GeneratedEntry[] {
        if (!fs.existsSync(OUTPUT_DIR)) {
            console.log("Папка output не существует");
            return [];
        }

        const files = fs.readdirSync(OUTPUT_DIR)
            .filter(f => f.endsWith(".json") && f !== "fullAIDataset.json");

        const allEntries: GeneratedEntry[] = [];

        for (const file of files) {
            const filepath = path.join(OUTPUT_DIR, file);
            const entries: GeneratedEntry[] = JSON.parse(fs.readFileSync(filepath, "utf-8"));
            allEntries.push(...entries);
            console.log(`Загружено ${entries.length} записей из ${file}`);
        }

        // Переиндексация
        const reindexed = allEntries.map((entry, index) => ({
            ...entry,
            id: index + 1
        }));

        // Сохранение
        const outputPath = path.join(OUTPUT_DIR, "fullAIDataset.json");
        fs.writeFileSync(outputPath, JSON.stringify(reindexed, null, 2), "utf-8");
        console.log(`\nСобрано ${reindexed.length} записей в fullAIDataset.json`);

        return reindexed;
    }

    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

import dotenv from "dotenv";
import { OpenAIGenerator } from "../generators";

dotenv.config();

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.2";
const TOPICS_PER_TYPE = 20; // 20 тем × 3 типа = 60 текстов

async function main() {
    if (!API_KEY) {
        console.error("OPENAI_API_KEY не установлен в .env");
        process.exit(1);
    }

    console.log(`Запуск генерации с моделью: ${MODEL}`);
    console.log(`Тем на каждый тип: ${TOPICS_PER_TYPE}`);
    console.log(`Всего текстов: ${TOPICS_PER_TYPE * 3}\n`);

    const generator = new OpenAIGenerator(API_KEY, MODEL);

    const entries = await generator.generateDataset(TOPICS_PER_TYPE);
    generator.saveToJSON(entries);

    console.log("\nГенерация завершена!");
}

main().catch(console.error);

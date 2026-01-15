import dotenv from "dotenv";
import { OpenRouterGenerator } from "../generators";

dotenv.config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemini-3-flash-preview";
const TOPICS_PER_TYPE = 2;

async function main() {
    if (!API_KEY) {
        console.error("OPENROUTER_API_KEY не установлен в .env");
        process.exit(1);
    }

    console.log(`Запуск генерации для модели: ${MODEL}`);
    console.log(`Тем на каждый тип текста: ${TOPICS_PER_TYPE}`);

    const generator = new OpenRouterGenerator(API_KEY, MODEL);
    const entries = await generator.generateDataset(TOPICS_PER_TYPE);

    generator.saveToJSON(entries);
    console.log("\nГенерация завершена!");
}

main().catch(console.error);

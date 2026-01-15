import * as fs from "fs";
import * as path from "path";

const baseDir = __dirname;
const originsDir = path.join(baseDir, "originsForHumanDataset");
const outputDir = path.join(baseDir, "output");

// Пути к исходным файлам
const essayPath = path.join(originsDir, "original_essay.json");
const newsPath = path.join(originsDir, "original_news.json");
const scientificPath = path.join(originsDir, "orig_scientific.json");
const trainCsvPath = path.join(originsDir, "train.csv");
const train2CsvPath = path.join(originsDir, "train2.csv");

interface SourceEntry {
    id: number;
    text: string;
    source: string;
    dataset: string;
}

interface OutputEntry {
    id: number;
    origin: string;
    text: string;
}

// Читаем JSON файлы
const essays: SourceEntry[] = JSON.parse(fs.readFileSync(essayPath, "utf-8"));
const news: SourceEntry[] = JSON.parse(fs.readFileSync(newsPath, "utf-8"));
const scientific: SourceEntry[] = JSON.parse(fs.readFileSync(scientificPath, "utf-8"));

console.log(`Essays: ${essays.length}`);
console.log(`News: ${news.length}`);
console.log(`Scientific: ${scientific.length}`);

// Парсим CSV формата text,label (train.csv)
function parseCSV(content: string): { text: string; label: string }[] {
    const lines = content.split("\n");
    const results: { text: string; label: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const lastCommaIndex = line.lastIndexOf(",");
        if (lastCommaIndex === -1) continue;

        let text = line.substring(0, lastCommaIndex);
        const label = line.substring(lastCommaIndex + 1);

        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }

        results.push({ text, label });
    }
    return results;
}

// Парсим CSV формата id,text,label (train2.csv)
function parseCSV2(content: string): { id: string; text: string; label: string }[] {
    const lines = content.split("\n");
    const results: { id: string; text: string; label: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Находим первую и последнюю запятую
        const firstCommaIndex = line.indexOf(",");
        const lastCommaIndex = line.lastIndexOf(",");
        if (firstCommaIndex === -1 || lastCommaIndex === -1 || firstCommaIndex === lastCommaIndex) continue;

        const id = line.substring(0, firstCommaIndex);
        let text = line.substring(firstCommaIndex + 1, lastCommaIndex);
        const label = line.substring(lastCommaIndex + 1);

        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }

        results.push({ id, text, label });
    }
    return results;
}

// Подсчёт слов в тексте
function countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

const trainCsv = parseCSV(fs.readFileSync(trainCsvPath, "utf-8"));
const humanFromCsv = trainCsv
    .filter(row => row.label === "human")
    .map(row => ({ text: row.text, dataset: "AINL-Eval-2025 train.csv" }));

console.log(`CSV human (train.csv): ${humanFromCsv.length}`);

// Парсим train2.csv: label=0 означает человеческий текст, фильтруем по количеству слов > 150
const train2Csv = parseCSV2(fs.readFileSync(train2CsvPath, "utf-8"));
const humanFromCsv2 = train2Csv
    .filter(row => row.label === "0" && countWords(row.text) > 150)
    .map(row => ({ text: row.text, dataset: "RussianNLP/CoAT" }));

console.log(`CSV human (train2.csv, >150 words): ${humanFromCsv2.length}`);

// Объединяем все записи
const allRecords = [
    ...essays.map(r => ({ text: r.text, dataset: r.dataset })),
    ...news.map(r => ({ text: r.text, dataset: r.dataset })),
    ...scientific.map(r => ({ text: r.text, dataset: r.dataset })),
    ...humanFromCsv,
    ...humanFromCsv2
];

// Очистка текста
function cleanText(text: string): string {
    let cleaned = text.trim();
    if (cleaned.toLowerCase().startsWith("введение")) {
        cleaned = cleaned.slice("введение".length).trim();
    }
    return cleaned;
}

// Преобразуем в выходной формат
const result: OutputEntry[] = allRecords.map((record, index) => ({
    id: index + 1,
    origin: record.dataset,
    text: cleanText(record.text)
}));

// Создаём папку output если её нет
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Сохраняем результат
const outputPath = path.join(outputDir, "fullHumanDataset.json");
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

console.log(`\nГотово! Объединено ${result.length} записей`);
console.log(`Файл сохранён: ${outputPath}`);

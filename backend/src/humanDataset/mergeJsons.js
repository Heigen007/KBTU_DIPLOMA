const fs = require('fs');
const path = require('path');

const originsDir = path.join(__dirname, 'originsForHumanDataset');

// Пути к файлам
const essayPath = path.join(originsDir, 'original_essay.json');
const newsPath = path.join(originsDir, 'original_news.json');
const scientificPath = path.join(originsDir, 'orig_scientific.json');
const trainCsvPath = path.join(originsDir, 'train.csv');

// Читаем JSON файлы
const essays = JSON.parse(fs.readFileSync(essayPath, 'utf-8'));
const news = JSON.parse(fs.readFileSync(newsPath, 'utf-8'));
const scientific = JSON.parse(fs.readFileSync(scientificPath, 'utf-8'));

console.log(`Essays: ${essays.length}`);
console.log(`News: ${news.length}`);
console.log(`Scientific: ${scientific.length}`);

// Читаем и парсим CSV
function parseCSV(content) {
    const lines = content.split('\n');
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const lastCommaIndex = line.lastIndexOf(',');
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

const trainCsv = parseCSV(fs.readFileSync(trainCsvPath, 'utf-8'));
const humanFromCsv = trainCsv
    .filter(row => row.label === 'human')
    .map(row => ({ text: row.text, dataset: 'AINL-Eval-2025 train.csv' }));

console.log(`CSV human: ${humanFromCsv.length}`);

// Объединяем все записи
const allRecords = [
    ...essays.map(r => ({ text: r.text, dataset: r.dataset })),
    ...news.map(r => ({ text: r.text, dataset: r.dataset })),
    ...scientific.map(r => ({ text: r.text, dataset: r.dataset })),
    ...humanFromCsv
];

// Функция очистки текста
function cleanText(text) {
    let cleaned = text.trim();
    if (cleaned.toLowerCase().startsWith('введение')) {
        cleaned = cleaned.slice('введение'.length).trim();
    }
    return cleaned;
}

// Преобразуем в новый формат
const result = allRecords.map((record, index) => ({
    id: index + 1,
    origin: record.dataset,
    text: cleanText(record.text)
}));

// Сохраняем результат
const outputPath = path.join(__dirname, 'fullHumanDataset.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

console.log(`\nГотово! Объединено ${result.length} записей`);
console.log(`Файл сохранён: ${outputPath}`);

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Пути к оригинальным файлам
const essayPath = path.join(dataDir, 'essay', 'original_essay.json');
const newsPath = path.join(dataDir, 'news', 'original_news.json');
const scientificPath = path.join(dataDir, 'scientific_texts', 'orig_scientific.json');
const trainCsvPath = path.join(dataDir, 'train.csv');

// Читаем JSON файлы
const essays = JSON.parse(fs.readFileSync(essayPath, 'utf-8'));
const news = JSON.parse(fs.readFileSync(newsPath, 'utf-8'));
const scientific = JSON.parse(fs.readFileSync(scientificPath, 'utf-8'));

// Читаем и парсим CSV
function parseCSV(content) {
    const lines = content.split('\n');
    const results = [];

    for (let i = 1; i < lines.length; i++) { // пропускаем заголовок
        const line = lines[i].trim();
        if (!line) continue;

        // Находим последнюю запятую (label всегда в конце без кавычек)
        const lastCommaIndex = line.lastIndexOf(',');
        if (lastCommaIndex === -1) continue;

        let text = line.substring(0, lastCommaIndex);
        const label = line.substring(lastCommaIndex + 1);

        // Убираем кавычки если есть
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
    .map(row => ({ text: row.text, dataset: 'train.csv' }));

// Объединяем все записи
const allRecords = [...essays, ...news, ...scientific, ...humanFromCsv];

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
const outputPath = path.join(dataDir, 'merged_articles.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

console.log(`Готово! Объединено ${result.length} записей`);
console.log(`Файл сохранён: ${outputPath}`);

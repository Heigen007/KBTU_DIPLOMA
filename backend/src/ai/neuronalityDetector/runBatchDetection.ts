import fs from "fs";
import path from "path";
import detector from "./NeuronalityDetector";

const inputFolder = path.join(__dirname, "../../datasets/aiDataset/output");
const outputFile = path.join(__dirname, "ai_detection_results.json");

interface GeneratedText {
  id: number;
  model: string;
  generatedAt: string;
  type: string;
  topic: string;
  wordCount: number;
  text: string;
}

interface DetectionRecord extends GeneratedText {
  detection: ReturnType<typeof detector.detect>;
}

// Читаем все файлы JSON в папке
const files = fs.readdirSync(inputFolder);

const allResults: DetectionRecord[] = [];

for (const file of files) {
  const filePath = path.join(inputFolder, file);
  const raw = fs.readFileSync(filePath, "utf-8");
  const data: GeneratedText[] = JSON.parse(raw);

  console.log(`Обрабатываем файл: ${file}, записей: ${data.length}`);

  for (const item of data) {
    const detection = detector.detect(item.text);
    allResults.push({
      ...item,
      detection
    });
  }
}

// Сохраняем результаты в новый JSON
fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2), "utf-8");
console.log(`Готово! Результаты сохранены в ${outputFile}`);

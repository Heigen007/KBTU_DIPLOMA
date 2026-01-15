import { AIGeneratorFarm } from "../generators/AIGeneratorFarm";

// Скрипт для сборки всех датасетов в один
console.log("Сборка AI датасетов...\n");
AIGeneratorFarm.mergeAllDatasets();

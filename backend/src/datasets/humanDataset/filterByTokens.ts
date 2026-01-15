import { AutoTokenizer } from "@xenova/transformers";
import * as fs from "fs";
import * as path from "path";

const MAX_TOKENS = 500;
const baseDir = __dirname;
const outputDir = path.join(baseDir, "output");

let tokenizer: any = null;

async function getTokenizer() {
    if (!tokenizer) {
        console.log("Loading tokenizer...");
        tokenizer = await AutoTokenizer.from_pretrained("bert-base-multilingual-cased");
        console.log("Tokenizer loaded.");
    }
    return tokenizer;
}

async function countTokens(text: string): Promise<number> {
    const tok = await getTokenizer();
    const encoded = await tok.encode(text);
    return encoded.length;
}

interface DatasetEntry {
    id: number;
    origin: string;
    text: string;
}

async function filterDataset(inputFile: string, outputFile: string) {
    console.log(`\nProcessing: ${path.basename(inputFile)}`);

    const data: DatasetEntry[] = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
    console.log(`Total entries: ${data.length}`);

    const filtered: DatasetEntry[] = [];
    let processed = 0;

    for (const entry of data) {
        const tokens = await countTokens(entry.text);
        if (tokens < MAX_TOKENS) {
            filtered.push(entry);
        }
        processed++;
        if (processed % 100 === 0) {
            console.log(`Processed ${processed}/${data.length}...`);
        }
    }

    // Переиндексация
    const reindexed = filtered.map((entry, index) => ({
        ...entry,
        id: index + 1
    }));

    console.log(`Filtered entries (< ${MAX_TOKENS} tokens): ${reindexed.length}`);
    console.log(`Removed: ${data.length - reindexed.length}`);

    fs.writeFileSync(outputFile, JSON.stringify(reindexed, null, 2), "utf-8");
    console.log(`Saved to: ${path.basename(outputFile)}`);
}

async function main() {
    await filterDataset(
        path.join(outputDir, "fullHumanDataset.json"),
        path.join(outputDir, "fullHumanDatasetFiltered.json")
    );

    console.log("\nDone!");
}

main().catch(console.error);

import { AutoTokenizer } from "@xenova/transformers";
// МАКСИМУМ 500 токенов для ruBERT

let tokenizer: any = null;

async function getTokenizer() {
    if (!tokenizer) {
        tokenizer = await AutoTokenizer.from_pretrained("bert-base-multilingual-cased");
    }
    return tokenizer;
}

async function countTokens(text: string): Promise<number> {
    const tok = await getTokenizer();
    const encoded = await tok.encode(text);
    console.log("Tokens count:", encoded.length);
    return encoded.length;
}

export { countTokens, getTokenizer };

import OpenAI from "openai";
import { AIGeneratorFarm } from "./AIGeneratorFarm";

export class OpenAIGenerator extends AIGeneratorFarm {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string) {
        super(apiKey, model);
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    protected async callAPI(prompt: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                { role: "user", content: prompt }
            ]
        });

        return response.choices?.[0]?.message?.content?.trim() || "";
    }
}

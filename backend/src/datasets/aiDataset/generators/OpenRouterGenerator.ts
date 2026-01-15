import { AIGeneratorFarm } from "./AIGeneratorFarm";

export class OpenRouterGenerator extends AIGeneratorFarm {
    private model: string;

    constructor(apiKey: string, model: string) {
        super(apiKey, model);
        this.model = model;
    }

    protected async callAPI(prompt: string): Promise<string> {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result.choices?.[0]?.message?.content?.trim() || "";
    }
}

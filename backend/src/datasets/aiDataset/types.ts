export type TextType = "essay" | "news" | "scientific";

export type WordCount = 150 | 200 | 250 | 300;

export interface GeneratedEntry {
    id: number;
    model: string;
    generatedAt: string;
    type: TextType;
    topic: string;
    wordCount: WordCount;
    text: string;
}
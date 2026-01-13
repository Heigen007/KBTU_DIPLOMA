import dotenv from 'dotenv'
dotenv.config()

export class AppConfig {
    public static readonly PORT: number = Number(process.env.PORT || 3001)
    public static readonly OPENAI_API_KEY: string = process.env.OPENAI_API_KEY || ''
    public static validate(): void {
        if (!this.OPENAI_API_KEY) {
            throw new Error('AppConfig: Missing env var: OPENAI_API_KEY')
        }
    }
}
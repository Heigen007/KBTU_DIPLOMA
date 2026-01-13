import { logger } from 'src/common/logger'
import { AppConfig } from 'src/AppConfig'
import OpenAI from 'openai'

export class OpenAIClient {
    private client: OpenAI;
    static instance: OpenAIClient = new OpenAIClient(AppConfig.OPENAI_API_KEY || '')
    constructor(apiKey: string) {
        this.client = new OpenAI({apiKey: apiKey})
    }
    /**
     * Отправка запроса в LLM
     */
    public async ask(opt: {prompt: string, model?: string}): Promise<string> {
        logger.debug('OpenAIClient: ask: Start')
        const timestamp = Date.now()
        const modelName = opt.model || 'gpt-5-mini'
        try {
            const response = await this.client.chat.completions.create({
                model: modelName,
                messages: [
                    {role: 'user', content: opt.prompt}
                ]
            })
            logger.debug('OpenAIClient: ask: Finish (' + ((Date.now()-timestamp)/1000).toFixed(2) + ' sec)')
            const result = response.choices?.[0]?.message?.content?.trim() || ''
            logger.debug('OpenAIClient: ask: LLM Response: ' + JSON.stringify(result))
            return result
        }
        catch (error) {
            logger.error('OpenAIClient: ask: Error: ', error)
            throw error
        }
    }
}
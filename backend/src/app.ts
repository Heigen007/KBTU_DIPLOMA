import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { logsRouter } from './routers/logsRouter'
import { infoRouter } from './routers/infoRouter'
import { requestContext, setGlobalRequestId } from './common/requestContextStorage'
import { AppConfig } from './AppConfig'
import { logger } from './common/logger'
import { analyzeRouter } from './routers/analyzeRouter'

let globalRequestId = 1

export function createApp() {
    AppConfig.validate()

    const app = express()

    app.use(cors())

    // Присвоение каждому запросу уникального идентификатора
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
        requestContext.run(() => {
            setGlobalRequestId(globalRequestId++)
            next()
        })
    })

    app.use(bodyParser.json())

    // Роуты API
    app.use('/api/logs', logsRouter)
    app.use('/api/info', infoRouter)
    app.use('/api/analyze', analyzeRouter)

    // Health-check endpoint
    app.get('/api/', (_req: any, res: any) => {
        res.status(200).send('Remedy Notifier Bot API is running')
    })

    // Global error handler (must be the last)
    app.use((error: any, _req: any, res: any, _next: any) => {
        logger.error('app.ts: Unhandled error:', error)
        res.status(500).json({
            resultCode: 1,
            errorMessage: 'Internal server error',
            details: error.message
        })
    })

    return app
}
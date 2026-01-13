import express, { Router, Request, Response } from 'express'

export const analyzeRouter: Router = express.Router()

/**
 * Метод GET /api/analyze
 *  Анализирует ввод и выдает анализ
 */
analyzeRouter.post('/', async (_req: Request, res: Response) => {
    // Тут происходит анализ
    res.status(200).json({ message: 'Анализ завершен'})
})

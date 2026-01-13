import express, { Router, Request, Response } from 'express'
import { Global } from '../common/Global'

export const infoRouter: Router = express.Router()

/**
 * Метод GET /api/info
 * Возращает текущую версию приложения и дату его запуска на сервере
 */
infoRouter.get('/', async (_req: Request, res: Response) => {
    const body = {
        applicationName: Global.applicationName,
        applicationVersion: Global.applicationVersion,
        applicationStartDate: Global.getApplicationStartDate()
    }
    res.status(200).json(body)
})

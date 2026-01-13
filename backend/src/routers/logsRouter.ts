import { Router, Request, Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'

type LogEntry = {
    timestamp: string, // ISO (UTC)
    level: string,
    message: string,
    raw: string
}

export const logsRouter: Router = Router()

/**
 * Парсим строку лога.
 * Поддерживает два формата:
 * 2025-08-21 12:34:56.789 [info]: Message
 * 2025-08-21 12:34:56.789 (42) [info]: Message
 */
function parseLogLine(line: string): LogEntry | null {
    const m = line.match(
        /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})(?: \(\d+\))? \[(\w+)\]: (.*)$/
    )
    if (!m) { return null }
    const [, d, hh, mm, ss, ms, level, msg] = m
    const [y, mo, da] = d.split('-').map(Number)
    // Локальное время сервера
    const dtLocal = new Date(y, mo - 1, da, Number(hh), Number(mm), Number(ss), Number(ms))
    return {timestamp: new Date(dtLocal.getTime()).toISOString(), level: level, message: msg, raw: line}
}

function formatDateLocal(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

/**
 * Собираем список файлов за даты между start..end
 */
function getCandidateLogFiles(start: Date, end: Date): string[] {
    const dir = path.resolve(process.cwd(), 'logs')
    if (!fs.existsSync(dir)) { return [] }

    const files = fs.readdirSync(dir)
    const dates = new Set<string>()

    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())

    for (let d = new Date(dayStart); d <= dayEnd; d.setDate(d.getDate() + 1)) {
        dates.add(formatDateLocal(d))
    }

    const out: string[] = []
    for (const file of files) {
        if (file.endsWith('.log')) {
            for (const d of dates) {
                if (file.startsWith(`application-${d}`)) {
                    out.push(path.join(dir, file))
                    break
                }
            }
        }
    }
    return out
}

logsRouter.get('/recent', async (req: Request, res: Response) => {
    try {
        const minutes = Number(req.query.minutes ?? 0)
        if (!minutes || !Number.isFinite(minutes) || minutes <= 0) {
            return res.status(400).json({error: 'Query param "minutes" must be > 0'})
        }

        const limit = Math.max(1, Number(req.query.limit ?? 1000))
        const now = new Date()
        const from = new Date(now.getTime() - minutes * 60_000)

        const files = getCandidateLogFiles(from, now)
        if (files.length === 0) {
            return res.json({
                from: from.toISOString(),
                to: now.toISOString(),
                count: 0,
                totalMatched: 0,
                items: []
            })
        }

        const entries: LogEntry[] = []
        for (const file of files) {
            let content: string
            try {
                content = fs.readFileSync(file, 'utf8')
            }
            catch {
                continue
            }
            const lines = content.split(/\r?\n/)
            for (const line of lines) {
                if (!line) { continue }
                const parsed = parseLogLine(line)
                if (!parsed) { continue }
                const ts = new Date(parsed.timestamp).getTime()
                if (ts >= from.getTime() && ts <= now.getTime()) { entries.push(parsed) }
            }
        }

        // Сортировка записей по убыванию даты
        entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        const limited = entries.slice(0, limit)
        return res.json({
            from: from.toISOString(),
            to: now.toISOString(),
            count: limited.length,
            totalMatched: entries.length,
            items: limited
        })
    }
    catch (err) {
        console.error('logsRouter error:', err)
        return res.status(500).json({error: 'Internal error'})
    }
})
import { logger } from 'src/common/logger'
import { PoolClient, QueryResultRow } from 'pg'
import { postgresDB } from './postgre/postgresDB'
import { IDbInterface, TSqlQueryParam } from './dbInterfaces'

type TDbQueryResult = {
    rowCount: number,
    rows: any
}

export type TDbSqlSelectResult = {
    sqlResultRowCount: number,
    sqlResultRows: any[]
}

export type TDbSqlInsertResult = {
    sqlResultInsertedRowCount: number,
    sqlResultRows: QueryResultRow[]
}

export type TDbSqlUpdateResult = {
    sqlResultUpdatedRowCount: number
}

export type TDbSqlDeleteResult = {
    sqlResultDeletedRowCount: number
}

export type TCreatedInstanceFromDatabase = {
    createdInstance: any
}

const db: IDbInterface = postgresDB // Инициализация параметров для подключения к базе данных PostgreSQL

export class DatabaseConnection {
    private static idSequence = 1
    private id = 0
    public connection: PoolClient | null = null
    constructor(dbConnection: PoolClient) {
        this.id = DatabaseConnection.idSequence++
        this.connection = dbConnection
    }
    get isConnected(): boolean {
        if (this.connection) { return true } else { return false }
    }
    // Фабрика для создания экземпляра
    static async createInstance(): Promise<DatabaseConnection> {
        try {
            logger.debug('DatabaseConnection: createInstance: Start')
            const dbConnection = await DatabaseConnection.dbConnectionOccupy()
            if (dbConnection) {
                logger.debug('DatabaseConnection: createInstance: Success')
                return new DatabaseConnection(dbConnection)
            } else {
                logger.error('DatabaseConnection: createInstance: Error')
                throw new Error('DatabaseConnection: createInstance: Error')
            }
        }
        catch(error) {
            logger.error('DatabaseConnection: createInstance: Exception: ' + String(error))
            throw new Error('DatabaseConnection: createInstance: Exception: ' + String(error))
        }
    }
    // Получение соединения с БД из пула
    private static async dbConnectionOccupy(): Promise<PoolClient> {
        try {
            logger.debug('DatabaseConnection: dbConnectionOccupy: Trying to get database connection...')
            const connection = await db.connect()
            logger.debug('DatabaseConnection: dbConnectionOccupy: Success')
            return connection
        }
        catch(error: unknown) {
            logger.error('DatabaseConnection: dbConnectionOccupy: Error: ' + (error as Error).message)
            throw error as Error
        }
    }
    // Возврат соединения с БД обратно в пул
    public dbConnectionRelease(): void {
        try {
            if (this.connection) {
                // Если имеется активная транзакция, то она автоматически отменяется
                void db.release(this.connection) // без await
                this.connection = null
                logger.debug('DatabaseConnection: dbConnectionRelease: Success')
            } else {
                logger.warn('DatabaseConnection: dbConnectionRelease: Connection is null')
            }
        }
        catch(error) {
            this.connection = null
            logger.error('DatabaseConnection: dbConnectionRelease: Error: ' + String(error))
        }
    }
    // Выполнение указанного SELECT запроса
    public async dbExecuteSelect(querySQL: string, querySQLParams: TSqlQueryParam[] = []): Promise<TDbSqlSelectResult> {
        try {
            logger.debug('DatabaseConnection: dbExecuteSelect: Start SQL = ' + querySQL)
            const r = await db.query(this.connection, querySQL, querySQLParams) as TDbQueryResult
            logger.debug('DatabaseConnection: dbExecuteSelect: Success (rowCount=' + r.rowCount + ')')
            return {
                sqlResultRowCount: r.rowCount,
                sqlResultRows: r.rows as any[]
            }
        }
        catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error('DatabaseConnection: dbExecuteSelect: Error: ' + errMsg)
            // Если ошибка возникла в рамках транзакции, то сразу же выполняется ROLLBACK
            throw new Error('DC-E03')
        }
    }

    // Выполнение указанного INSERT запроса
    public async dbExecuteInsert(querySQL: string, querySQLParams: TSqlQueryParam[]): Promise<TDbSqlInsertResult> {
        try {
            // logger.debug('DatabaseConnection: dbExecuteInsert: Start SQL = ' + querySQL)
            const r = await db.query(this.connection, querySQL, querySQLParams)
            logger.debug('DatabaseConnection: dbExecuteInsert: Success (rowCount=' + r.rowCount + ')')

            return {
                sqlResultInsertedRowCount: r.rowCount as number,
                sqlResultRows: r.rows as QueryResultRow[]
            }
        }
        catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error('DatabaseConnection: dbExecuteInsert: Error: ' + errMsg)
            // Если ошибка возникла в рамках транзакции, то сразу же выполняется ROLLBACK
            throw new Error('DC-E05')
        }
    }

    // Выполнение указанного UPDATE запроса
    public async dbExecuteUpdate(querySQL: string, querySQLParams: TSqlQueryParam[]): Promise<TDbSqlUpdateResult> {
        try {
            // logger.debug('DatabaseConnection: dbExecuteUpdate: Start SQL = ' + querySQL)
            const r = await db.query(this.connection, querySQL, querySQLParams) as TDbQueryResult
            // logger.debug('DatabaseConnection: dbExecuteUpdate: Success (rowCount=' + r.rowCount + ')')
            return {
                sqlResultUpdatedRowCount: r.rowCount
            }
        }
        catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error('DatabaseConnection: dbExecuteUpdate: Error: ' + errMsg)
            // Если ошибка возникла в рамках транзакции, то сразу же выполняется ROLLBACK
            throw new Error('DC-E04')
        }
    }

    // Выполнение указанного DELETE запроса
    public async dbExecuteDelete(querySQL: string, querySQLParams: TSqlQueryParam[] = []): Promise<TDbSqlDeleteResult> {
        try {
            logger.debug('DatabaseConnection: dbExecuteDelete: Start SQL = ' + querySQL)
            const r = await db.query(this.connection, querySQL, querySQLParams) as TDbQueryResult
            logger.debug('DatabaseConnection: dbExecuteDelete: Success (rowCount=' + r.rowCount + ')')
            return {
                sqlResultDeletedRowCount: r.rowCount
            }
        }
        catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error('DatabaseConnection: dbExecuteDelete: Error: ' + errMsg)
            // Если ошибка возникла в рамках транзакции, то сразу же выполняется ROLLBACK
            throw new Error('DC-E06')
        }
    }

    // Получение следующего значения указанной последовательности (database sequence)
    public async getSequenceNextval(sequenceName: string): Promise<number> {
        logger.debug('DatabaseConnection: getSequenceNextval: Start for ' + sequenceName)
        const querySQL = `select nextval($1) as nextval`
        const result = await this.dbExecuteSelect(querySQL, [sequenceName])
        logger.debug('DatabaseConnection: getSequenceNextval: Finish (' + sequenceName + '.nextval=' + result.sqlResultRows[0].nextval + ')')
        return Number(result.sqlResultRows[0].nextval)
    }

    // Начало транзакции
    public async beginTransaction(): Promise<void> {
        try {
            // logger.debug('DatabaseConnection: beginTransaction: Start')
            await db.begin(this.connection)
            logger.debug('DatabaseConnection: beginTransaction: Success')
        }
        catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error('DatabaseConnection: beginTransaction: Error: ' + errMsg)
            throw new Error('DC-E07')
        }
    }

    // Коммит транзакции
    public async commit(): Promise<void> {
        try {
            logger.debug('DatabaseConnection: commit: Start')
            await db.commit(this.connection)
            logger.debug('DatabaseConnection: commit: Success')
        }
        catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error('DatabaseConnection: commit: Error: ' + errMsg)
            throw new Error('DC-E08')
        }
    }

    // Откат транзакции
    public async rollback(): Promise<void> {
        try {
            logger.debug('DatabaseConnection: rollback: Start')
            await db.rollback(this.connection)
            logger.debug('DatabaseConnection: rollback: Success')
        }
        catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error('DatabaseConnection: rollback: Error: ' + errMsg)
            throw new Error('DC-E09')
        }
    }

    public static async runTransaction<T>(callback: (session: DatabaseConnection) => Promise<T>): Promise<T> {
        let session: DatabaseConnection | null = null;
        try {
            session = await DatabaseConnection.createInstance();
            await session.beginTransaction();

            const result = await callback(session);

            await session.commit();
            return result;
        } catch (error) {
            if (session) {
                await session.rollback();
            }
            throw error;
        } finally {
            session?.dbConnectionRelease();
        }
    }
}
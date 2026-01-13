import { PoolClient, QueryResult } from 'pg'

export type TSqlQueryParam = string | number | number[] | boolean | null

export interface IDbInterface {
    connect(): Promise<PoolClient>, // Устанавливает соединение с БД, получая соединение из пула соединений
    begin(connection: any): Promise<QueryResult<any>>, // начинает транзакцию
    commit(connection: any): Promise<QueryResult<any>>, // завершает транзакцию
    rollback(connection: any): Promise<QueryResult<any>>, // откатывает транзакцию
    release(connection: any): void, // закрывает соединение с БД, возвращая соединение в пул соединений
    query(connection: any, query: string, params: Array<TSqlQueryParam>): Promise<QueryResult<any>> // выполняет запрос к БД
}
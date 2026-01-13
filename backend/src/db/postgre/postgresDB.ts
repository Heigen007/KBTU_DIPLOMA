import dotenv from 'dotenv'
dotenv.config()

import { PGConnectionConfig } from './interfaces'
import { IDbInterface } from '../dbInterfaces'
import { Pool, PoolClient, QueryResult } from 'pg'

const connection_options: PGConnectionConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 60000,
    max: 4,
    // ssl: {
    //     rejectUnauthorized: false, // Отключает проверку сертификата, требуется для DigitalOcean
    // }
}

const pool = new Pool(connection_options)

async function connect(): Promise<PoolClient> {
    try {
        return await pool.connect()
    }
    catch (error: unknown) {
        throw error as Error
    }
}

function release(connection: PoolClient): void {
    try {
        connection.release()
    }
    catch (error: unknown) {
        throw error as Error
    }
}

async function query(connection: PoolClient, query: string, params: Array<string|number>): Promise<QueryResult<any>> {
    try {
        return await connection.query(query, params)
    }
    catch (error: unknown) {
        throw error as Error
    }
}

async function begin(connection: PoolClient): Promise<QueryResult<any>> {
    try {
        return await connection.query('BEGIN')
    }
    catch (error: unknown) {
        throw error as Error
    }
}

async function commit(connection: PoolClient): Promise<QueryResult<any>> {
    try {
        return await connection.query('COMMIT')
    }
    catch (error: unknown) {
        throw error as Error
    }
}

async function rollback(connection: PoolClient): Promise<QueryResult<any>> {
    try {
        return await connection.query('ROLLBACK')
    }
    catch (error: unknown) {
        throw error as Error
    }
}

export const postgresDB: IDbInterface = {
    connect,
    begin,
    commit,
    rollback,
    release,
    query
}
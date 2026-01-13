import { ConnectionOptions } from 'tls';

// доступные настройки соединения для postgres БД
export interface PGConnectionConfig {
    ssl?: boolean | ConnectionOptions | undefined;
    // stream?: () => stream.Duplex | stream.Duplex | undefined;
    // types?: CustomTypesConfig | undefined;
    user?: string | undefined;
    database?: string | undefined;
    password?: string | (() => string | Promise<string>) | undefined;
    port?: number | undefined;
    host?: string | undefined;
    connectionString?: string | undefined;
    keepAlive?: boolean | undefined;
    statement_timeout?: false | number | undefined;
    query_timeout?: number | undefined;
    keepAliveInitialDelayMillis?: number | undefined;
    idle_in_transaction_session_timeout?: number | undefined;
    application_name?: string | undefined;
    connectionTimeoutMillis?: number | undefined;
    options?: string | undefined;

    // настройки пула соединений
    max?: number | undefined;
    min?: number | undefined;
    idleTimeoutMillis?: number | undefined;
    log?: ((...messages: any[]) => void) | undefined;
    Promise?: PromiseConstructorLike | undefined;
    allowExitOnIdle?: boolean | undefined;
    maxUses?: number | undefined;
}
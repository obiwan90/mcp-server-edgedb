/**
 * EdgeDB service connection management
 * EdgeDB service connection management
 */
import * as edgedb from "edgedb";
import { config } from "../config/index.js";
import { EdgeDBConnectionConfig } from "../types/edgedb.js";
import { createError } from "../utils/errors.js";

// 数据库客户端映射，每个数据库使用独立连接
// Database client map: each database uses a separate connection
const dbClientMap: Map<string, edgedb.Client> = new Map();
// 当前连接的数据库名称
// Current database name
let currentDatabase: string = "main";
// 默认连接配置
// Default connection configuration
let defaultConnectionConfig: EdgeDBConnectionConfig = {
    dsn: config.edgedb.dsn,
    instanceName: config.edgedb.instanceName
};

/**
 * 初始化EdgeDB客户端
 * Initialize EdgeDB client
 * @param dsn EdgeDB连接字符串（可选）
 * @param dsn EdgeDB connection string (optional)
 * @param instanceName EdgeDB实例名称（可选）
 * @param instanceName EdgeDB instance name (optional)
 * @param database 数据库名称（可选）
 * @param database Database name (optional)
 * @returns 初始化结果信息
 * @returns Initialization result message
 */
export async function initEdgeDBClient(dsn?: string, instanceName?: string, database?: string): Promise<string> {
    try {
        // 保存连接配置
        // Save connection configuration
        if (dsn || instanceName) {
            defaultConnectionConfig = {
                dsn: dsn || config.edgedb.dsn,
                instanceName: instanceName || config.edgedb.instanceName
            };
        }

        // 确定要连接的数据库名称
        // Determine database name to connect
        const dbName = database || "main";

        // 如果已有此数据库的连接，先关闭
        // If a connection to this database exists, close it first
        if (dbClientMap.has(dbName)) {
            const oldClient = dbClientMap.get(dbName);
            if (oldClient) {
                try {
                    await oldClient.close();
                } catch (e) {
                    console.error(`Failed to close connection to database ${dbName}:`, e);
                }
            }
            dbClientMap.delete(dbName);
        }

        // 创建连接选项
        // Create connection options
        const options: any = {
            tlsSecurity: "insecure", // 接受自签名证书
            // Accept self-signed certificates
            database: dbName
        };

        // 添加连接参数
        if (defaultConnectionConfig.dsn) {
            let connectionDsn = defaultConnectionConfig.dsn;

            // 修改DSN中的数据库部分
            if (connectionDsn.includes("/")) {
                const dsnParts = connectionDsn.split("/");
                dsnParts[dsnParts.length - 1] = dbName;
                connectionDsn = dsnParts.join("/");
            }

            options.dsn = connectionDsn;
        } else if (defaultConnectionConfig.instanceName) {
            options.instanceName = defaultConnectionConfig.instanceName;
        }

        console.log(`Connecting to database ${dbName}, configuration:`, options);

        // 创建新客户端
        // Create new client
        const client = edgedb.createClient(options);

        // 测试连接
        // Test connection
        const actualDbName = await client.querySingle('SELECT sys::get_current_database()');
        console.log(`Connection test successful, actual database name: ${actualDbName}`);

        // 存储客户端
        // Store client
        dbClientMap.set(dbName, client);

        // 更新当前数据库
        // Update current database
        currentDatabase = dbName;
        console.log(`Current database set to: ${currentDatabase}`);

        return `Successfully connected to EdgeDB database: ${actualDbName}`;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to connect to EdgeDB:`, error);
        throw new Error(`Failed to connect to EdgeDB: ${errorMessage}`);
    }
}

/**
 * 获取当前数据库的客户端
 * Get the client for the current database
 * @returns EdgeDB客户端实例
 *          EdgeDB client instance
 * @throws 如果客户端未初始化则抛出错误
 *          Throws if client is not initialized
 */
export function getClient(): edgedb.Client {
    // 获取当前数据库的客户端
    const client = dbClientMap.get(currentDatabase);

    if (!client) {
        throw new Error(`EdgeDB client not initialized, please use connectEdgeDB tool to connect to database ${currentDatabase}`);
    }

    return client;
}

/**
 * 获取指定数据库的客户端
 * Get the client for the specified database
 * @param database 数据库名称
 *                 Database name
 * @returns EdgeDB客户端实例或null
 *          EdgeDB client instance or null
 */
export function getDatabaseClient(database: string): edgedb.Client | null {
    return dbClientMap.get(database) || null;
}

/**
 * 获取当前连接的数据库名称
 * Get the name of the currently connected database
 * @returns 当前连接的数据库名称
 *          Name of the currently connected database
 */
export function getCurrentDatabase(): string {
    return currentDatabase;
}

/**
 * 设置当前数据库名称
 * Set the current database name
 * @param database 数据库名称
 *                 Database name
 */
export function setCurrentDatabase(database: string): void {
    if (dbClientMap.has(database)) {
        currentDatabase = database;
        console.log(`Current database switched to: ${database}`);
    } else {
        throw new Error(`Database ${database} not connected, please establish connection first`);
    }
}

/**
 * 关闭所有EdgeDB客户端连接
 * Close all EdgeDB client connections
 */
export async function closeAllClients(): Promise<void> {
    const closePromises = [];

    for (const [dbName, client] of dbClientMap.entries()) {
        console.log(`Closing connection to database ${dbName}...`);
        closePromises.push(client.close());
    }

    await Promise.all(closePromises);
    dbClientMap.clear();
} 
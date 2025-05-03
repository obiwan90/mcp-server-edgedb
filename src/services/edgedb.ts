/**
 * EdgeDB服务连接管理
 */
import * as edgedb from "edgedb";
import { config } from "../config/index.js";
import { EdgeDBConnectionConfig } from "../types/edgedb.js";
import { createError } from "../utils/errors.js";

// 数据库客户端映射，每个数据库使用独立连接
const dbClientMap: Map<string, edgedb.Client> = new Map();
// 当前连接的数据库名称
let currentDatabase: string = "main";
// 默认连接配置
let defaultConnectionConfig: EdgeDBConnectionConfig = {
    dsn: config.edgedb.dsn,
    instanceName: config.edgedb.instanceName
};

/**
 * 初始化EdgeDB客户端
 * @param dsn EdgeDB连接字符串（可选）
 * @param instanceName EdgeDB实例名称（可选）
 * @param database 数据库名称（可选）
 * @returns 初始化结果信息
 */
export async function initEdgeDBClient(dsn?: string, instanceName?: string, database?: string): Promise<string> {
    try {
        // 保存连接配置
        if (dsn || instanceName) {
            defaultConnectionConfig = {
                dsn: dsn || config.edgedb.dsn,
                instanceName: instanceName || config.edgedb.instanceName
            };
        }

        // 确定要连接的数据库名称
        const dbName = database || "main";

        // 如果已有此数据库的连接，先关闭
        if (dbClientMap.has(dbName)) {
            const oldClient = dbClientMap.get(dbName);
            if (oldClient) {
                try {
                    await oldClient.close();
                } catch (e) {
                    console.error(`关闭数据库 ${dbName} 的连接失败:`, e);
                }
            }
            dbClientMap.delete(dbName);
        }

        // 创建连接选项
        const options: any = {
            tlsSecurity: "insecure", // 接受自签名证书
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

        console.log(`正在连接到数据库 ${dbName}，配置:`, options);

        // 创建新客户端
        const client = edgedb.createClient(options);

        // 测试连接
        const actualDbName = await client.querySingle('SELECT sys::get_current_database()');
        console.log(`连接测试成功，实际数据库名称: ${actualDbName}`);

        // 存储客户端
        dbClientMap.set(dbName, client);

        // 更新当前数据库
        currentDatabase = dbName;
        console.log(`已将当前数据库设置为: ${currentDatabase}`);

        return `成功连接到EdgeDB数据库: ${actualDbName}`;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`连接到EdgeDB失败:`, error);
        throw new Error(`连接到EdgeDB失败: ${errorMessage}`);
    }
}

/**
 * 获取当前数据库的客户端
 * @returns EdgeDB客户端实例
 * @throws 如果客户端未初始化则抛出错误
 */
export function getClient(): edgedb.Client {
    // 获取当前数据库的客户端
    const client = dbClientMap.get(currentDatabase);

    if (!client) {
        throw new Error(`EdgeDB客户端未初始化，请先使用connectEdgeDB工具连接到数据库 ${currentDatabase}`);
    }

    return client;
}

/**
 * 获取指定数据库的客户端
 * @param database 数据库名称
 * @returns EdgeDB客户端实例
 */
export function getDatabaseClient(database: string): edgedb.Client | null {
    return dbClientMap.get(database) || null;
}

/**
 * 获取当前连接的数据库名称
 * @returns 当前连接的数据库名称
 */
export function getCurrentDatabase(): string {
    return currentDatabase;
}

/**
 * 设置当前数据库名称
 * @param database 数据库名称
 */
export function setCurrentDatabase(database: string): void {
    if (dbClientMap.has(database)) {
        currentDatabase = database;
        console.log(`已切换当前数据库为: ${database}`);
    } else {
        throw new Error(`数据库 ${database} 未连接，请先建立连接`);
    }
}

/**
 * 关闭所有EdgeDB客户端连接
 */
export async function closeAllClients(): Promise<void> {
    const closePromises = [];

    for (const [dbName, client] of dbClientMap.entries()) {
        console.log(`正在关闭数据库 ${dbName} 的连接...`);
        closePromises.push(client.close());
    }

    await Promise.all(closePromises);
    dbClientMap.clear();
} 
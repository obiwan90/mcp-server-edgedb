/**
 * 数据库管理相关MCP工具
 */
import { z } from "zod";
import { McpToolResponse } from "../types/mcp.js";
import { getClient } from "../services/edgedb.js";
import { handleError } from "../utils/errors.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * 注册数据库管理相关工具
 * @param server MCP服务器实例
 */
export function registerDatabaseTools(server: McpServer) {
    /**
     * 连接到EdgeDB数据库工具
     */
    server.tool(
        "connectEdgeDB",
        {
            dsn: z.string().optional().describe("EdgeDB连接字符串 (例如: edgedb://user:password@hostname:port/database)"),
            instanceName: z.string().optional().describe("EdgeDB实例名称"),
        },
        async ({ dsn, instanceName }, extra): Promise<McpToolResponse> => {
            try {
                // 导入服务
                const { initEdgeDBClient } = await import("../services/edgedb.js");

                // 初始化连接
                const result = await initEdgeDBClient(dsn, instanceName);

                return {
                    content: [{
                        type: "text" as const,
                        text: result
                    }]
                };
            } catch (error) {
                return handleError(error, "连接EdgeDB", "请检查连接参数和网络连接");
            }
        }
    );

    /**
     * 列出所有可访问的数据库
     */
    server.tool(
        "listDatabases",
        {},
        async ({ }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                const result = await client.query(`
                    SELECT sys::Database {
                        name
                    }
                    ORDER BY .name;
                `);

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (error) {
                return handleError(error, "获取数据库列表", "请检查网络连接和数据库权限");
            }
        }
    );

    /**
     * 获取当前数据库名称
     */
    server.tool(
        "currentDatabase",
        {},
        async ({ }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 导入getCurrentDatabase函数
                const { getCurrentDatabase } = await import("../services/edgedb.js");

                // 从客户端直接查询当前数据库名称
                const actualDb = await client.querySingle('SELECT sys::get_current_database()');

                // 获取存储的数据库名称
                const storedDb = getCurrentDatabase();

                // 如果不一致，提供警告
                if (actualDb !== storedDb) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `当前连接的数据库: ${actualDb} (系统记录为: ${storedDb})`
                        }]
                    };
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: `当前连接的数据库: ${actualDb}`
                    }]
                };
            } catch (error) {
                const { getCurrentDatabase } = await import("../services/edgedb.js");
                const storedDb = getCurrentDatabase();

                return {
                    content: [{
                        type: "text" as const,
                        text: `获取数据库名称出错，系统记录的当前数据库: ${storedDb}`
                    }]
                };
            }
        }
    );

    /**
     * 创建新数据库
     */
    server.tool(
        "createDatabase",
        {
            name: z.string().describe("新数据库名称"),
            switchTo: z.boolean().optional().describe("创建后是否切换到新数据库")
        },
        async ({ name, switchTo }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();
                const { initEdgeDBClient, getCurrentDatabase } = await import("../services/edgedb.js");

                // 创建数据库
                await client.query(`
                    CREATE DATABASE ${name};
                `);

                // 创建数据库成功
                if (switchTo) {
                    // 连接到新数据库
                    await initEdgeDBClient(undefined, undefined, name);

                    // 验证是否成功切换
                    const currentDb = getCurrentDatabase();

                    if (currentDb !== name) {
                        return {
                            content: [{
                                type: "text" as const,
                                text: `数据库 ${name} 创建成功，但切换失败，当前连接的是 ${currentDb}`
                            }],
                            isError: true
                        };
                    }

                    return {
                        content: [{
                            type: "text" as const,
                            text: `数据库 ${name} 创建成功并已切换到该数据库。`
                        }]
                    };
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: `数据库 ${name} 创建成功。`
                    }]
                };
            } catch (error) {
                return handleError(error, "创建数据库", "请确保有足够的权限创建数据库");
            }
        }
    );

    /**
     * 切换到特定数据库
     */
    server.tool(
        "useDatabase",
        {
            database: z.string().describe("数据库名称")
        },
        async ({ database }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();
                const { getCurrentDatabase, initEdgeDBClient, setCurrentDatabase, getDatabaseClient } = await import("../services/edgedb.js");

                // 检查当前数据库
                const currentDb = getCurrentDatabase();

                if (currentDb === database) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `已经连接到数据库 ${database}`
                        }]
                    };
                }

                // 检查数据库是否存在
                const exists = await client.querySingle(`
                    SELECT EXISTS (
                        SELECT sys::Database FILTER .name = <str>$name
                    )
                `, { name: database });

                if (!exists) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `数据库 ${database} 不存在`
                        }],
                        isError: true
                    };
                }

                // 检查是否已经有此数据库的连接
                const existingClient = getDatabaseClient(database);
                if (existingClient) {
                    // 直接切换到已有连接
                    setCurrentDatabase(database);

                    // 验证连接
                    try {
                        const dbName = await existingClient.querySingle('SELECT sys::get_current_database()');
                        console.log(`验证已有连接成功，数据库: ${dbName}`);

                        if (dbName !== database) {
                            console.warn(`数据库名称不匹配，期望: ${database}, 实际: ${dbName}`);
                        }
                    } catch (e) {
                        console.error(`验证已有连接失败:`, e);
                        // 连接可能已失效，重新创建
                        await initEdgeDBClient(undefined, undefined, database);
                    }
                } else {
                    // 创建新连接
                    await initEdgeDBClient(undefined, undefined, database);
                }

                // 验证当前数据库名称
                const newCurrentDb = getCurrentDatabase();
                if (newCurrentDb !== database) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `切换数据库失败，当前仍为: ${newCurrentDb}`
                        }],
                        isError: true
                    };
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: `已切换到数据库 ${database}`
                    }]
                };
            } catch (error) {
                return handleError(error, "切换数据库", "请确保数据库存在并且有足够的权限");
            }
        }
    );
} 
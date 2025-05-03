/**
 * 导出所有工具函数
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDatabaseTools } from "./database.js";
import { registerQueryTools } from "./query.js";
import { registerSchemaTools } from "./schema.js";

/**
 * 注册所有EdgeDB MCP工具
 * @param server MCP服务器实例
 */
export function registerAllTools(server: McpServer): void {
    // 注册数据库管理工具
    registerDatabaseTools(server);

    // 注册查询工具
    registerQueryTools(server);

    // 注册模式管理工具
    registerSchemaTools(server);

    // 可以在这里注册更多工具分类
    // ...
} 
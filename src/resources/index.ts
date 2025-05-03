/**
 * 导出所有资源定义
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGreetingResource } from "./greeting.js";

/**
 * 注册所有EdgeDB MCP资源
 * @param server MCP服务器实例
 */
export function registerAllResources(server: McpServer): void {
    // 注册问候资源
    registerGreetingResource(server);

    // 可以在这里注册更多资源
    // ...
} 
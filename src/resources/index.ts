/**
 * 导出所有资源定义
 * Export all resource definitions
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGreetingResource } from "./greeting.js";

/**
 * 注册所有EdgeDB MCP资源
 * Register all EdgeDB MCP resources
 * @param server MCP服务器实例 (MCP server instance)
 */
export function registerAllResources(server: McpServer): void {
    // 注册问候资源
    // Register greeting resource
    registerGreetingResource(server);

    // 可以在这里注册更多资源
    // More resources can be registered here
    // ...
} 
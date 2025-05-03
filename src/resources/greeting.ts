/**
 * 问候资源模块
 * Greeting resource module
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * 注册问候资源
 * Register greeting resource
 * @param server MCP服务器实例 (MCP server instance)
 */
export function registerGreetingResource(server: McpServer): void {
    /**
     * 添加动态问候资源
     * Add dynamic greeting resource
     * Can be accessed via greeting://{name}, returns a personalized greeting
     */
    server.resource(
        "greeting",
        new ResourceTemplate("greeting://{name}", { list: undefined }),
        async (uri, variables) => ({
            contents: [{
                uri: uri.href,
                text: `你好，${variables.name}！欢迎使用EdgeDB MCP服务器。` // Hello, ${variables.name}! Welcome to EdgeDB MCP Server.
            }]
        })
    );
} 
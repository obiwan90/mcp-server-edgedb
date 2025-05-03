/**
 * 问候资源模块
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * 注册问候资源
 * @param server MCP服务器实例
 */
export function registerGreetingResource(server: McpServer): void {
    /**
     * 添加动态问候资源
     * 可以通过 greeting://name 访问，返回个性化问候语
     */
    server.resource(
        "greeting",
        new ResourceTemplate("greeting://{name}", { list: undefined }),
        async (uri, variables) => ({
            contents: [{
                uri: uri.href,
                text: `你好，${variables.name}！欢迎使用EdgeDB MCP服务器。`
            }]
        })
    );
} 
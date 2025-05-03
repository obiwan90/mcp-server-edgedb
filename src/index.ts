/**
 * EdgeDB MCP服务器主入口文件
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { config } from "./config/index.js";

// 初始化MCP服务器
const server = new McpServer({
    transport: new StdioServerTransport(),
    name: "EdgeDB MCP服务器",
    description: "通过MCP协议提供EdgeDB数据库服务",
    version: "1.0.0"
});

// 注册所有资源
registerAllResources(server);

// 注册所有工具
registerAllTools(server);

// 启动服务器
(async function main() {
    try {
        console.log("启动MCP服务器...");
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log("MCP服务器已连接，等待客户端请求...");
    } catch (error: unknown) {
        console.error("服务器启动失败:", error);
        process.exit(1);
    }
})();

// 处理退出事件
process.on("SIGINT", async () => {
    console.log("正在关闭服务器...");

    try {
        // 关闭数据库连接
        const { closeAllClients } = await import("./services/edgedb.js");
        await closeAllClients();

        process.exit(0);
    } catch (error) {
        console.error("关闭服务器时出错:", error);
        process.exit(1);
    }
}); 
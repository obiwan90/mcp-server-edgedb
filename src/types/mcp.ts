/**
 * MCP相关类型定义
 */

// 定义符合MCP SDK要求的文本内容项类型
export type McpTextContent = {
    [x: string]: unknown;
    type: "text";
    text: string;
};

// 定义MCP工具函数返回类型
export type McpToolResponse = {
    [x: string]: unknown;
    content: McpTextContent[];
    isError?: boolean;
    _meta?: Record<string, unknown>;
};

// MCP错误响应类型
export type McpErrorResponse = McpToolResponse & { isError: true }; 
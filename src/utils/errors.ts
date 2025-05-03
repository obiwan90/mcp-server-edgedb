/**
 * 错误处理工具函数
 * Error handling utility functions
 */
import { McpErrorResponse } from '../types/mcp.js';

/**
 * 添加通用错误处理的辅助函数
 * Adds a helper function for unified error handling
 * @param error 错误对象
 * @param error The error object
 * @param operationName 操作名称
 * @param operationName The name of the operation
 * @param hints 可选的提示信息
 * @param hints Optional hint messages
 * @returns 格式化的错误响应
 * @returns Formatted error response
 */
export function handleError(error: unknown, operationName: string, hints?: string): McpErrorResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${operationName}出错:`, error);
    console.error("详细错误信息:", JSON.stringify(error));

    let message = `${operationName}出错: ${errorMessage}`;
    let additionalHint = "";

    // EdgeDB特定错误处理
    if (errorMessage.includes('shapes cannot be applied to scalar type')) {
        additionalHint = `\n\n特别提示: EdgeDB中的字段选择(shape)应该直接放在类型名称后面，例如：
SELECT myapp::User {id, name, email} FILTER .name = '张三'
而不是:
SELECT myapp::User FILTER .name = '张三' {id, name, email}`;
    } else if (errorMessage.includes('missing a type cast before the parameter')) {
        additionalHint = `\n\n特别提示: EdgeDB中的参数需要类型标注，例如：
SELECT myapp::User FILTER .name = <str>$name
而不是:
SELECT myapp::User FILTER .name = $name`;
    }

    // 添加常见错误的处理建议
    if (errorMessage.includes('does not exist')) {
        message += `\n\n提示: 检查类型或数据库名称是否存在，并检查拼写。`;
    } else if (errorMessage.includes('permission denied')) {
        message += `\n\n提示: 当前用户可能没有足够的权限执行此操作。`;
    } else if (errorMessage.includes('syntax error')) {
        message += `\n\n提示: 查询语法有误，请检查EdgeQL语法。`;
    } else if (errorMessage.includes('connection')) {
        message += `\n\n提示: 连接问题，请检查数据库连接是否有效。`;
    }

    // 添加额外提示（如果提供）
    if (hints) {
        message += `\n\n${hints}`;
    }

    // 添加EdgeDB特定错误的提示
    if (additionalHint) {
        message += additionalHint;
    }

    return {
        content: [{
            type: "text" as const,
            text: message
        }],
        isError: true
    };
}

/**
 * 创建格式化的错误对象
 * Creates a formatted Error object
 * @param message 错误消息
 * @param message Error message
 * @param code 错误代码（可选）
 * @param code Optional error code
 * @returns 错误对象
 * @returns Error object
 */
export function createError(message: string, code?: string): Error {
    const error = new Error(message);
    if (code) {
        (error as any).code = code;
    }
    return error;
} 
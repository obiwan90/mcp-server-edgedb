/**
 * 查询相关MCP工具
 */
import { z } from "zod";
import { McpToolResponse } from "../types/mcp.js";
import { getClient } from "../services/edgedb.js";
import { handleError } from "../utils/errors.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * 注册查询相关工具
 * @param server MCP服务器实例
 */
export function registerQueryTools(server: McpServer) {
    /**
     * 执行EdgeQL查询工具
     */
    server.tool(
        "executeEdgeQL",
        { query: z.string().describe("EdgeQL查询语句") },
        async ({ query }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 执行EdgeQL查询
                const result = await client.query(query);

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (error) {
                return handleError(error, "执行EdgeQL查询", "请检查查询语法和类型是否正确");
            }
        }
    );

    /**
     * 执行带参数的EdgeQL查询工具
     */
    server.tool(
        "executeEdgeQLWithParams",
        {
            query: z.string().describe("EdgeQL参数化查询语句，使用$参数，例如: SELECT User FILTER .name = $name"),
            params: z.string().describe("参数JSON对象，例如: {\"name\":\"张三\"}")
        },
        async ({ query, params }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 解析参数
                let paramsObj;
                try {
                    paramsObj = JSON.parse(params);
                } catch (e: any) {
                    throw new Error(`参数格式错误，必须是有效的JSON: ${e.message}`);
                }

                // 自动处理参数类型，检查查询中是否为每个参数添加了类型转换
                let processedQuery = query;
                for (const paramName in paramsObj) {
                    const paramPlaceholder = `$${paramName}`;
                    // 如果参数没有类型标注(<type>$param)，自动添加
                    if (processedQuery.includes(paramPlaceholder) &&
                        !processedQuery.includes("<") &&
                        !new RegExp(`<[^>]+>${paramPlaceholder}`).test(processedQuery)) {

                        // 根据参数值类型推断EdgeDB类型
                        let typeStr = "str";
                        const paramValue = paramsObj[paramName];

                        if (typeof paramValue === "number") {
                            if (Number.isInteger(paramValue)) {
                                typeStr = "int64";
                            } else {
                                typeStr = "float64";
                            }
                        } else if (typeof paramValue === "boolean") {
                            typeStr = "bool";
                        }

                        // 替换参数为带类型标注的形式
                        processedQuery = processedQuery.replace(
                            new RegExp(`\\${paramPlaceholder}\\b`, "g"),
                            `<${typeStr}>${paramPlaceholder}`
                        );
                    }
                }

                // 执行参数化查询
                const result = await client.queryJSON(processedQuery, paramsObj);

                // 解析JSON结果
                let parsedResult;
                try {
                    parsedResult = JSON.parse(result);
                } catch (e: any) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `查询结果无法解析为JSON: ${result}`
                        }]
                    };
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(parsedResult, null, 2)
                    }]
                };
            } catch (error) {
                return handleError(error, "执行参数化查询", "请检查查询语法和参数是否正确");
            }
        }
    );

    /**
     * 查询单条记录工具
     */
    server.tool(
        "findOne",
        {
            type: z.string().describe("类型名称，例如: myapp::User"),
            filter: z.string().describe("过滤条件，例如: .name = '张三'"),
            fields: z.string().optional().describe("要返回的字段，例如: {name, email}，默认为全部字段 {*}")
        },
        async ({ type, filter, fields }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 使用executeEdgeQL工具实现，不再直接构建查询
                const { executeEdgeQL } = await import("./internal/query-helpers.js");

                // 处理字段选择，确保格式正确
                let fieldsStr = fields || '{*}';
                // 确保字段选择有花括号
                if (!fieldsStr.startsWith('{')) {
                    fieldsStr = `{${fieldsStr}}`;
                }
                if (!fieldsStr.endsWith('}')) {
                    fieldsStr = `${fieldsStr}}`;
                }

                // 构建正确格式的EdgeQL查询，确保字段选择紧跟类型名称
                const queryStr = `SELECT ${type} ${fieldsStr} FILTER ${filter} LIMIT 1`;
                console.log("执行查询:", queryStr);

                const queryResults = await executeEdgeQL(client, queryStr);
                if (!queryResults || queryResults.length === 0) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: "未找到匹配的记录"
                        }]
                    };
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(queryResults[0], null, 2)
                    }]
                };
            } catch (error) {
                console.error("查询单条记录错误:", error);
                return handleError(error, "查询单条记录", "请检查类型名称和过滤条件。确保格式为: SELECT [类型] {[字段]} FILTER [条件]");
            }
        }
    );

    /**
     * 查询多条记录工具
     */
    server.tool(
        "findMany",
        {
            type: z.string().describe("类型名称，例如: myapp::User"),
            filter: z.string().optional().describe("过滤条件，例如: .name LIKE '%张%'"),
            fields: z.string().optional().describe("要返回的字段，例如: {name, email}，默认为全部字段 {*}"),
            orderBy: z.string().optional().describe("排序条件，例如: .name ASC"),
            limit: z.number().optional().describe("最大返回记录数"),
            offset: z.number().optional().describe("跳过的记录数")
        },
        async ({ type, filter, fields, orderBy, limit, offset }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 使用executeEdgeQL工具实现，不再直接构建查询
                const { executeEdgeQL } = await import("./internal/query-helpers.js");

                // 处理字段选择，确保格式正确
                let fieldsStr = fields || '{*}';
                // 确保字段选择有花括号
                if (!fieldsStr.startsWith('{')) {
                    fieldsStr = `{${fieldsStr}}`;
                }
                if (!fieldsStr.endsWith('}')) {
                    fieldsStr = `${fieldsStr}}`;
                }

                // 构建正确格式的EdgeQL查询，确保字段选择紧跟类型名称
                let queryStr = `SELECT ${type} ${fieldsStr}`;

                // 添加过滤条件
                if (filter) {
                    queryStr += ` FILTER ${filter}`;
                }

                // 添加排序
                if (orderBy) {
                    queryStr += ` ORDER BY ${orderBy}`;
                }

                // 添加限制
                if (limit !== undefined) {
                    queryStr += ` LIMIT ${limit}`;
                }

                // 添加偏移
                if (offset !== undefined) {
                    queryStr += ` OFFSET ${offset}`;
                }

                console.log("执行查询:", queryStr);

                const queryResults = await executeEdgeQL(client, queryStr);

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(queryResults, null, 2)
                    }]
                };
            } catch (error) {
                console.error("查询多条记录错误:", error);
                return handleError(error, "查询多条记录", "请检查类型名称和查询条件。确保格式为: SELECT [类型] {[字段]} FILTER [条件]");
            }
        }
    );
} 
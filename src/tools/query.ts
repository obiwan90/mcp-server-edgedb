/**
 * 查询相关MCP工具
 * Query related MCP tools
 */
import { z } from "zod";
import { McpToolResponse } from "../types/mcp.js";
import { getClient } from "../services/edgedb.js";
import { handleError } from "../utils/errors.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * 注册查询相关工具
 * Register query related tools
 * @param server MCP服务器实例 (MCP server instance)
 */
export function registerQueryTools(server: McpServer) {
    /**
     * 执行EdgeQL查询工具
     * Execute EdgeQL query tool
     */
    server.tool(
        "executeEdgeQL",
        { query: z.string().describe("EdgeQL query statement") },
        async ({ query }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 执行EdgeQL查询
                // Execute EdgeQL query
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
     * Execute EdgeQL query with parameters tool
     */
    server.tool(
        "executeEdgeQLWithParams",
        {
            query: z.string().describe("EdgeQL parameterized query statement, using $parameters, e.g.: SELECT User FILTER .name = $name"),
            params: z.string().describe("Parameter JSON object, e.g.: {\"name\":\"John\"}")
        },
        async ({ query, params }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 解析参数
                // Parse parameters
                let paramsObj;
                try {
                    paramsObj = JSON.parse(params);
                } catch (e: any) {
                    throw new Error(`参数格式错误，必须是有效的JSON: ${e.message}`);
                }

                // 自动处理参数类型，检查查询中是否为每个参数添加了类型转换
                // Automatically process parameter types, check if type conversion is added for each parameter in the query
                let processedQuery = query;
                for (const paramName in paramsObj) {
                    const paramPlaceholder = `$${paramName}`;
                    // 如果参数没有类型标注(<type>$param)，自动添加
                    // If parameter has no type annotation (<type>$param), add it automatically
                    if (processedQuery.includes(paramPlaceholder) &&
                        !processedQuery.includes("<") &&
                        !new RegExp(`<[^>]+>${paramPlaceholder}`).test(processedQuery)) {

                        // 根据参数值类型推断EdgeDB类型
                        // Infer EdgeDB type based on parameter value type
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
                        // Replace parameter with type-annotated form
                        processedQuery = processedQuery.replace(
                            new RegExp(`\\${paramPlaceholder}\\b`, "g"),
                            `<${typeStr}>${paramPlaceholder}`
                        );
                    }
                }

                // 执行参数化查询
                // Execute parameterized query
                const result = await client.queryJSON(processedQuery, paramsObj);

                // 解析JSON结果
                // Parse JSON result
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
     * Query single record tool
     */
    server.tool(
        "findOne",
        {
            type: z.string().describe("Type name, e.g.: myapp::User"),
            filter: z.string().describe("Filter condition, e.g.: .name = 'John'"),
            fields: z.string().optional().describe("Fields to return, e.g.: {name, email}, default is all fields {*}")
        },
        async ({ type, filter, fields }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 使用executeEdgeQL工具实现，不再直接构建查询
                // Implement using executeEdgeQL tool, no longer directly building the query
                const { executeEdgeQL } = await import("./internal/query-helpers.js");

                // 处理字段选择，确保格式正确
                // Process field selection, ensure correct format
                let fieldsStr = fields || '{*}';
                // 确保字段选择有花括号
                // Ensure field selection has curly braces
                if (!fieldsStr.startsWith('{')) {
                    fieldsStr = `{${fieldsStr}}`;
                }
                if (!fieldsStr.endsWith('}')) {
                    fieldsStr = `${fieldsStr}}`;
                }

                // 构建正确格式的EdgeQL查询，确保字段选择紧跟类型名称
                // Build correctly formatted EdgeQL query, ensure field selection follows type name
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
     * Query multiple records tool
     */
    server.tool(
        "findMany",
        {
            type: z.string().describe("Type name, e.g.: myapp::User"),
            filter: z.string().optional().describe("Filter condition, e.g.: .name LIKE '%John%'"),
            fields: z.string().optional().describe("Fields to return, e.g.: {name, email}, default is all fields {*}"),
            orderBy: z.string().optional().describe("Order by condition, e.g.: .name ASC"),
            limit: z.number().optional().describe("Maximum number of records to return"),
            offset: z.number().optional().describe("Number of records to skip")
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
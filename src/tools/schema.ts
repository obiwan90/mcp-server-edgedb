/**
 * 模式管理相关MCP工具
 */
import { z } from "zod";
import { McpToolResponse } from "../types/mcp.js";
import { getClient } from "../services/edgedb.js";
import { handleError } from "../utils/errors.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 类型定义
interface SchemaProperty {
    name: string;
    required: boolean;
    target: {
        name: string;
    };
}

interface SchemaLink {
    name: string;
    required: boolean;
    target: {
        name: string;
    };
}

interface SchemaType {
    name: string;
    properties: SchemaProperty[];
    links: SchemaLink[];
}

interface SchemaComparison {
    source: string;
    target: string;
    propertyDifferences: {
        name: string;
        source: SchemaProperty;
        target: SchemaProperty;
    }[];
    linkDifferences: {
        name: string;
        source: SchemaLink;
        target: SchemaLink;
    }[];
    sourceOnlyProperties: SchemaProperty[];
    targetOnlyProperties: SchemaProperty[];
    sourceOnlyLinks: SchemaLink[];
    targetOnlyLinks: SchemaLink[];
}

/**
 * 注册模式管理相关工具
 * @param server MCP服务器实例
 */
export function registerSchemaTools(server: McpServer) {
    /**
     * 列出类型工具
     */
    server.tool(
        "listTypes",
        {
            includeSystem: z.boolean().optional().describe("是否包含系统类型")
        },
        async ({ includeSystem }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 根据EdgeDB版本构建查询
                let query;
                if (includeSystem) {
                    query = `
                        SELECT schema::ObjectType {
                            name,
                            is_abstract,
                            bases: { name }
                        }
                        ORDER BY .name;
                    `;
                } else {
                    query = `
                        SELECT schema::ObjectType {
                            name,
                            is_abstract,
                            bases: { name }
                        }
                        FILTER NOT .name LIKE 'schema::%'
                        AND NOT .name LIKE 'sys::%'
                        AND NOT .name LIKE 'std::%'
                        AND NOT .name LIKE 'cfg::%'
                        ORDER BY .name;
                    `;
                }

                const result = await client.query(query);

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (error) {
                return handleError(error, "获取类型列表", "请检查数据库连接和权限");
            }
        }
    );

    /**
     * 描述类型工具
     */
    server.tool(
        "describeType",
        {
            name: z.string().describe("类型名称，例如: myapp::User")
        },
        async ({ name }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 查询类型信息
                const result = await client.query(`
                    SELECT schema::ObjectType {
                        name,
                        is_abstract,
                        bases: { name },
                        
                        annotations: {
                            name,
                            @value
                        },
                        
                        properties: {
                            name,
                            required,
                            readonly,
                            cardinality,
                            target: {
                                name,
                                __type__: {name}
                            },
                            annotations: {
                                name,
                                @value
                            }
                        } ORDER BY .name,
                        
                        links: {
                            name,
                            required,
                            readonly,
                            cardinality,
                            target: {
                                name
                            },
                            annotations: {
                                name,
                                @value
                            }
                        } ORDER BY .name,
                        
                        indexes: {
                            expr
                        },
                        
                        constraints: {
                            name,
                            expr,
                            annotations: {
                                name,
                                @value
                            }
                        }
                    }
                    FILTER .name = <str>$name;
                `, { name });

                if (result.length === 0) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `类型 '${name}' 不存在`
                        }],
                        isError: true
                    };
                }

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(result[0], null, 2)
                    }]
                };
            } catch (error) {
                return handleError(error, "获取类型详情", "请检查类型名称是否正确");
            }
        }
    );

    /**
     * 比较模式工具
     */
    server.tool(
        "compareSchemas",
        {
            sourceType: z.string().describe("源类型名称，例如: myapp::User"),
            targetType: z.string().describe("目标类型名称，例如: myapp::Profile")
        },
        async ({ sourceType, targetType }, extra): Promise<McpToolResponse> => {
            try {
                const client = getClient();

                // 获取两个类型的属性
                const sourcePropertiesResult = await client.query(`
                    SELECT schema::ObjectType {
                        name,
                        properties: {
                            name,
                            required,
                            target: { name }
                        } ORDER BY .name,
                        links: {
                            name,
                            required,
                            target: { name }
                        } ORDER BY .name
                    }
                    FILTER .name = <str>$name;
                `, { name: sourceType });

                const targetPropertiesResult = await client.query(`
                    SELECT schema::ObjectType {
                        name,
                        properties: {
                            name,
                            required,
                            target: { name }
                        } ORDER BY .name,
                        links: {
                            name,
                            required,
                            target: { name }
                        } ORDER BY .name
                    }
                    FILTER .name = <str>$name;
                `, { name: targetType });

                if (sourcePropertiesResult.length === 0) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `源类型 '${sourceType}' 不存在`
                        }],
                        isError: true
                    };
                }

                if (targetPropertiesResult.length === 0) {
                    return {
                        content: [{
                            type: "text" as const,
                            text: `目标类型 '${targetType}' 不存在`
                        }],
                        isError: true
                    };
                }

                // 使用类型断言明确数据类型
                const sourceProperties = sourcePropertiesResult[0] as unknown as SchemaType;
                const targetProperties = targetPropertiesResult[0] as unknown as SchemaType;

                // 分析差异
                const comparison: SchemaComparison = {
                    source: sourceType,
                    target: targetType,
                    propertyDifferences: [],
                    linkDifferences: [],
                    sourceOnlyProperties: [],
                    targetOnlyProperties: [],
                    sourceOnlyLinks: [],
                    targetOnlyLinks: []
                };

                // 比较属性
                const sourceProps = sourceProperties.properties;
                const targetProps = targetProperties.properties;

                const sourcePropsMap = new Map(sourceProps.map((p: SchemaProperty) => [p.name, p]));
                const targetPropsMap = new Map(targetProps.map((p: SchemaProperty) => [p.name, p]));

                // 查找源中有但目标中没有的属性
                sourceProps.forEach((prop: SchemaProperty) => {
                    if (!targetPropsMap.has(prop.name)) {
                        comparison.sourceOnlyProperties.push(prop);
                    } else {
                        const targetProp = targetPropsMap.get(prop.name) as SchemaProperty;
                        if (prop.required !== targetProp.required ||
                            prop.target.name !== targetProp.target.name) {
                            comparison.propertyDifferences.push({
                                name: prop.name,
                                source: prop,
                                target: targetProp
                            });
                        }
                    }
                });

                // 查找目标中有但源中没有的属性
                targetProps.forEach((prop: SchemaProperty) => {
                    if (!sourcePropsMap.has(prop.name)) {
                        comparison.targetOnlyProperties.push(prop);
                    }
                });

                // 比较链接
                const sourceLinks = sourceProperties.links;
                const targetLinks = targetProperties.links;

                const sourceLinksMap = new Map(sourceLinks.map((l: SchemaLink) => [l.name, l]));
                const targetLinksMap = new Map(targetLinks.map((l: SchemaLink) => [l.name, l]));

                // 查找源中有但目标中没有的链接
                sourceLinks.forEach((link: SchemaLink) => {
                    if (!targetLinksMap.has(link.name)) {
                        comparison.sourceOnlyLinks.push(link);
                    } else {
                        const targetLink = targetLinksMap.get(link.name) as SchemaLink;
                        if (link.required !== targetLink.required ||
                            link.target.name !== targetLink.target.name) {
                            comparison.linkDifferences.push({
                                name: link.name,
                                source: link,
                                target: targetLink
                            });
                        }
                    }
                });

                // 查找目标中有但源中没有的链接
                targetLinks.forEach((link: SchemaLink) => {
                    if (!sourceLinksMap.has(link.name)) {
                        comparison.targetOnlyLinks.push(link);
                    }
                });

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify(comparison, null, 2)
                    }]
                };
            } catch (error) {
                return handleError(error, "比较模式", "请检查类型名称是否正确");
            }
        }
    );
} 
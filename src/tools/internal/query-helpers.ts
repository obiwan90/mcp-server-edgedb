/**
 * 查询辅助函数
 */
import * as edgedb from "edgedb";

/**
 * 执行EdgeQL查询，处理常见错误并重试
 * @param client EdgeDB客户端
 * @param query EdgeQL查询字符串
 * @returns 查询结果
 */
export async function executeEdgeQL(client: edgedb.Client, query: string): Promise<any[]> {
    try {
        // 首先尝试直接执行查询
        return await client.query(query);
    } catch (error) {
        console.error("EdgeQL查询执行错误:", error);

        // 根据错误类型进行特殊处理
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 处理字段选择位置错误
        if (errorMessage.includes('shapes cannot be applied to scalar type')) {
            console.log("尝试修复字段选择位置...");

            // 提取查询组件
            const typeMatch = query.match(/SELECT\s+([^\s{]+)/i);
            const fieldsMatch = query.match(/\{[^}]+\}/);

            if (typeMatch && fieldsMatch) {
                const type = typeMatch[1];
                const fields = fieldsMatch[0];

                // 删除原始字段选择
                let fixedQuery = query.replace(fields, '');

                // 在类型名称后面添加字段选择
                fixedQuery = fixedQuery.replace(type, `${type} ${fields}`);

                console.log("修复后的查询:", fixedQuery);
                return await client.query(fixedQuery);
            }
        }

        // 处理参数类型标注错误
        if (errorMessage.includes('missing a type cast before the parameter')) {
            console.log("尝试修复参数类型标注...");

            // 在参数前添加类型标注
            const fixedQuery = query.replace(/\$(\w+)/g, '<str>$1');

            console.log("修复后的查询:", fixedQuery);
            return await client.query(fixedQuery);
        }

        // 如果没有特殊处理，重新抛出错误
        throw error;
    }
} 
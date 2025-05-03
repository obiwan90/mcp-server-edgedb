/**
 * 配置管理
 */

// 环境变量配置
export const config = {
    // EdgeDB连接配置
    edgedb: {
        dsn: process.env.EDGEDB_DSN || process.env.GEL_DSN,
        instanceName: process.env.EDGEDB_INSTANCE || process.env.GEL_INSTANCE,
    },

    // 服务器配置
    server: {
        debug: process.env.DEBUG === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
    }
};

/**
 * 获取当前环境
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
    return getEnvironment() === 'development';
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
    return getEnvironment() === 'production';
} 
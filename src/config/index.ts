/**
 * 配置管理
 * Configuration management
 */

// 环境变量配置
// Environment variable configuration
export const config = {
    // EdgeDB连接配置
    // EdgeDB connection configuration
    edgedb: {
        dsn: process.env.EDGEDB_DSN || process.env.GEL_DSN,
        instanceName: process.env.EDGEDB_INSTANCE || process.env.GEL_INSTANCE,
    },

    // 服务器配置
    // Server configuration
    server: {
        debug: process.env.DEBUG === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
    }
};

/**
 * 获取当前环境
 * Get the current environment
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
    return (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
}

/**
 * 检查是否为开发环境
 * Check if it is a development environment
 */
export function isDevelopment(): boolean {
    return getEnvironment() === 'development';
}

/**
 * 检查是否为生产环境
 * Check if it is a production environment
 */
export function isProduction(): boolean {
    return getEnvironment() === 'production';
} 
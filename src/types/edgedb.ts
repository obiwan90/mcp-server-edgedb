/**
 * EdgeDB相关类型定义
 * EdgeDB related type definitions
 */
import * as edgedb from "edgedb";

// 数据库连接配置
// Database connection configuration
export interface EdgeDBConnectionConfig {
    dsn?: string;
    instanceName?: string;
}

// 数据库操作选项
// Database operation options
export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
}

// 索引创建选项
// Index creation options
export interface IndexOptions {
    unique?: boolean;
    name?: string;
}

// 事务隔离级别
// Transaction isolation levels
export enum TransactionIsolationLevel {
    SERIALIZABLE = "SERIALIZABLE",
    REPEATABLE_READ = "REPEATABLE READ"
} 
/**
 * EdgeDB相关类型定义
 */
import * as edgedb from "edgedb";

// 数据库连接配置
export interface EdgeDBConnectionConfig {
    dsn?: string;
    instanceName?: string;
}

// 数据库操作选项
export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
}

// 索引创建选项
export interface IndexOptions {
    unique?: boolean;
    name?: string;
}

// 事务隔离级别
export enum TransactionIsolationLevel {
    SERIALIZABLE = "SERIALIZABLE",
    REPEATABLE_READ = "REPEATABLE READ"
} 
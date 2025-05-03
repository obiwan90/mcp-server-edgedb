# EdgeDB MCP 服务器

这是一个使用MCP（Model Context Protocol）协议为EdgeDB数据库提供服务的工具，允许通过MCP客户端与EdgeDB数据库进行交互。

## 项目结构

项目采用模块化架构，便于维护和扩展：

```
src/
├── config/           # 配置管理
├── resources/        # MCP资源定义
│   ├── greeting.ts   # 问候资源
│   └── index.ts      # 资源统一导出
├── services/         # 服务层
│   └── edgedb.ts     # EdgeDB连接管理
├── tools/            # MCP工具定义
│   ├── database.ts   # 数据库管理工具
│   ├── query.ts      # 查询相关工具
│   ├── schema.ts     # 模式管理工具
│   └── index.ts      # 工具统一导出
├── types/            # 类型定义
│   ├── edgedb.ts     # EdgeDB相关类型
│   ├── mcp.ts        # MCP相关类型
│   └── index.ts      # 类型统一导出
├── utils/            # 工具函数
│   └── errors.ts     # 错误处理工具
└── index.ts          # 应用入口点
```

## 功能特性

服务器提供以下主要功能：

1. **资源**
   - `greeting` - 提供个性化问候

2. **数据库管理工具**
   - 连接数据库
   - 列出数据库
   - 创建/切换数据库
   - 获取当前数据库

3. **查询工具**
   - 执行EdgeQL查询
   - 执行带参数的查询
   - 查询多条/单条记录

4. **模式管理工具**
   - 列出类型
   - 获取类型详情
   - 比较模式结构

## 安装与使用

1. 安装依赖：

```bash
npm install
```

2. 构建项目：

```bash
npm run build
```

3. 启动服务器：

```bash
npm start
```

## 开发说明

- 添加新工具：在`tools`目录下创建新文件，然后在`tools/index.ts`中注册
- 添加新资源：在`resources`目录下创建新文件，然后在`resources/index.ts`中注册
- 修改配置：在`config/index.ts`中更新配置项

## 环境变量

- `EDGEDB_DSN` - EdgeDB数据库连接字符串
- `EDGEDB_INSTANCE` - EdgeDB实例名称
- `DEBUG` - 是否启用调试模式（true/false）
- `LOG_LEVEL` - 日志级别（默认：info）

## 许可证

MIT 
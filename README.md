# @obiwan90/edgedb-mcp-server

EdgeDB MCP Server is a tool based on the Model Context Protocol (MCP) that provides query and management capabilities for EdgeDB databases. It can be used as a command-line tool or integrated as a library into other projects.

## Features

- **Database Management Tools**
  - Connect to databases (supports DSN and instance name)
  - List available databases
  - Create new databases
  - Switch current database
  - Get current database information

- **Query Tools**
  - Execute EdgeQL queries
  - Execute EdgeQL queries with parameters
  - Find single records
  - Find multiple records (with filtering, sorting, pagination)

- **Schema Management Tools**
  - List types (optionally including system types)
  - Get type details
  - Compare schema structures

## Installation

### Temporary Execution (without installation)
```bash
npx -y @obiwan90/edgedb-mcp-server@latest
```

### Global Installation
```bash
npm install -g @obiwan90/edgedb-mcp-server
```

### As a Project Dependency
```bash
npm install @obiwan90/edgedb-mcp-server
```

## Usage

### Command Line Usage
```bash
# If installed globally
edgedb-mcp-server

# Or via npx for temporary execution
npx -y @obiwan90/edgedb-mcp-server
```

### Integration as a Library
```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "@obiwan90/edgedb-mcp-server/build/tools/index.js";
import { registerAllResources } from "@obiwan90/edgedb-mcp-server/build/resources/index.js";

// Initialize MCP server
const server = new McpServer({
    transport: new StdioServerTransport(),
    name: "EdgeDB MCP Server",
    description: "Providing EdgeDB database services through MCP protocol",
    version: "1.0.0"
});

// Register resources and tools
registerAllResources(server);
registerAllTools(server);

// Start the server
(async function() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log("MCP server connected, waiting for client requests...");
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
})();
```

## Environment Variables

- `EDGEDB_DSN` - EdgeDB database connection string
- `EDGEDB_INSTANCE` - EdgeDB instance name
- `DEBUG` - Enable debug mode (true/false)
- `LOG_LEVEL` - Log level (default: info)

## Project Development

### Directory Structure
```
src/
├── config/           # Configuration management
├── resources/        # MCP resource definitions
├── services/         # Service layer (EdgeDB connection management)
├── tools/            # MCP tool definitions
│   ├── database.ts   # Database management tools
│   ├── query.ts      # Query tools
│   ├── schema.ts     # Schema management tools
│   └── index.ts      # Tool exports
├── types/            # Type definitions
├── utils/            # Utility functions
└── index.ts          # Application entry point
```

### Building the Project
```bash
# Clone the project
git clone https://github.com/obiwan90/mcp-server-edgedb.git
cd mcp-server-edgedb

# Install dependencies
npm install

# Build the project
npm run build

# Start the service
npm start
```

## Cursor Integration

To integrate this MCP server with the Cursor editor, follow these steps:

1. Edit Cursor's MCP configuration file (`~/.cursor/mcp.json`)
2. Add the following configuration:

```json
"edgedb-server": {
  "command": "npx",
  "args": [
    "-y",
    "@obiwan90/edgedb-mcp-server@latest"
  ]
}
```

```json
"edgedb-server": {
  "command": "npx",
  "args": [
    "-y",
    "@obiwan90/edgedb-mcp-server@latest",
    "--instanceName",
    "your-instance-name"
  ]
}
```

3. Restart the Cursor editor
4. Now you can use EdgeDB tools in Cursor! Access them through the command palette (Cmd+Shift+P) by searching for "EdgeDB" or via the chat interface.
```json
Cursor dialog box input：

mcp_edgedb-server_connectEdgeDB(instanceName="your-instance-name")
```
## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
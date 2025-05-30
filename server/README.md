# Model Context Protocol (MCP) Server Example

## Using Claude Desktop

### Using JS file

1. Run the following commands

```bash
npm install
npm run build
```

2. Add the MCP server in Claude Desktop configuration.

```json
{
    "mcpServers": {
        "singapore-temperature": {
            "command": "node",
            "args": [
                "/<Path to root folder of the source code>/server/build/index.js"
            ]
        }
    }
}
```

### Using Docker

1. Build the Docker container image.

```bash
docker build -t mcp-server-example .
```

2. Add the MCP server in Claude Desktop configuration.

```json
{
    "mcpServers": {
        "singapore-temperature": {
            "command": "docker",
            "args": [
                "run",
                "--rm",
                "-i",
                "mcp-server-example"
            ]
        }
    }
}
```
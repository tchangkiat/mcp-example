/// <reference types="node" />

import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class BedrockClient {
    private client: BedrockRuntimeClient;

    constructor() {
        // Create a new Bedrock Runtime client instance
        this.client = new BedrockRuntimeClient({ region: "us-east-1" });
    }

    async invokeAnthropicModel(prompt: string, tools: any = [], modelId: string = "us.anthropic.claude-3-7-sonnet-20250219-v1:0") {
        // Prepare the payload for the model.
        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: [{ type: "text", text: prompt }],
                },
            ],
            tools: tools,
        };

        // Invoke LLM with the payload and wait for the response.
        const command = new InvokeModelCommand({
            contentType: "application/json",
            body: JSON.stringify(payload),
            modelId: modelId,
        });
        const apiResponse = await this.client.send(command);

        // Decode and return the response(s)
        const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
        /** @type {MessagesResponseBody} */
        return JSON.parse(decodedResponseBody);
    }
}

class MCPClient {
    private mcp: Client;
    private bedrockClient: BedrockClient;
    private transport: StdioClientTransport | null = null;
    private tools: any[] = [];

    constructor() {
        // Create a new Bedrock client
        this.bedrockClient = new BedrockClient();
        // Create a new MCP client
        this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    }

    async connectToServer(serverScriptPath: string) {
        try {
            const isJs = serverScriptPath.endsWith(".js");
            const isPy = serverScriptPath.endsWith(".py");
            if (!isJs && !isPy) {
                throw new Error("Server script must be a .js or .py file");
            }
            const command = isPy
                ? process.platform === "win32"
                    ? "python"
                    : "python3"
                : process.execPath;

            this.transport = new StdioClientTransport({
                command,
                args: [serverScriptPath],
            });
            this.mcp.connect(this.transport);

            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                };
            });
            console.log(
                "Connected to server with tools:",
                this.tools.map((tool) => tool.name)
            );
        } catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }

    async invoke(prompt: string) {
        const response = await this.bedrockClient.invokeAnthropicModel(prompt, this.tools);

        const finalText: string[] = [];

        for (const content of response.content) {
            if (content.type === "text") {
                finalText.push(content.text);
            } else if (content.type === "tool_use") {
                const toolName = content.name;
                const toolArgs = content.input as { [x: string]: unknown } | undefined;

                const toolResults = await this.mcp.callTool({
                    name: toolName,
                    arguments: toolArgs,
                });
                const toolResultContent = toolResults.content as { type: string, text: string }[]
                finalText.push(
                    `[Called tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
                );

                const response2 = await this.bedrockClient.invokeAnthropicModel(toolResultContent[0].text);

                finalText.push(
                    response2.content[0].type === "text" ? response2.content[0].text : ""
                );
            }
        }

        return finalText.join("\n");
    }

    async cleanup() {
        await this.mcp.close();
    }
}

main();

async function main() {
    if (process.argv.length < 3) {
        console.log("Usage: node build/index.js <path_to_server_script>");
        return;
    }
    const client = new MCPClient();
    try {
        const prompt = "What is Singapore weather now?"
        console.log(`Prompt: ${prompt}`);

        await client.connectToServer(process.argv[2])
        const response = await client.invoke(prompt);
        console.log(`\n${"-".repeat(50)}`);
        console.log(response);
    } catch (err) {
        console.log(`\n${err}`);
    } finally {
        await client.cleanup();
        process.exit(0);
    }
}

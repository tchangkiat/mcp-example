import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const API_BASE = "https://api-open.data.gov.sg/v2/real-time/api/air-temperature";
const USER_AGENT = "singapore-temperature-app/1.0";

// Create server instance
const server = new McpServer({
    name: "singapore-temperature",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// Helper function for making API requests
async function makeWeatherDataRequest<T>(url: string): Promise<T | null> {
    const headers = {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error("Error making request:", error);
        return null;
    }
}

// Interfaces are created based on the response of https://api-open.data.gov.sg/v2/real-time/api/air-temperature

interface Reading {
    timestamp: string;
    data: ReadingData[];
}

interface ReadingData {
    stationId?: string;
    value?: number;
}

interface WeatherDataResponse {
    data: {
        readings: Reading[];
    };
}

// Register weather tools
server.tool(
    "get-singapore-temperature",
    "Get weather for Singapore",
    async () => {
        // Get weather data
        const weatherData = await makeWeatherDataRequest<WeatherDataResponse>(API_BASE);
        if (!weatherData) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve weather data",
                    },
                ],
            };
        }

        // Format weather data
        const weatherText = "Temperature in Singapore is " + weatherData.data.readings[0].data[0].value + "°C"

        return {
            content: [
                {
                    type: "text",
                    text: weatherText,
                },
            ],
        };
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Singapore Weather MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
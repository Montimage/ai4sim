export interface Tool {
    id: string;
    name: string;
    successMessage?: string;
    port?: number;
}

export const TOOL_CONFIGS: Tool[] = [
    {
        id: "maip",
        name: "MAIP",
        successMessage: "[HTTP SERVER] MAIP Server started",
        port: 31057
    },
    {
        id: "caldera",
        name: "Caldera",
        successMessage: "All systems ready, visit /enter",
        port: 8888
    }
];

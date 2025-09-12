export const PORTS = {
    WEBSOCKET: 8080,
    CALDERA: 8888,
    MAIP: 31057,
    HTTP: 3000,
    WS: 9090
} as const;

export const COMMANDS = {
    CALDERA: "tools/caldera/start_caldera.sh",
    MAIP: "tools/maip/start_maip_iframe.sh"
};

export const ERROR_MESSAGES = {
    COMMAND_NOT_ALLOWED: "Command not allowed",
    PROCESS_ALREADY_RUNNING: "Process already running",
    CONNECTION_ERROR: "Connection error occurred",
    MAX_CONNECTIONS_REACHED: "Maximum connections reached"
};

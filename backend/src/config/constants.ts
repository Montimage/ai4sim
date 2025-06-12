export const PORTS = {
    WEBSOCKET: 8080,
    CALDERA: 8888,
    MAIP: 31057,
    HTTP: 3000,
    WS: 9090
} as const;

export const COMMANDS = {
    CALDERA: "/home/hamdouni-mohamed/MMT/Dashboard/Fusion/Old_Stable/tools/caldera/start_caldera.sh",
    MAIP: "/home/hamdouni-mohamed/Montimage/start_maip.sh"
};

export const ERROR_MESSAGES = {
    COMMAND_NOT_ALLOWED: "Command not allowed",
    PROCESS_ALREADY_RUNNING: "Process already running",
    CONNECTION_ERROR: "Connection error occurred",
    MAX_CONNECTIONS_REACHED: "Maximum connections reached"
};

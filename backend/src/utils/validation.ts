export const validateCommand = (command: string, allowedCommands: string[]): boolean => {
    return allowedCommands.some(cmd => command.includes(cmd));
};

export const validatePort = (port: number): boolean => {
    return port > 0 && port < 65536;
};

export const sanitizeInput = (input: string): string => {
    return input.replace(/[;&|`$]/g, "");
};

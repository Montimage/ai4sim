declare module 'tcp-port-used' {
    export function check(port: number, host?: string): Promise<boolean>;
    export function waitUntilUsed(port: number, retryMs?: number, timeOutMs?: number, host?: string): Promise<void>;
    export function waitUntilFree(port: number, retryMs?: number, timeOutMs?: number, host?: string): Promise<void>;
}

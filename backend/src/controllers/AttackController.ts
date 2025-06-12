import { Request, Response } from "express";
import { ProcessManager } from "../services/ProcessManager";
import { logger } from "../utils/logger";
import { validateCommand } from "../utils/validation";
import { config } from "../config/config";

export class AttackController {
    private processManager: ProcessManager;

    constructor() {
        this.processManager = ProcessManager.getInstance();
    }

    async executeAttack(req: Request, res: Response) {
        try {
            const { command, parameters, tabId } = req.body;

            if (!command) {
                return res.status(400).json({ error: "Command is required" });
            }

            if (!validateCommand(command, config.security.allowedCommands)) {
                return res.status(403).json({ error: "Command not allowed" });
            }

            await this.processManager.startProcess(
                command,
                parameters || {},
                tabId || Date.now().toString(),
                (output) => logger.info(`[Attack ${tabId}] Output: ${output}`),
                (error) => logger.error(`[Attack ${tabId}] Error: ${error}`),
                (notification) => logger.info(`[Attack ${tabId}] Notification: ${notification.message}`)
            );

            return res.json({ success: true, tabId });
        } catch (error) {
            logger.error("Execute attack error:", error);
            return res.status(500).json({ error: "Failed to execute attack" });
        }
    }

    async stopAttack(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await this.processManager.stopProcess(id);
            return res.json({ success: true });
        } catch (error) {
            logger.error("Stop attack error:", error);
            return res.status(500).json({ error: "Failed to stop attack" });
        }
    }

    async getStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const status = this.processManager.getProcessStatus(id);
            return res.json({ status });
        } catch (error) {
            logger.error("Get status error:", error);
            return res.status(500).json({ error: "Failed to get attack status" });
        }
    }
}

import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { PORTS } from "../config/constants";
import tcpPortUsed from "tcp-port-used";
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class SystemController {
    async getSystemStatus(_req: Request, res: Response): Promise<Response> {
        try {
            const services = await this.checkServices();
            const memory = process.memoryUsage();
            
            return res.json({
                status: "operational",
                services,
                memory: {
                    heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
                    rss: Math.round(memory.rss / 1024 / 1024)
                },
                uptime: process.uptime()
            });
        } catch (error) {
            logger.error("System status error:", error);
            return res.status(500).json({ error: "Failed to get system status" });
        }
    }

    private async checkServices() {
        const services = {
            caldera: await this.checkPort(PORTS.CALDERA),
            maip: await this.checkPort(PORTS.MAIP)
        };
        return services;
    }

    public async checkPort(port: number): Promise<{ isInUse: boolean, processInfo?: any }> {
        try {
            const isInUse = await tcpPortUsed.check(port);
            logger.info(`Port ${port} check result: ${isInUse}`);

            if (isInUse) {
                // Si le port est utilisé, vérifier quel processus l'utilise
                try {
                    const { stdout } = await execPromise(`lsof -i :${port} -n -P -F p`);
                    const pid = stdout.trim().split('\n')[0]?.slice(1);
                    
                    // Obtenir plus d'informations sur le processus
                    const { stdout: psOut } = await execPromise(`ps -p ${pid} -o comm=`);
                    const command = psOut.trim();

                    return { 
                        isInUse: true, 
                        processInfo: {
                            pid: parseInt(pid, 10),
                            command
                        }
                    };
                } catch (error) {
                    logger.error(`Failed to get process info for port ${port}:`, error);
                    return { isInUse: true };
                }
            }
            return { isInUse: false };
        } catch (error) {
            logger.error(`Error checking port ${port}:`, error);
            return { isInUse: false };
        }
    }
}

import dotenv from 'dotenv';

dotenv.config();

export const config = {
    server: {
        port: process.env.PORT || 3000,
        wsPort: process.env.WS_PORT || 9090,
        host: process.env.HOST || "localhost"
    },
    security: {
        allowedCommands: ["caldera", "start_maip.sh", "docker"],
        maxConnections: 10,
        rateLimitRequests: 100,
        rateLimitWindow: 60000,
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        jwtExpiresIn: '24h'
    },
    logging: {
        level: process.env.LOG_LEVEL || "info",
        filename: "server.log"
    },
    process: {
        maxExecutionTime: 3600000, // 1 hour
        maxConcurrent: 5
    },
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard-fusion',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '24h'
    }
};

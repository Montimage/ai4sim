import winston from 'winston';
import path from 'path';

// Format sans aucun préfixe pour toutes les sorties
const cleanFormat = winston.format.printf(({ message }) => {
  return `${message}`;
});

// Logger sans préfixes
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Fichiers de log
    new winston.transports.File({
      filename: path.join(process.cwd(), 'error.log'),
      level: 'error',
      format: cleanFormat
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'server.log'),
      format: cleanFormat
    }),
    // Console sans préfixes
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

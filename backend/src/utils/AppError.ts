/**
 * Classe d'erreur personnalisée pour l'application
 * Permet une gestion cohérente des erreurs avec codes HTTP
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indique que c'est une erreur opérationnelle (attendue)

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): AppError {
    return new AppError(message, 400);
  }

  static unauthorized(message: string = "Non autorisé"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message: string = "Accès interdit"): AppError {
    return new AppError(message, 403);
  }

  static notFound(message: string = "Ressource non trouvée"): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }

  static validationError(message: string): AppError {
    return new AppError(message, 422);
  }

  static internalError(message: string = "Erreur interne du serveur"): AppError {
    return new AppError(message, 500);
  }
}
// filepath: /home/hamdouni-mohamed/MMT/Dashboard/17.04/frontend/src/types/attackStatusEnum.ts

// Définir les constantes pour les statuts d'attaque
export const AttackStatusEnum = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

// Type basé sur les constantes
export type AttackStatusType = typeof AttackStatusEnum[keyof typeof AttackStatusEnum];

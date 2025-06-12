import { AttackStatus } from '../models/Scenario';

export interface Terminal {
  id: string;
  scenarioId: string;
  attackId: string;
  tool: string;
  status: AttackStatus;
  output: string[];
  startTime: Date;
  endTime?: Date;
}

export interface TerminalManager {
  terminals: Map<string, Terminal>;
  getTerminal(id: string): Terminal | undefined;
  createTerminal(scenarioId: string, attackId: string, tool: string): Terminal;
  appendOutput(id: string, output: string): void;
  appendError(id: string, error: string): void;
  updateStatus(id: string, status: AttackStatus): void;
  removeTerminal(id: string): void;
  clearTerminal(id: string): void;
  getTerminalsByScenario(scenarioId: string): Terminal[];
}

import { ExecutionStep, IAgentSession } from '../models/AgentSession';
import { IAgentConfig } from '../models/AgentConfig';
import { spawn } from 'child_process';
import { llmService, LLMRequest } from './LLMService';
import { logger } from '../utils/logger';

export class AgentService {
  
  /**
   * Exécute le Scanning Agent pour la reconnaissance
   */
  async executeScanningAgent(step: ExecutionStep, config: IAgentConfig, session: IAgentSession): Promise<any> {
    logger.info(`🔍 Exécution Scanning Agent pour ${session.targetIp}`);
    
    try {
      // Construire la commande nmap selon les paramètres
      const { scanType = 'nmap', ports = '1-1000', aggressive = false } = step.parameters;
      
      let nmapCommand: string[];
      if (scanType === 'quick') {
        nmapCommand = ['nmap', '-T4', '-F', session.targetIp];
      } else if (aggressive) {
        nmapCommand = ['nmap', '-T4', '-A', '-p', ports, session.targetIp];
      } else {
        nmapCommand = ['nmap', '-T4', '-sV', '-sC', '-p', ports, session.targetIp];
      }

      // Exécuter le scan
      const scanResult = await this.executeCommand(nmapCommand);
      
      // Analyser les résultats avec l'IA
      const analysisRequest: LLMRequest = {
        prompt: `Analyse ce résultat de scan Nmap et extraie les informations structurées:

${scanResult.stdout}

Retourne un JSON avec cette structure:
{
  "os": "Système d'exploitation détecté",
  "ports": [
    {
      "port": 80,
      "service": "http",
      "version": "Apache 2.4.41",
      "state": "open",
      "protocol": "tcp"
    }
  ],
  "vulnerabilities": [
    {
      "severity": "high",
      "description": "Description de la vulnérabilité",
      "service": "http",
      "port": 80
    }
  ]
}`,
        agentType: 'ScanningAgent'
      };

      const analysisResponse = await llmService.sendRequest(analysisRequest, config);
      const parsedResults = this.parseJSON(analysisResponse.content);

      // Mettre à jour les données découvertes dans la session
      if (session.discoveredData) {
        session.discoveredData.ports = [...session.discoveredData.ports, ...parsedResults.ports];
      } else {
        session.discoveredData = {
          os: parsedResults.os,
          ports: parsedResults.ports || [],
          vulnerabilities: parsedResults.vulnerabilities || [],
          scanTimestamp: new Date()
        };
      }

      return {
        rawOutput: scanResult.stdout,
        parsedData: parsedResults,
        command: nmapCommand.join(' ')
      };

    } catch (error: any) {
      throw new Error(`Erreur Scanning Agent: ${error.message}`);
    }
  }

  /**
   * Exécute MAIP Agent pour les attaques IA
   */
  async executeMAIPAgent(step: ExecutionStep, config: IAgentConfig, session: IAgentSession): Promise<any> {
    logger.info(`🤖 Exécution MAIP Agent`);
    
    try {
      // Simuler l'exécution de MAIP (en attendant l'intégration réelle)
      const maipRequest: LLMRequest = {
        prompt: `Tu es MAIP, un agent d'attaque IA. 

Cible: ${session.targetIp}
Paramètres: ${JSON.stringify(step.parameters)}
Services découverts: ${JSON.stringify(session.discoveredData?.ports || [])}

Simule une attaque intelligente et retourne le résultat au format JSON:
{
  "attackType": "Type d'attaque utilisée",
  "success": true/false,
  "findings": ["Liste des découvertes"],
  "evidence": ["Preuves de l'attaque"],
  "recommendations": ["Recommandations"]
}`,
        agentType: 'MAIPAgent'
      };

      const response = await llmService.sendRequest(maipRequest, config);
      const result = this.parseJSON(response.content);

      return {
        tool: 'MAIP',
        result: result,
        timestamp: new Date()
      };

    } catch (error: any) {
      throw new Error(`Erreur MAIP Agent: ${error.message}`);
    }
  }

  /**
   * Exécute Caldera Agent pour les simulations d'attaque
   */
  async executeCalderaAgent(step: ExecutionStep, config: IAgentConfig, session: IAgentSession): Promise<any> {
    logger.info(`⚔️ Exécution Caldera Agent`);
    
    try {
      // Simuler Caldera (en attendant l'intégration réelle)
      const calderaRequest: LLMRequest = {
        prompt: `Tu es un agent Caldera de simulation d'attaque.
        
Cible: ${session.targetIp}
Paramètres: ${JSON.stringify(step.parameters)}
Contexte: ${JSON.stringify(session.discoveredData)}

Simule une opération Caldera et retourne:
{
  "operation": "Nom de l'opération",
  "adversary": "Profil d'adversaire utilisé",
  "techniques": ["T1059", "T1021"],
  "success": true/false,
  "timeline": [
    {
      "step": 1,
      "technique": "T1059",
      "description": "Command and Scripting Interpreter",
      "result": "success"
    }
  ]
}`,
        agentType: 'CalderaAgent'
      };

      const response = await llmService.sendRequest(calderaRequest, config);
      const result = this.parseJSON(response.content);

      return {
        tool: 'Caldera',
        result: result,
        timestamp: new Date()
      };

    } catch (error: any) {
      throw new Error(`Erreur Caldera Agent: ${error.message}`);
    }
  }

  /**
   * Exécute Shennina Pentest Agent
   */
  async executeShenninaPentestAgent(step: ExecutionStep, config: IAgentConfig, session: IAgentSession): Promise<any> {
    logger.info(`🎯 Exécution Shennina Pentest Agent`);
    
    try {
      const shenninaTquest: LLMRequest = {
        prompt: `Tu es Shennina, un agent de test de pénétration expert.
        
Cible: ${session.targetIp}
Services découverts: ${JSON.stringify(session.discoveredData?.ports || [])}
Paramètres: ${JSON.stringify(step.parameters)}

Effectue un test de pénétration méthodique et retourne:
{
  "methodology": "OWASP/NIST/PTES",
  "tests_performed": [
    {
      "test": "Nom du test",
      "target": "Service cible",
      "result": "success/failed",
      "vulnerability": "CVE ou description",
      "severity": "critical/high/medium/low",
      "proof": "Preuve de concept"
    }
  ],
  "summary": {
    "tests_run": 5,
    "vulnerabilities_found": 2,
    "risk_level": "high"
  }
}`,
        agentType: 'ShenninaPentestAgent'
      };

      const response = await llmService.sendRequest(shenninaTquest, config);
      const result = this.parseJSON(response.content);

      return {
        tool: 'Shennina Pentest',
        result: result,
        timestamp: new Date()
      };

    } catch (error: any) {
      throw new Error(`Erreur Shennina Pentest Agent: ${error.message}`);
    }
  }

  /**
   * Exécute MMT Attacker Agent
   */
  

  // =============================================================================
  // MÉTHODES UTILITAIRES
  // =============================================================================

  /**
   * Exécute une commande système
   */
  private async executeCommand(command: string[], options: any = {}): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command[0], command.slice(1), {
        ...options,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Timeout
      if (options.timeout) {
        setTimeout(() => {
          process.kill();
          reject(new Error('Command timeout'));
        }, options.timeout);
      }
    });
  }

  /**
   * Parse JSON de manière sécurisée
   */
  private parseJSON(content: string): any {
    try {
      // Nettoyer le contenu (enlever les markdown, etc.)
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.warn('Erreur parsing JSON, retour d\'un objet par défaut:', error);
      return {
        error: 'Parsing failed',
        rawContent: content
      };
    }
  }
} 
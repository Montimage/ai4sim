import { AttackService } from './AttackService';
import { Scenario, IScenario, AttackStatus } from '../models/Scenario';
import { Campaign } from '../models/Campaign';
import { ProcessManager } from './ProcessManager';
import { TerminalManager } from './TerminalManager';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
export class ScenarioService {
  private static instance: ScenarioService;
  private attackService: AttackService;
  private processManager: ProcessManager;
  private terminalManager: TerminalManager;
  private executingScenarios: Map<string, boolean>;

  private constructor() {
    this.attackService = AttackService.getInstance();
    this.processManager = ProcessManager.getInstance();
    this.terminalManager = TerminalManager.getInstance();
    this.executingScenarios = new Map();
  }

  public static getInstance(): ScenarioService {
    if (!ScenarioService.instance) {
      ScenarioService.instance = new ScenarioService();
    }
    return ScenarioService.instance;
  }

  /**
   * Creates a new scenario
   */
  async createScenario(data: {
    name: string;
    description?: string;
    projectId: string;
    campaignId?: string;
    userId: string;
    targets: Array<{
      host: string;
      port: number;
      protocol: string;
      hasAgent?: boolean;
      agentConfig?: any;
    }>;
    attacks: Array<{
      tool: string;
      parameters: Record<string, any>;
    }>;
    sequence?: boolean;
  }): Promise<IScenario> {
    try {
      logger.info(`📝 Creating scenario - Data:`, {
        name: data.name,
        projectId: data.projectId,
        campaignId: data.campaignId
      });

      const scenario = new Scenario({
        name: data.name,
        description: data.description,
        project: new mongoose.Types.ObjectId(data.projectId),
        campaign: data.campaignId ? new mongoose.Types.ObjectId(data.campaignId) : undefined,
        targets: data.targets,
        attacks: data.attacks.map(attack => ({
          ...attack,
          status: AttackStatus.PENDING,
          startTime: undefined,
          endTime: undefined,
          output: []
        })),
        sequence: data.sequence !== undefined ? data.sequence : true,
        status: AttackStatus.PENDING,
        createdBy: new mongoose.Types.ObjectId(data.userId),
        executionTime: 0
      });

      const savedScenario = await scenario.save();
      if (!savedScenario) {
        throw new AppError('Failed to save scenario', 500);
      }
      
      logger.info(`✅ Scenario created: ${savedScenario._id} for project ${data.projectId}`);

      // If scenario is created in a campaign, update the campaign
      if (data.campaignId) {
        logger.info(`🔄 Updating campaign ${data.campaignId} with new scenario ${savedScenario._id}`);
        
        const campaign = await Campaign.findById(data.campaignId);
        if (!campaign) {
          logger.error(`❌ Campaign ${data.campaignId} not found during update`);
          throw new AppError('Campaign not found', 404);
        }

        // Initialize scenarioIds array if it doesn't exist
        if (!campaign.scenarioIds) {
          campaign.scenarioIds = [];
        }

        // Add scenario ID to the campaign
        campaign.scenarioIds.push(savedScenario._id);
        
        // Initialize or update progress tracking
        if (!campaign.executionProgress) {
          campaign.executionProgress = {
            total: 1,
            completed: 0,
            failed: 0,
            running: 0,
            pending: 1
          };
        } else {
          campaign.executionProgress.total++;
          campaign.executionProgress.pending++;
        }
        
        await campaign.save();
        logger.info(`✅ Campaign ${data.campaignId} successfully updated - Total scenarios: ${campaign.scenarioIds.length}`);
      }

      return savedScenario;
    } catch (error) {
      logger.error('❌ Error creating scenario:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create scenario', 500);
    }
  }

  /**
   * Gets all scenarios for a project
   */
  async getScenariosByProject(projectId: string): Promise<IScenario[]> {
    try {
      return await Scenario.find({ project: new mongoose.Types.ObjectId(projectId) });
    } catch (error) {
      logger.error(`Error retrieving scenarios for project ${projectId}:`, error);
      throw new AppError('Failed to retrieve scenarios', 500);
    }
  }

  /**
   * Gets all scenarios for a campaign
   */
  async getScenariosByCampaign(campaignId: string): Promise<IScenario[]> {
    try {
      logger.info(`🔍 Searching for scenarios in campaign ${campaignId}`);
      
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        logger.warn(`❌ Campaign ${campaignId} not found`);
        throw new AppError('Campaign not found', 404);
      }

      logger.info(`📊 Campaign ${campaignId} status:`, {
        scenarioIds: campaign.scenarioIds,
        scenarioIdsLength: campaign.scenarioIds ? campaign.scenarioIds.length : 0,
        executionProgress: campaign.executionProgress
      });

      if (!campaign.scenarioIds || campaign.scenarioIds.length === 0) {
        logger.info(`ℹ️ No scenarios found in campaign ${campaignId} - scenarioIds: ${JSON.stringify(campaign.scenarioIds)}`);
        return [];
      }

      // Debug: show scenario IDs to search for
      logger.info(`🔎 Searching for scenarios with IDs:`, campaign.scenarioIds.map(id => id.toString()));

      // Load scenarios that are part of the campaign
      const scenarios = await Scenario.find({
        _id: { $in: campaign.scenarioIds }
      }).populate(['targets', 'attacks']);

      logger.info(`🔍 Scenarios found in database: ${scenarios.length}`);
      if (scenarios.length > 0) {
        logger.info(`📋 Found scenario IDs:`, scenarios.map(s => s._id.toString()));
      }

      if (!scenarios || scenarios.length === 0) {
        logger.warn(`⚠️ No scenarios found in database for campaign ${campaignId} despite ${campaign.scenarioIds.length} referenced IDs`);
        logger.warn(`⚠️ Searched IDs:`, campaign.scenarioIds.map(id => id.toString()));
        return [];
      }

      // Check if all scenarios were found
      if (scenarios.length !== campaign.scenarioIds.length) {
        logger.warn(`⚠️ Desynchronization detected: ${scenarios.length} scenarios found out of ${campaign.scenarioIds.length} referenced in campaign ${campaignId}`);
        logger.info('Found scenario IDs:', scenarios.map(s => s._id.toString()));
        logger.info('Expected scenario IDs:', campaign.scenarioIds.map(id => id.toString()));
      }

      logger.info(`✅ ${scenarios.length} scenarios found for campaign ${campaignId}`);
      return scenarios;
    } catch (err) {
      logger.error(`❌ Error retrieving scenarios for campaign ${campaignId}:`, err);
      throw err instanceof AppError ? err : new AppError('Error retrieving scenarios', 500);
    }
  }

  /**
   * Gets a scenario by its ID
   */
  async getScenarioById(scenarioId: string): Promise<IScenario> {
    try {
      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }
      return scenario;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error retrieving scenario ${scenarioId}:`, error);
      throw new AppError('Failed to retrieve scenario', 500);
    }
  }

  /**
   * Updates a scenario
   */
  async updateScenario(scenarioId: string, updates: Partial<IScenario>): Promise<IScenario> {
    try {
      const existingScenario = await Scenario.findById(scenarioId);
      if (!existingScenario) {
        throw new AppError('Scenario not found', 404);
      }

      if (existingScenario.status === AttackStatus.RUNNING) {
        throw new AppError('Cannot modify a running scenario', 400);
      }

      // Reset statuses if attacks are modified
      if (updates.attacks) {
        updates.attacks = updates.attacks.map(attack => ({
          ...attack,
          status: AttackStatus.PENDING,
          startTime: undefined,
          endTime: undefined,
          output: []
        }));
      }

      const scenario = await Scenario.findByIdAndUpdate(
        scenarioId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      return scenario;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error updating scenario ${scenarioId}:`, error);
      throw new AppError('Failed to update scenario', 500);
    }
  }

  /**
   * Deletes a scenario
   */
  async deleteScenario(scenarioId: string): Promise<void> {
    try {
      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      // Check if scenario is running
      if (scenario.status === AttackStatus.RUNNING) {
        await this.stopScenarioExecution(scenarioId);
      }

      // Delete all associated terminals
      const terminals = this.terminalManager.getTerminalsByScenario(scenarioId);
      terminals.forEach(terminal => {
        this.terminalManager.removeTerminal(terminal.id);
      });

      await Scenario.findByIdAndDelete(scenarioId);
      this.executingScenarios.delete(scenarioId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error deleting scenario ${scenarioId}:`, error);
      throw new AppError('Failed to delete scenario', 500);
    }
  }

  /**
   * Starts the execution of a scenario
   */
  async startScenarioExecution(scenarioId: string): Promise<IScenario> {
    try {
      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      if (scenario.status === AttackStatus.RUNNING) {
        throw new AppError('Scenario is already running', 400);
      }

      // Reset execution state
      scenario.status = AttackStatus.RUNNING;
      scenario.startTime = new Date();
      scenario.executionTime = 0;
      
      // Clear all old terminals for this scenario
      this.terminalManager.clearScenarioTerminals(scenarioId);
      
      await scenario.save();

      // Mark as executing
      this.executingScenarios.set(scenarioId, true);

      // Execute attacks
      if (scenario.sequence) {
        this.executeSequentially(scenario).catch(error => {
          logger.error(`Error during sequential execution of scenario ${scenarioId}:`, error);
          this.handleScenarioError(scenario, error);
        });
      } else {
        this.executeInParallel(scenario).catch(error => {
          logger.error(`Error during parallel execution of scenario ${scenarioId}:`, error);
          this.handleScenarioError(scenario, error);
        });
      }

      return scenario;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error starting scenario ${scenarioId}:`, error);
      throw new AppError('Failed to start scenario', 500);
    }
  }

  /**
   * Stops the execution of a scenario
   */
  async stopScenarioExecution(scenarioId: string): Promise<IScenario> {
    try {
      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      if (scenario.status !== AttackStatus.RUNNING && scenario.status !== AttackStatus.PAUSED) {
        throw new AppError('Scenario is not running', 400);
      }

      // Stop execution
      this.executingScenarios.set(scenarioId, false);

      // Stop all running attacks
      const stopPromises = scenario.attacks.map(async attack => {
        if (attack.status === AttackStatus.RUNNING && attack.processId) {
          try {
            await this.processManager.stopProcess(attack.processId);
            attack.status = AttackStatus.STOPPED;
            attack.endTime = new Date();
            
            // Update terminal
            const terminalId = `${scenarioId}-${attack._id}`;
            this.terminalManager.updateStatus(terminalId, AttackStatus.STOPPED);
          } catch (err) {
            logger.error(`Error stopping process ${attack.processId}:`, err);
          }
        }
      });

      await Promise.all(stopPromises);

      // Update scenario
      scenario.status = AttackStatus.STOPPED;
      scenario.endTime = new Date();
      if (scenario.startTime) {
        scenario.executionTime = Math.round((scenario.endTime.getTime() - scenario.startTime.getTime()) / 1000);
      }
      await scenario.save();

      return scenario;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error stopping scenario ${scenarioId}:`, error);
      throw new AppError('Failed to stop scenario', 500);
    }
  }

  /**
   * Pauses the execution of a scenario
   */
  async pauseScenarioExecution(scenarioId: string): Promise<IScenario> {
    try {
      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      if (scenario.status !== AttackStatus.RUNNING) {
        throw new AppError('Scenario is not running', 400);
      }

      // For parallel attacks, we can't really "pause"
      if (!scenario.sequence) {
        throw new AppError('Pause is only possible for sequential scenarios', 400);
      }

      // Mark scenario as paused
      this.executingScenarios.set(scenarioId, false);
      scenario.status = AttackStatus.PAUSED;
      await scenario.save();

      return scenario;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error pausing scenario ${scenarioId}:`, error);
      throw new AppError('Failed to pause scenario', 500);
    }
  }

  /**
   * Resumes the execution of a paused scenario
   */
  async resumeScenarioExecution(scenarioId: string): Promise<IScenario> {
    try {
      const scenario = await Scenario.findById(scenarioId);
      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      if (scenario.status !== AttackStatus.PAUSED) {
        throw new AppError('Scenario is not paused', 400);
      }

      if (!scenario.sequence) {
        throw new AppError('Resume is only possible for sequential scenarios', 400);
      }

      // Update scenario status
      scenario.status = AttackStatus.RUNNING;
      await scenario.save();

      // Mark as executing
      this.executingScenarios.set(scenarioId, true);

      // Find first unfinished attack
      const index = scenario.attacks.findIndex(attack => 
        attack.status !== AttackStatus.COMPLETED && 
        attack.status !== AttackStatus.FAILED &&
        attack.status !== AttackStatus.STOPPED
      );
      
      if (index !== -1) {
        this.executeSequentiallyFromIndex(scenario, index).catch(error => {
          logger.error(`Error resuming scenario ${scenarioId}:`, error);
          this.handleScenarioError(scenario, error);
        });
      } else {
        // All attacks are finished
        scenario.status = AttackStatus.COMPLETED;
        scenario.endTime = new Date();
        if (scenario.startTime) {
          scenario.executionTime = Math.round((scenario.endTime.getTime() - scenario.startTime.getTime()) / 1000);
        }
        await scenario.save();
      }

      return scenario;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error resuming scenario ${scenarioId}:`, error);
      throw new AppError('Failed to resume scenario', 500);
    }
  }

  /**
   * Executes scenario attacks sequentially
   */
  private async executeSequentially(scenario: IScenario): Promise<void> {
    for (let i = 0; i < scenario.attacks.length; i++) {
      if (!this.executingScenarios.get(scenario._id.toString())) {
        break;
      }
      await this.executeAttack(scenario, i);
    }

    // Update final status if all attacks are completed
    if (this.executingScenarios.get(scenario._id.toString())) {
      await this.finalizeScenario(scenario);
    }
  }

  /**
   * Executes scenario attacks in parallel
   */
  private async executeInParallel(scenario: IScenario): Promise<void> {
    logger.info(`Starting parallel execution of ${scenario.attacks.length} attacks for scenario ${scenario._id}`);
    
    const attackPromises = scenario.attacks.map(async (_, index) => {
      try {
        await this.executeAttack(scenario, index);
        logger.info(`Attack ${index + 1} completed successfully`);
      } catch (error) {
        logger.error(`Attack ${index + 1} failed:`, error);
        // Don't throw error in parallel mode, let other attacks continue
      }
    });

    // Use Promise.allSettled to wait for all attacks regardless of failures
    const results = await Promise.allSettled(attackPromises);
    
    logger.info(`Parallel execution completed. Results: ${results.map((r, i) => `Attack ${i + 1}: ${r.status}`).join(', ')}`);

    // Update final status
    await this.finalizeScenario(scenario);
  }

  /**
   * Executes attacks from a given index (for resume)
   */
  private async executeSequentiallyFromIndex(scenario: IScenario, startIndex: number): Promise<void> {
    for (let i = startIndex; i < scenario.attacks.length; i++) {
      if (!this.executingScenarios.get(scenario._id.toString())) {
        break;
      }
      await this.executeAttack(scenario, i);
    }

    // Update final status if all attacks are completed
    if (this.executingScenarios.get(scenario._id.toString())) {
      await this.finalizeScenario(scenario);
    }
  }

  /**
   * Executes a specific attack
   */
  private async executeAttack(scenario: IScenario, attackIndex: number): Promise<void> {
    const attack = scenario.attacks[attackIndex];
    const target = scenario.targets[attack.parameters.targetIndex];

    const terminal = this.terminalManager.createTerminal(
      scenario._id.toString(),
      attack._id.toString(),
      attack.tool,
      attackIndex  // Passer l'index pour créer un ID user-friendly
    );

    try {
      logger.info(`Starting attack ${attackIndex + 1} (${attack.tool}) for scenario ${scenario._id}`);
      
      // Update attack status atomically
      await Scenario.updateOne(
        { _id: scenario._id, 'attacks._id': attack._id },
        { 
          $set: { 
            'attacks.$.status': AttackStatus.RUNNING,
            'attacks.$.startTime': new Date()
          }
        }
      );

      // Send initialization message with user-friendly ID
      this.terminalManager.appendOutput(
        terminal.id, 
        `Launching attack ${attackIndex + 1}: ${attack.tool}`
      );

      // Check if this tool requires multi-terminal setup (like Shennina)
      const isMultiTerminalTool = attack.tool === 'shennina';
      let result: any;

      if (isMultiTerminalTool) {
        // Use multi-terminal execution for tools like Shennina
        result = await this.attackService.executeAttackWithMultiTerminal(
          attack,
          target,
          (output: string, terminalId?: string) => {
            if (terminalId) {
              // Check if additional terminal already exists, if not create it
              let additionalTerminal = this.terminalManager.getTerminal(terminalId);
              if (!additionalTerminal) {
                // Extract terminal name from terminalId
                const terminalName = terminalId.includes('pre-') ? 
                  (terminalId.includes('pre-0') ? 'Exfiltration Server' : 'MSF RPC Server') :
                  'Initialize Exploits Tree';
                
                additionalTerminal = this.terminalManager.createTerminal(
                  scenario._id.toString(),
                  terminalId,
                  `${attack.tool}-additional`,
                  attackIndex
                );
                
                // Notify frontend about the new additional terminal
                this.terminalManager.appendOutput(terminalId, `🚀 Starting ${terminalName}...`);
              }
              this.terminalManager.appendOutput(terminalId, output);
            } else {
              this.terminalManager.appendOutput(terminal.id, output);
            }
          },
          (error: string, terminalId?: string) => {
            if (terminalId) {
              // Check if additional terminal already exists, if not create it
              let additionalTerminal = this.terminalManager.getTerminal(terminalId);
              if (!additionalTerminal) {
                const terminalName = terminalId.includes('pre-') ? 
                  (terminalId.includes('pre-0') ? 'Exfiltration Server' : 'MSF RPC Server') :
                  'Initialize Exploits Tree';
                
                additionalTerminal = this.terminalManager.createTerminal(
                  scenario._id.toString(),
                  terminalId,
                  `${attack.tool}-additional`,
                  attackIndex
                );
                
                // Notify frontend about the new additional terminal
                this.terminalManager.appendOutput(terminalId, `🚀 Starting ${terminalName}...`);
              }
              this.terminalManager.appendError(terminalId, error);
            } else {
              this.terminalManager.appendError(terminal.id, error);
            }
          }
        );
        
        // If additional terminals were created, notify the frontend
        if (result.additionalTerminals && result.additionalTerminals.length > 0) {
          logger.info(`Created ${result.additionalTerminals.length} additional terminals for ${attack.tool}`);
          
          // Send notification about additional terminals
          for (const additionalTerminalId of result.additionalTerminals) {
            const terminalName = additionalTerminalId.includes('pre-') ? 
              (additionalTerminalId.includes('pre-0') ? 'Exfiltration Server' : 'MSF RPC Server') :
              'Initialize Exploits Tree';
            
            this.terminalManager.appendOutput(additionalTerminalId, `✅ ${terminalName} terminal ready`);
          }
        }
      } else {
        // Use standard single-terminal execution
        result = await this.attackService.executeAttack(
          attack,
          target,
          (output: string) => {
            this.terminalManager.appendOutput(terminal.id, output);
          },
          (error: string) => {
            this.terminalManager.appendError(terminal.id, error);
          }
        );
      }

      // Update attack with process ID and success status atomically
      await Scenario.updateOne(
        { _id: scenario._id, 'attacks._id': attack._id },
        { 
          $set: { 
            'attacks.$.processId': result.tabId,
            'attacks.$.status': AttackStatus.COMPLETED,
            'attacks.$.endTime': new Date()
          }
        }
      );

      this.terminalManager.updateStatus(terminal.id, AttackStatus.COMPLETED);
      logger.info(`Attack ${attackIndex + 1} completed successfully`);

    } catch (error) {
      logger.error(`Attack ${attackIndex + 1} failed:`, error);
      
      // Update attack with failure status atomically
      await Scenario.updateOne(
        { _id: scenario._id, 'attacks._id': attack._id },
        { 
          $set: { 
            'attacks.$.status': AttackStatus.FAILED,
            'attacks.$.endTime': new Date()
          }
        }
      );

      this.terminalManager.updateStatus(terminal.id, AttackStatus.FAILED);
      
      // Continue execution even if attacks fail in sequential mode
      // The scenario will be marked as failed/partial at the end based on overall results
    }
  }

  /**
   * Handles an error that occurred during scenario execution
   */
  private async handleScenarioError(scenario: IScenario, error: any): Promise<void> {
    try {
      scenario.status = AttackStatus.FAILED;
      scenario.endTime = new Date();
      if (scenario.startTime) {
        scenario.executionTime = Math.round((scenario.endTime.getTime() - scenario.startTime.getTime()) / 1000);
      }
      await scenario.save();
      
      this.executingScenarios.delete(scenario._id.toString());
      logger.error(`Scenario ${scenario._id} ended with error:`, error);
    } catch (err) {
      logger.error(`Error handling scenario error for ${scenario._id}:`, err);
    }
  }

  /**
   * Finalizes a scenario by updating its final status
   */
  private async finalizeScenario(scenario: IScenario): Promise<void> {
    try {
      const allCompleted = scenario.attacks.every(
        attack => attack.status === AttackStatus.COMPLETED
      );
      
      scenario.status = allCompleted ? AttackStatus.COMPLETED : AttackStatus.FAILED;
      scenario.endTime = new Date();
      
      if (scenario.startTime) {
        scenario.executionTime = Math.round((scenario.endTime.getTime() - scenario.startTime.getTime()) / 1000);
      }
      
      await scenario.save();
      this.executingScenarios.delete(scenario._id.toString());
      
      logger.info(`Scenario ${scenario._id} completed with status: ${scenario.status}`);
    } catch (error) {
      logger.error(`Error finalizing scenario ${scenario._id}:`, error);
    }
  }
}

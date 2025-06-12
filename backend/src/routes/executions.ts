import { Router } from 'express';
import { ExecutionController } from '../controllers/ExecutionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const executionController = new ExecutionController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all executions for the authenticated user
router.get('/', executionController.getAllExecutions.bind(executionController));

// Get executions for a specific scenario
router.get('/scenario/:scenarioId', executionController.getExecutionsForScenario.bind(executionController));

// Get a specific execution by ID
router.get('/:executionId', executionController.getExecution.bind(executionController));

// Create a new execution
router.post('/', executionController.createExecution.bind(executionController));

// Update an execution
router.put('/:executionId', executionController.updateExecution.bind(executionController));

// Delete an execution
router.delete('/:executionId', executionController.deleteExecution.bind(executionController));

// Add output line to execution
router.post('/:executionId/output', executionController.addOutputLine.bind(executionController));

// Add output line to specific attack
router.post('/:executionId/attacks/:attackId/output', executionController.addAttackOutputLine.bind(executionController));

// Update attack status
router.put('/:executionId/attacks/:attackId', executionController.updateAttackStatus.bind(executionController));

// Clear attack output
router.delete('/:executionId/attacks/:attackId/output', executionController.clearAttackOutput.bind(executionController));

// Clear all attack outputs
router.delete('/:executionId/attacks/output', executionController.clearAllAttackOutputs.bind(executionController));

export default router; 
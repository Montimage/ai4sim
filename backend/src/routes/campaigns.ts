import express from 'express';
import { Router } from 'express';
import { CampaignController } from '../controllers/CampaignController';

const router: Router = express.Router({ mergeParams: true }); // Add mergeParams to access :projectId
const campaignController = new CampaignController();

// Routes pour les campagnes
// Fix parameter names to match controller expectations
router.get('/:campaignId', campaignController.getCampaign.bind(campaignController));
router.post('/', campaignController.createCampaign.bind(campaignController));
router.put('/:campaignId', campaignController.updateCampaign.bind(campaignController));
router.delete('/:campaignId', campaignController.deleteCampaign.bind(campaignController));

// Routes pour les scénarios d'une campagne - handled by projectManagement.ts
// Note: Scenario CRUD operations are handled in projectManagement.ts to avoid route conflicts

export default router;
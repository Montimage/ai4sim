import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { isValidObjectId } from 'mongoose';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { AttackService } from '../services/AttackService';

export class ProjectController {
  private attackService?: AttackService;

  constructor() {
    // AttackService will be initialized later
  }

  public initializeServices() {
    this.attackService = AttackService.getInstance();
  }

  async createProject(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;
      
      const project = new Project({
        name: name || `Project ${new Date().toLocaleString()}`,
        description: description || 'No description provided',
        owner: req.user._id
      });
      
      await project.save();
      logger.info(`Project created successfully by user ${req.user._id}: ${project._id}`);
      return res.status(201).json(project);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error creating project: ${errorMessage}`, { error, user: req.user._id });
      return res.status(500).json({ 
        message: 'Error creating project', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  async getProjects(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      logger.info('🔍 getProjects called', {
        userId,
        userIdFromReq: req.user._id,
        username: req.user.username
      });
      
      const query = {
        $or: [
          { owner: userId },
          { 'sharedWith.userId': userId }
        ]
      };
      
      logger.info('📋 MongoDB query for projects:', {
        query: JSON.stringify(query, null, 2),
        userId,
        userIdFromReq: req.user._id
      });
      
      const projects = await Project.find(query);
      
      logger.info('📋 Projects query result:', {
        foundCount: projects.length,
        projects: projects.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          owner: p.owner.toString(),
          sharedWith: p.sharedWith?.map((s: any) => ({
            userId: s.userId.toString(),
            role: s.role
          })) || []
        })),
        searchingForUserId: userId,
        searchingForUserIdFromReq: req.user._id
      });
      
      logger.info(`Successfully fetched ${projects.length} projects for user ${userId}`);
      return res.json(projects);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error fetching projects: ${errorMessage}`, { error, user: req.user._id });
      return res.status(500).json({ 
        message: 'Error fetching projects', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  async getProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;
      
      logger.info('🔍 getProject called', {
        projectId,
        userId,
        userIdFromReq: req.user._id,
        username: req.user.username,
        isValidObjectId: isValidObjectId(projectId)
      });
      
      if (!isValidObjectId(projectId)) {
        logger.warn(`Invalid project ID format: ${projectId}`);
        return res.status(400).json({ message: 'Invalid project ID format' });
      }
      
      // Log the query we're about to make
      const query = {
        _id: projectId,
        $or: [
          { owner: userId },
          { 'sharedWith.userId': userId }
        ]
      };
      
      logger.info('📋 MongoDB query:', {
        query: JSON.stringify(query, null, 2),
        userId,
        userIdFromReq: req.user._id
      });
      
      const project = await Project.findOne(query);
      
      logger.info('📋 Project query result:', {
        found: !!project,
        projectId: project?._id,
        projectName: project?.name,
        projectOwner: project?.owner,
        projectSharedWith: project?.sharedWith,
        queryUserId: userId,
        queryUserIdFromReq: req.user._id
      });
      
      if (!project) {
        // Let's also try to find the project without user restrictions to see if it exists at all
        const projectExists = await Project.findById(projectId);
        logger.warn('🔍 Project existence check:', {
          projectId,
          exists: !!projectExists,
          owner: projectExists?.owner,
          sharedWith: projectExists?.sharedWith,
          requestingUserId: userId,
          requestingUserIdFromReq: req.user._id
        });
        
        logger.warn(`Project ${projectId} not found or user ${userId} lacks access`);
        return res.status(404).json({ message: 'Project not found or access denied' });
      }
      
      logger.info(`Successfully fetched project ${projectId} for user ${userId}`);
      return res.json(project);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error fetching project: ${errorMessage}`, { 
        error, 
        user: req.user._id,
        projectId: req.params.projectId,
        stack: error instanceof Error ? error.stack : undefined
      });
      return res.status(500).json({ 
        message: 'Error fetching project', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  async shareProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { username, userId, role } = req.body;
      
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      if ((!username && !userId) || !role) {
        return res.status(400).json({ message: 'Username/userId and role are required' });
      }
      
      const project = await Project.findOne({ _id: projectId });
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      if (!req.user?.id || project.owner.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Only project owner can share the project' });
      }
      
      // Find user by username or userId
      let userToShare;
      if (username) {
        userToShare = await User.findOne({ username });
      } else if (userId && isValidObjectId(userId)) {
        userToShare = await User.findById(userId);
      }
      
      if (!userToShare) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent sharing with owner
      if (userToShare._id.toString() === req.user.id) {
        return res.status(400).json({ message: 'Cannot share project with yourself' });
      }
      
      // Check if user is already in sharedWith
      const existingShareIndex = project.sharedWith.findIndex(s => 
        s.username === userToShare.username || s.userId?.toString() === userToShare._id.toString()
      );
      
      if (existingShareIndex !== -1) {
        // Update existing share
        project.sharedWith[existingShareIndex].role = role;
        project.sharedWith[existingShareIndex].username = userToShare.username;
      } else {
        // Add new share
        project.sharedWith.push({
          userId: userToShare._id,
          username: userToShare.username,
          role
        });
      }
      
      await project.save();
      return res.json(project);
    } catch (error) {
      logger.error('Error sharing project:', error);
      return res.status(500).json({ message: 'Error sharing project' });
    }
  }

  async addCampaign(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const campaign = {
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name || `Campaign ${new Date().toLocaleString()}`,
        description: req.body.description || 'No description provided',
        scenarios: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      logger.info(`Adding campaign to project ${projectId} for user ${req.user._id}`);
      if (!isValidObjectId(projectId)) {
        logger.warn(`Invalid project ID format: ${projectId}`);
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      // Ajout de la campagne
      const project = await Project.findOneAndUpdate(
        {
          _id: projectId,
          $or: [
            { owner: req.user._id },
            { 
              'sharedWith': {
                $elemMatch: {
                  userId: req.user._id,
                  role: 'editor'
                }
              }
            }
          ]
        },
        { $push: { campaigns: campaign } },
        { new: true }
      );
      if (!project) {
        logger.warn(`User ${req.user._id} lacks permissions for project ${projectId}`);
        return res.status(403).json({ message: 'Insufficient permissions to modify this project' });
      }
      // Relire le projet pour garantir que campaigns est à jour
      const updatedProject = await Project.findById(projectId);
      logger.info(`Successfully added campaign to project ${projectId}`);
      return res.json(updatedProject);
    } catch (error) {
      logger.error('Error adding campaign:', error);
      return res.status(500).json({ message: 'Error adding campaign' });
    }
  }

  async updateCampaign(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId } = req.params;
      const updates = req.body;
      
      // Validation des entrées
      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId)) {
        logger.warn(`Invalid ID format: projectId=${projectId}, campaignId=${campaignId}`);
        return res.status(400).json({ message: 'Invalid project or campaign ID format' });
      }
      
      if (!updates || typeof updates !== 'object') {
        logger.warn(`Invalid update payload for campaign: ${campaignId}`);
        return res.status(400).json({ message: 'Invalid update data' });
      }
      
      logger.info(`Updating campaign ${campaignId} in project ${projectId} by user ${req.user._id}`);
      
      // Construction des champs à mettre à jour de manière dynamique
      const updateFields: Record<string, any> = {};
      
      if (updates.name) updateFields['campaigns.$.name'] = updates.name;
      if (updates.description) updateFields['campaigns.$.description'] = updates.description;
      if (updates.scenarios) updateFields['campaigns.$.scenarios'] = updates.scenarios;
      
      // Toujours mettre à jour le timestamp
      updateFields['campaigns.$.updatedAt'] = new Date();
      
      const project = await Project.findOneAndUpdate(
        {
          _id: projectId,
          'campaigns._id': campaignId,
          $or: [
            { owner: req.user._id },
            {
              'sharedWith': {
                $elemMatch: {
                  userId: req.user._id,
                  role: 'editor'
                }
              }
            }
          ]
        },
        { $set: updateFields },
        { new: true }
      );
      
      if (!project) {
        logger.warn(`Campaign update failed: projectId=${projectId}, campaignId=${campaignId}, userId=${req.user._id}`);
        return res.status(404).json({ message: 'Campaign not found or insufficient permissions' });
      }
      
      logger.info(`Successfully updated campaign ${campaignId} in project ${projectId}`);
      return res.json(project);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error updating campaign: ${errorMsg}`, error);
      return res.status(500).json({ message: 'Error updating campaign', error: errorMsg });
    }
  }

  async deleteProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      const project = await Project.findOneAndDelete({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          {
            'sharedWith': {
              $elemMatch: {
                userId: req.user._id,
                role: 'owner'
              }
            }
          }
        ]
      });
      if (!project) {
        return res.status(404).json({ message: 'Project not found or insufficient permissions' });
      }
      return res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      logger.error('Error deleting project:', error);
      return res.status(500).json({ message: 'Error deleting project' });
    }
  }

  async addScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId } = req.params;
      const scenario = {
        _id: new mongoose.Types.ObjectId(),
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const project = await Project.findOneAndUpdate(
        {
          _id: projectId,
          'campaigns._id': campaignId,
          $or: [
            { owner: req.user._id },
            { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['owner', 'editor'] } } } }
          ]
        },
        { $push: { 'campaigns.$.scenarios': scenario } },
        { new: true }
      );
      if (!project) {
        return res.status(404).json({ message: 'Project or campaign not found or insufficient permissions' });
      }
      return res.json(project);
    } catch (error) {
      logger.error('Error adding scenario:', error);
      return res.status(500).json({ message: 'Error adding scenario' });
    }
  }

  async updateScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;
      const updates = req.body;
      const project = await Project.findOneAndUpdate(
        {
          _id: projectId,
          'campaigns._id': campaignId,
          'campaigns.scenarios._id': scenarioId,
          $or: [
            { owner: req.user._id },
            { 'sharedWith': { $elemMatch: { userId: req.user._id, role: 'editor' } } }
          ]
        },
        {
          $set: {
            'campaigns.$[campaign].scenarios.$[scenario].name': updates.name,
            'campaigns.$[campaign].scenarios.$[scenario].description': updates.description,
            'campaigns.$[campaign].scenarios.$[scenario].targets': updates.targets,
            'campaigns.$[campaign].scenarios.$[scenario].attacks': updates.attacks,
            'campaigns.$[campaign].scenarios.$[scenario].updatedAt': new Date()
          }
        },
        {
          arrayFilters: [
            { 'campaign._id': campaignId },
            { 'scenario._id': scenarioId }
          ],
          new: true
        }
      );
      if (!project) {
        return res.status(404).json({ message: 'Project, campaign or scenario not found or insufficient permissions' });
      }
      return res.json(project);
    } catch (error) {
      logger.error('Error updating scenario:', error);
      return res.status(500).json({ message: 'Error updating scenario' });
    }
  }

  async deleteScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;
      const project = await Project.findOneAndUpdate(
        {
          _id: projectId,
          'campaigns._id': campaignId,
          $or: [
            { owner: req.user._id },
            { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['owner', 'editor'] } } } }
          ]
        },
        {
          $pull: { 'campaigns.$.scenarios': { _id: scenarioId } }
        },
        { new: true }
      );
      if (!project) {
        return res.status(404).json({ message: 'Project, campaign or scenario not found or insufficient permissions' });
      }
      return res.json(project);
    } catch (error) {
      logger.error('Error deleting scenario:', error);
      return res.status(500).json({ message: 'Error deleting scenario' });
    }
  }

  async runScenario(req: AuthRequest, res: Response) {
    try {
      if (!this.attackService) {
        throw new Error('AttackService not initialized');
      }
      const { projectId, campaignId, scenarioId } = req.params;
      const project = await Project.findOne({
        _id: projectId,
        'campaigns._id': campaignId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: 'editor' } } }
        ]
      });
      if (!project) {
        return res.status(404).json({ message: 'Project or campaign not found or insufficient permissions' });
      }
if (!project.campaigns) {
        return res.status(404).json({ message: "Campaigns not found for this project" });
      }
      const campaign = project.campaigns.find(c => c._id.toString() === campaignId);
      const scenario = campaign?.scenarios.find(s => s._id.toString() === scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: 'Scenario not found' });
      }
      // Exécuter le scénario de manière asynchrone
      this.attackService.executeScenario(
        projectId,
        campaignId,
        scenarioId,
        scenario.targets,
        scenario.attacks
      ).catch(error => {
        logger.error('Error executing scenario:', error);
      });
      return res.json({ message: 'Scenario execution started' });
    } catch (error) {
      logger.error('Error starting scenario:', error);
      return res.status(500).json({ message: 'Error starting scenario execution' });
    }
  }

  async runCampaign(req: AuthRequest, res: Response) {
    try {
      if (!this.attackService) {
        throw new Error('AttackService not initialized');
      }
      const { projectId, campaignId } = req.params;
      const project = await Project.findOne({
        _id: projectId,
        'campaigns._id': campaignId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: 'editor' } } }
        ]
      });
      if (!project) {
        return res.status(404).json({ message: 'Project or campaign not found or insufficient permissions' });
      }
if (!project.campaigns) {
        return res.status(404).json({ message: "Campaigns not found for this project" });
      }
      const campaign = project.campaigns.find(c => c._id.toString() === campaignId);
      if (!campaign || !campaign.scenarios || campaign.scenarios.length === 0) {
        return res.status(400).json({ message: 'Campaign has no scenarios' });
      }
      // Exécuter la campagne de manière asynchrone
      this.attackService.executeCampaign(
        projectId,
        campaignId
      ).catch(error => {
        logger.error('Error executing campaign:', error);
      });
      return res.json({ message: 'Campaign execution started' });
    } catch (error) {
      logger.error('Error starting campaign:', error);
      return res.status(500).json({ message: 'Error starting campaign execution' });
    }
  }

  async exportCampaign(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId } = req.params;
      const project = await Project.findOne({
        _id: projectId,
        'campaigns._id': campaignId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ]
      });
      if (!project) {
        return res.status(404).json({ message: 'Project or campaign not found or insufficient permissions' });
      }
if (!project.campaigns) {
        return res.status(404).json({ message: "Campaigns not found for this project" });
      }
      const campaign = project.campaigns.find(c => c._id.toString() === campaignId);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      // Préparer l'export
      const exportData = {
        campaign: {
          name: campaign.name,
          description: campaign.description,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
          scenarios: campaign.scenarios
        }
      };
      return res.json(exportData);
    } catch (error) {
      logger.error('Error exporting campaign:', error);
      return res.status(500).json({ message: 'Error exporting campaign' });
    }
  }

  async updateProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const updates = req.body;
      
      logger.info('🔍 updateProject called', { 
        projectId, 
        updates, 
        hasUsers: !!updates.users, 
        usersLength: updates.users?.length,
        requestUserId: req.user._id,
        requestUsername: req.user.username
      });
      
      if (!isValidObjectId(projectId)) {
        logger.warn(`Invalid project ID format: ${projectId}`);
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      // Récupérer le projet avec les informations complètes
      const project = await mongoose.model('Project').findById(projectId);
      if (!project) {
        logger.warn(`Project not found: ${projectId}`);
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Vérifier les permissions de l'utilisateur actuel
      const isOwner = project.owner.toString() === req.user._id;
      const userInSharedWith = project.sharedWith?.find((shared: any) => 
        shared.userId.toString() === req.user._id
      );
      const isEditor = userInSharedWith?.role === 'editor';
      const isViewer = userInSharedWith?.role === 'viewer';
      
      logger.info('🔐 User permissions check:', {
        userId: req.user._id,
        username: req.user.username,
        isOwner,
        isEditor,
        isViewer,
        projectOwner: project.owner.toString(),
        userRole: userInSharedWith?.role || 'none'
      });
      
      // Vérifier si l'utilisateur a accès au projet
      if (!isOwner && !isEditor && !isViewer) {
        logger.warn('❌ User has no access to project');
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Si la mise à jour concerne le transfert de propriété
      if (updates.owner) {
        logger.info('📝 Taking ownership transfer path');
        
        // Seul le owner peut transférer la propriété
        if (!isOwner) {
          logger.warn('❌ Only owner can transfer ownership');
          return res.status(403).json({ message: 'Only the owner can transfer ownership' });
        }
        
        return this.handleOwnershipTransfer(req, res, projectId, updates.owner);
      }
      
      // Si la mise à jour concerne les utilisateurs
      if (updates.users && Array.isArray(updates.users)) {
        logger.info('👥 Taking users update path');
        
        // Seul le owner peut modifier les utilisateurs
        if (!isOwner) {
          logger.warn('❌ Only owner can modify users');
          return res.status(403).json({ message: 'Only the owner can modify project users' });
        }
        
        return this.handleUsersUpdate(res, project, updates.users);
      }
      
      // Pour les autres mises à jour (nom, description, etc.)
      // Les editors peuvent modifier le contenu, mais pas les permissions
      if (isViewer) {
        logger.warn('❌ Viewers cannot modify project');
        return res.status(403).json({ message: 'Viewers cannot modify the project' });
      }
      
      // Filtrer les champs que les editors ne peuvent pas modifier
      const allowedFields = ['name', 'description', 'campaigns'];
      const filteredUpdates: any = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        } else if (!isOwner) {
          logger.warn(`❌ Editor tried to modify restricted field: ${key}`);
        }
      });
      
      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      
      // Mettre à jour le projet
      const updatedProject = await mongoose.model('Project').findByIdAndUpdate(
        projectId,
        { $set: filteredUpdates },
        { new: true }
      );
      
      logger.info('✅ Project updated successfully');
      return res.json(updatedProject);
      
    } catch (error) {
      logger.error('Error updating project:', error);
      return res.status(500).json({ message: 'Failed to update project' });
    }
  }

  private async handleUsersUpdate(res: Response, project: any, users: any[]) {
    try {
      logger.info('👥 Users data received:', { 
        users: users,
        count: users.length,
        userDetails: users.map((u: any) => ({ 
          id: u._id, 
          username: u.username, 
          role: u.role,
          hasValidId: u._id && isValidObjectId(u._id)
        }))
      });
      
      // Validation stricte des rôles
      const validRoles = ['owner', 'editor', 'viewer'];
      const invalidRoles = users.filter(user => !validRoles.includes(user.role));
      if (invalidRoles.length > 0) {
        logger.warn('❌ Invalid roles detected:', invalidRoles);
        return res.status(400).json({ 
          message: 'Invalid roles detected',
          invalidRoles: invalidRoles.map(u => ({ username: u.username, role: u.role }))
        });
      }
      
      // Vérifier qu'il n'y a qu'un seul owner
      const owners = users.filter(user => user.role === 'owner');
      if (owners.length !== 1) {
        logger.warn('❌ Must have exactly one owner');
        return res.status(400).json({ 
          message: 'A project must have exactly one owner',
          ownersFound: owners.length
        });
      }
      
      // Vérifier que l'owner actuel reste owner (pas de changement de propriétaire via cette route)
      const newOwner = owners[0];
      if (newOwner._id !== project.owner.toString()) {
        logger.warn('❌ Cannot change owner via users update');
        return res.status(400).json({ 
          message: 'Cannot change project owner via users update. Use transfer ownership instead.'
        });
      }
      
      // Séparer les utilisateurs avec des IDs valides de ceux sans
      const usersWithValidIds = users.filter((user: any) => user._id && isValidObjectId(user._id));
      const usersWithInvalidIds = users.filter((user: any) => !user._id || !isValidObjectId(user._id));
      
      logger.info('👥 User validation results:', {
        totalUsers: users.length,
        validIds: usersWithValidIds.length,
        invalidIds: usersWithInvalidIds.length,
        validUsers: usersWithValidIds.map((u: any) => ({ id: u._id, username: u.username, role: u.role })),
        invalidUsers: usersWithInvalidIds.map((u: any) => ({ id: u._id, username: u.username, role: u.role }))
      });
      
      if (usersWithInvalidIds.length > 0) {
        logger.warn('⚠️ Some users have invalid IDs:', usersWithInvalidIds);
        return res.status(400).json({ 
          message: 'Some users have invalid IDs',
          invalidUsers: usersWithInvalidIds.map((u: any) => ({ username: u.username, id: u._id }))
        });
      }
      
      // Vérifier que tous les utilisateurs existent dans la base de données
      const userIds = usersWithValidIds.map((user: any) => user._id);
      logger.info('🔍 Checking if users exist in database:', { userIds });
      
      const User = mongoose.model('User');
      const existingUsers = await User.find({ _id: { $in: userIds } }).select('_id username role');
      
      logger.info('📋 Database query results:', {
        requestedIds: userIds,
        foundUsers: existingUsers.map((u: any) => ({ _id: u._id.toString(), username: u.username, role: u.role })),
        foundCount: existingUsers.length,
        expectedCount: userIds.length
      });
      
      if (existingUsers.length !== userIds.length) {
        const foundIds = existingUsers.map((u: any) => u._id.toString());
        const missingIds = userIds.filter((id: string) => !foundIds.includes(id));
        logger.warn('❌ Some users not found in database:', { missingIds });
        return res.status(400).json({ 
          message: 'Some users do not exist',
          missingUserIds: missingIds
        });
      }
      
      // Construire la nouvelle liste sharedWith (exclut l'owner)
      const newSharedWith = usersWithValidIds
        .filter(user => user.role !== 'owner') // L'owner n'est pas dans sharedWith
        .map(user => {
          const userInfo = existingUsers.find((u: any) => u._id.toString() === user._id);
          const finalUsername = userInfo?.username || user.username;
          
          if (!finalUsername) {
            logger.warn(`⚠️ No username found for user ${user._id}`);
            throw new Error(`Username not found for user ${user._id}`);
          }
          
          return {
            userId: user._id,
            username: finalUsername,
            role: user.role
          };
        });
      
      logger.info('📝 Updating project with new sharedWith:', {
        projectId: project._id,
        newSharedWith,
        sharedWithCount: newSharedWith.length
      });
      
      // Mettre à jour le projet
      const updatedProject = await mongoose.model('Project').findByIdAndUpdate(
        project._id,
        { 
          $set: { 
            sharedWith: newSharedWith,
            updatedAt: new Date()
          } 
        },
        { new: true }
      );
      
      if (!updatedProject) {
        logger.error('❌ Failed to update project');
        return res.status(500).json({ message: 'Failed to update project' });
      }
      
      logger.info('✅ Project users updated successfully');
      return res.json(updatedProject);
      
    } catch (error) {
      logger.error('Error updating project users:', error);
      return res.status(500).json({ message: 'Failed to update project users' });
    }
  }

  private async handleOwnershipTransfer(req: AuthRequest, res: Response, projectId: string, newOwnerData: any) {
    try {
      // Vérifier si l'utilisateur est propriétaire du projet
      const project = await Project.findOne({
        _id: projectId,
        owner: req.user._id
      });
      
      if (!project) {
        logger.warn(`Ownership transfer failed - not owner: ${projectId}, user: ${req.user._id}`);
        return res.status(404).json({ message: 'Project not found or you are not the owner' });
      }
      
      // Vérifier si le nouveau propriétaire existe
      if (!isValidObjectId(newOwnerData._id)) {
        logger.warn(`Invalid new owner ID: ${newOwnerData._id}`);
        return res.status(400).json({ message: 'Invalid new owner ID format' });
      }
      
      const newOwner = await User.findOne({ _id: newOwnerData._id });
      if (!newOwner) {
        logger.warn(`New owner not found: ${newOwnerData._id}`);
        return res.status(404).json({ message: 'New owner not found' });
      }
      
      // Mettre à jour la propriété
      project.owner = newOwner._id;
      
      // Ajouter l'ancien propriétaire comme éditeur
      const oldOwnerShare = {
        userId: req.user._id,
        username: req.user.username,
        role: 'editor' as const
      };
      
      // Retirer le nouveau propriétaire de la liste des utilisateurs partagés
      project.sharedWith = project.sharedWith.filter(user => 
        user.userId.toString() !== newOwner._id.toString()
      );
      
      // Ajouter l'ancien propriétaire à la liste des utilisateurs partagés
      project.sharedWith.push(oldOwnerShare);
      
      await project.save();
      logger.info(`Ownership transferred for project ${projectId} from ${req.user._id} to ${newOwner._id}`);
      
      return res.json(project);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error in ownership transfer: ${errorMessage}`, { 
        error,
        projectId,
        userId: req.user._id,
        newOwnerId: newOwnerData?._id 
      });
      throw error; // Relancer l'erreur pour qu'elle soit gérée par la méthode parente
    }
  }

  async removeUserFromProject(req: AuthRequest, res: Response) {
    try {
      const { projectId, userId } = req.params;
      
      if (!isValidObjectId(projectId) || !isValidObjectId(userId)) {
        logger.warn(`Invalid ID format: projectId=${projectId}, userId=${userId}`);
        return res.status(400).json({ message: 'Invalid project ID or user ID format' });
      }
      
      const project = await Project.findOne({
        _id: projectId,
        owner: req.user._id
      });
      
      if (!project) {
        logger.warn(`Project not found or user not owner: ${projectId}, user: ${req.user._id}`);
        return res.status(404).json({ message: 'Project not found or you are not the owner' });
      }
      
      if (userId === project.owner.toString()) {
        logger.warn(`Cannot remove owner from project: ${projectId}`);
        return res.status(400).json({ message: 'Cannot remove the owner from project' });
      }
      
      // Remove user from sharedWith array
      const initialLength = project.sharedWith.length;
      project.sharedWith = project.sharedWith.filter(share => share.userId.toString() !== userId);
      
      if (project.sharedWith.length === initialLength) {
        logger.info(`User ${userId} not found in project ${projectId}`);
        return res.status(404).json({ message: 'User not found in project' });
      }
      
      await project.save();
      logger.info(`User ${userId} removed from project ${projectId} by ${req.user._id}`);
      return res.json(project);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error removing user from project: ${errorMessage}`, { 
        error, 
        user: req.user._id,
        projectId: req.params.projectId,
        userId: req.params.userId
      });
      return res.status(500).json({ 
        message: 'Error removing user from project', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  async getScenariosForCampaign(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId } = req.params;
      const userId = req.user?.id;
      
      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId)) {
        logger.warn(`Invalid ID format: projectId=${projectId}, campaignId=${campaignId}`);
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      
      // Verify user has access to this project
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: userId },
          { 'sharedWith.userId': userId }
        ]
      });
      
      if (!project) {
        logger.warn(`Project ${projectId} not found or user ${userId} lacks access`);
        return res.status(404).json({ message: 'Project not found or access denied' });
      }
      
      // Get campaign from database
      const campaign = await mongoose.model('Campaign').findOne({
        _id: campaignId,
        project: projectId
      });
      
      if (!campaign) {
        logger.warn(`Campaign ${campaignId} not found in project ${projectId}`);
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Get scenarios for this campaign
      logger.info(`🔍 Recherche des scénarios avec les IDs de campagne:`, campaign.scenarioIds);
      const scenarios = await mongoose.model('Scenario').find({
        _id: { $in: campaign.scenarioIds }
      });
      
      logger.info(`📋 ${scenarios.length} scénarios trouvés pour la campagne ${campaignId}`);
      if (scenarios.length > 0) {
        logger.info(`📋 IDs des scénarios trouvés:`, scenarios.map(s => s._id.toString()));
      }
      
      logger.info(`Successfully fetched ${scenarios.length} scenarios for campaign ${campaignId}`);
      return res.json(scenarios);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error fetching scenarios for campaign: ${errorMessage}`, { error, user: req.user._id });
      return res.status(500).json({ 
        message: 'Error fetching scenarios for campaign', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  async getCampaignById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!isValidObjectId(id)) {
        logger.warn(`Invalid campaign ID format: ${id}`);
        return res.status(400).json({ message: 'Invalid campaign ID format' });
      }
      
      // Get campaign from database
      const campaign = await mongoose.model('Campaign').findById(id);
      
      if (!campaign) {
        logger.warn(`Campaign ${id} not found`);
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Verify user has access to the project this campaign belongs to
      const project = await Project.findOne({
        _id: campaign.project,
        $or: [
          { owner: userId },
          { 'sharedWith.userId': userId }
        ]
      });
      
      if (!project) {
        logger.warn(`User ${userId} lacks access to project for campaign ${id}`);
        return res.status(403).json({ message: 'Access denied to this campaign' });
      }
      
      logger.info(`Successfully fetched campaign ${id} for user ${userId}`);
      return res.json(campaign);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error fetching campaign: ${errorMessage}`, { error, user: req.user._id });
      return res.status(500).json({ 
        message: 'Error fetching campaign', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
}
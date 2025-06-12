import mongoose from 'mongoose';
import { Scenario } from '../models/Scenario';
import { Campaign } from '../models/Campaign';
import { Project } from '../models/Project';
import { config } from '../config/config';

/**
 * Script to create a predefined Shennina scenario
 */
async function createShenninaPredefinedScenario() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Find or create a default project
    let defaultProject = await Project.findOne({ name: 'Shennina Demo Project' });
    if (!defaultProject) {
      defaultProject = new Project({
        name: 'Shennina Demo Project',
        description: 'Demonstration project for Shennina AI penetration testing framework',
        owner: new mongoose.Types.ObjectId(), // Use owner instead of createdBy
        status: 'active'
      });
      await defaultProject.save();
      console.log('Created default project:', defaultProject._id);
    }

    // Find or create a default campaign
    let defaultCampaign = await Campaign.findOne({ 
      name: 'Shennina AI Assessment Campaign',
      project: defaultProject._id 
    });
    if (!defaultCampaign) {
      defaultCampaign = new Campaign({
        name: 'Shennina AI Assessment Campaign',
        description: 'AI-powered penetration testing campaign using Shennina framework',
        project: defaultProject._id,
        createdBy: new mongoose.Types.ObjectId(), // Campaign uses createdBy
        status: 'draft', // Use valid enum value
        scenarioIds: []
      });
      await defaultCampaign.save();
      console.log('Created default campaign:', defaultCampaign._id);
    }

    // Check if Shennina scenario already exists
    const existingScenario = await Scenario.findOne({
      name: 'Shennina Full AI Assessment',
      project: defaultProject._id,
      campaign: defaultCampaign._id
    });

    if (existingScenario) {
      console.log('Shennina scenario already exists:', existingScenario._id);
      return;
    }

    // Create the Shennina scenario
    const shenninaPredefinedScenario = new Scenario({
      name: 'Shennina Full AI Assessment',
      description: 'Complete AI-powered penetration testing scenario using Shennina framework with multiple attack vectors and automated exploit selection',
      project: defaultProject._id,
      campaign: defaultCampaign._id,
      targets: [
        {
          host: '172.17.0.2',
          port: 22,
          protocol: 'tcp',
          hasAgent: false,
          name: 'Metasploitable Target'
        },
        {
          host: '172.17.0.2',
          port: 80,
          protocol: 'tcp',
          hasAgent: false,
          name: 'Web Application Target'
        }
      ],
      attacks: [
        {
          tool: 'shennina',
          parameters: {
            target: '172.17.0.2',
            lhost: '172.17.0.1',
            attackType: 'full-assessment',
            mode: 'exploitation',
            targetIndex: 0
          },
          status: 'pending'
        },
        {
          tool: 'shennina',
          parameters: {
            target: '172.17.0.2',
            lhost: '172.17.0.1',
            attackType: 'training',
            mode: 'training',
            targetIndex: 1
          },
          status: 'pending'
        },
        {
          tool: 'shennina',
          parameters: {
            target: '172.17.0.2',
            lhost: '172.17.0.1',
            attackType: 'scan-only',
            mode: 'scan-only',
            targetIndex: 0
          },
          status: 'pending'
        }
      ],
      sequence: true, // Execute attacks sequentially
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId(), // You might want to use a real user ID
      executionTime: 0
    });

    const savedScenario = await shenninaPredefinedScenario.save();
    console.log('Created Shennina predefined scenario:', savedScenario._id);

    // Update campaign with the new scenario
    defaultCampaign.scenarioIds.push(savedScenario._id);
    if (!defaultCampaign.executionProgress) {
      defaultCampaign.executionProgress = {
        total: 1,
        completed: 0,
        failed: 0,
        running: 0,
        pending: 1
      };
    } else {
      defaultCampaign.executionProgress.total++;
      defaultCampaign.executionProgress.pending++;
    }
    await defaultCampaign.save();
    console.log('Updated campaign with new scenario');

    console.log('✅ Shennina predefined scenario created successfully!');
    console.log(`Project ID: ${defaultProject._id}`);
    console.log(`Campaign ID: ${defaultCampaign._id}`);
    console.log(`Scenario ID: ${savedScenario._id}`);

  } catch (error) {
    console.error('❌ Error creating Shennina predefined scenario:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script if called directly
if (require.main === module) {
  createShenninaPredefinedScenario();
}

export { createShenninaPredefinedScenario }; 
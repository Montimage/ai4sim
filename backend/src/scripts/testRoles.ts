import mongoose from 'mongoose';
import { User, SYSTEM_ROLES } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Script de test pour vérifier tous les rôles système et leurs permissions
 */
async function testRoles() {
  try {
    console.log('🧪 Testing System Roles and Permissions...\n');

    // 1. Afficher tous les rôles système
    console.log('📋 Available System Roles:');
    Object.entries(SYSTEM_ROLES).forEach(([roleKey, role]) => {
      console.log(`\n🔹 ${role.name} (${roleKey})`);
      console.log(`   Description: ${role.description}`);
      console.log(`   Priority: ${role.priority}`);
      console.log(`   System Role: ${role.isSystem}`);
      console.log(`   Permissions: ${role.permissions.length}`);
      
      role.permissions.forEach((permission, index) => {
        console.log(`     ${index + 1}. ${permission.resource} - ${permission.actions.join(', ')}`);
        if (permission.conditions) {
          const conditions = [];
          if (permission.conditions.own) conditions.push('own');
          if (permission.conditions.shared) conditions.push('shared');
          if (permission.conditions.department) conditions.push('department');
          if (conditions.length > 0) {
            console.log(`        Conditions: ${conditions.join(', ')}`);
          }
        }
      });
    });

    // 2. Créer des utilisateurs de test pour chaque rôle
    console.log('\n👥 Creating test users for each role...');
    
    const testUsers = [
      { username: 'test_super_admin', role: 'super_admin', firstName: 'Super', lastName: 'Admin' },
      { username: 'test_admin', role: 'admin', firstName: 'Admin', lastName: 'User' },
      { username: 'test_project_manager', role: 'project_manager', firstName: 'Project', lastName: 'Manager' },
      { username: 'test_security_analyst', role: 'security_analyst', firstName: 'Security', lastName: 'Analyst' },
      { username: 'test_user', role: 'user', firstName: 'Regular', lastName: 'User' },
      { username: 'test_viewer', role: 'viewer', firstName: 'Viewer', lastName: 'User' }
    ];

    for (const userData of testUsers) {
      try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ username: userData.username });
        if (existingUser) {
          console.log(`✅ User ${userData.username} already exists`);
          continue;
        }

        const user = new User({
          username: userData.username,
          password: 'testpass123',
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true,
          securitySettings: {
            mfaEnabled: false,
            passwordLastChanged: new Date(),
            failedLoginAttempts: 0,
            passwordHistory: []
          },
          sessions: [],
          preferences: {
            theme: 'light',
            language: 'fr',
            timezone: 'Europe/Paris',
            notifications: {
              browser: true,
              security: true
            }
          }
        });

        await user.save();
        console.log(`✅ Created user: ${userData.username} (${userData.role})`);
      } catch (error) {
        console.log(`❌ Failed to create user ${userData.username}:`, error);
      }
    }

    // 3. Tester les permissions pour chaque utilisateur
    console.log('\n🔐 Testing permissions for each user...');
    
    const testPermissions = [
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'create' },
      { resource: 'projects', action: 'read' },
      { resource: 'projects', action: 'create' },
      { resource: 'campaigns', action: 'read' },
      { resource: 'campaigns', action: 'execute' },
      { resource: 'scenarios', action: 'read' },
      { resource: 'scenarios', action: 'execute' },
      { resource: 'executions', action: 'read' },
      { resource: 'system', action: 'admin' }
    ];

    for (const userData of testUsers) {
      const user = await User.findOne({ username: userData.username });
      if (!user) continue;

      console.log(`\n👤 Testing permissions for ${userData.username} (${userData.role}):`);
      
      testPermissions.forEach(permission => {
        const hasPermission = user.hasPermission(permission.resource, permission.action);
        const status = hasPermission ? '✅' : '❌';
        console.log(`   ${status} ${permission.resource}:${permission.action}`);
      });
    }

    // 4. Tester les permissions effectives
    console.log('\n📊 Testing effective permissions...');
    
    for (const userData of testUsers) {
      const user = await User.findOne({ username: userData.username });
      if (!user) continue;

      const effectivePermissions = user.getEffectivePermissions();
      console.log(`\n👤 ${userData.username} (${userData.role}) - Effective Permissions:`);
      console.log(`   Total permissions: ${effectivePermissions.length}`);
      
      // Grouper par ressource
      const permissionsByResource: { [key: string]: string[] } = {};
      effectivePermissions.forEach(permission => {
        if (!permissionsByResource[permission.resource]) {
          permissionsByResource[permission.resource] = [];
        }
        permissionsByResource[permission.resource].push(...permission.actions);
      });

      Object.entries(permissionsByResource).forEach(([resource, actions]) => {
        console.log(`   ${resource}: ${actions.join(', ')}`);
      });
    }

    // 5. Nettoyer les utilisateurs de test
    console.log('\n🧹 Cleaning up test users...');
    for (const userData of testUsers) {
      await User.deleteOne({ username: userData.username });
      console.log(`✅ Deleted test user: ${userData.username}`);
    }

    console.log('\n🎉 All role tests completed successfully!');
    
  } catch (error) {
    logger.error('Error in role testing:', error);
    console.error('❌ Test failed:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  // Connecter à MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmt-pentester';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return testRoles();
    })
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testRoles }; 
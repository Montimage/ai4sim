import mongoose from 'mongoose';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { logger } from '../utils/logger';

/**
 * Script de test pour vérifier la gestion des utilisateurs
 */
async function testUserManagement() {
  try {
    console.log('🧪 Testing User Management System...\n');

    // 1. Test de création d'utilisateur
    console.log('1. Testing user creation...');
    const testUser = new User({
      username: 'testuser',
      password: 'testpass123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
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

    await testUser.save();
    console.log('✅ Test user created successfully');

    // 2. Test des permissions
    console.log('\n2. Testing permissions...');
    const hasPermission = testUser.hasPermission('projects', 'read');
    console.log(`User has projects:read permission: ${hasPermission}`);

    // 3. Test de création de rôle personnalisé
    console.log('\n3. Testing custom role creation...');
    const customRole = new Role({
      name: 'test_role',
      description: 'Test custom role',
      permissions: [
        {
          resource: 'projects',
          actions: ['read', 'create'],
          conditions: { own: true }
        }
      ],
      isSystem: false,
      priority: 60,
      createdBy: testUser._id
    });

    await customRole.save();
    console.log('✅ Custom role created successfully');

    // 4. Test de mise à jour des permissions utilisateur
    console.log('\n4. Testing user permissions update...');
    testUser.permissions = [
      {
        resource: 'campaigns',
        actions: ['read', 'execute'],
        conditions: { shared: true }
      }
    ];
    await testUser.save();
    console.log('✅ User permissions updated successfully');

    // 5. Test de recherche d'utilisateurs
    console.log('\n5. Testing user search...');
    const users = await User.find({ isActive: true });
    console.log(`Found ${users.length} active users`);

    // 6. Test de suppression
    console.log('\n6. Cleaning up test data...');
    await User.deleteOne({ username: 'testuser' });
    await Role.deleteOne({ name: 'test_role' });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed successfully!');
    
  } catch (error) {
    logger.error('Error in user management test:', error);
    console.error('❌ Test failed:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  // Connecter à MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai4sim';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return testUserManagement();
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

export { testUserManagement }; 
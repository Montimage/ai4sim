import mongoose from 'mongoose';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Script pour initialiser un utilisateur super admin par défaut
 */
async function initSuperAdmin() {
  try {
    // Vérifier si un super admin existe déjà
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      logger.info('Super admin already exists, skipping initialization');
      return;
    }

    // Créer le super admin par défaut
    const superAdmin = new User({
      username: 'admin',
      password: 'admin123456', // Sera hashé automatiquement
      firstName: 'Super',
      lastName: 'Administrator',
      role: 'super_admin',
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

    await superAdmin.save();

    logger.info('Super admin created successfully', {
      username: superAdmin.username
    });

    console.log('✅ Super admin initialized successfully');
    console.log('Username: admin');
    console.log('Password: admin123456');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    logger.error('Error initializing super admin:', error);
    console.error('❌ Failed to initialize super admin:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  // Connecter à MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmt-pentester';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return initSuperAdmin();
    })
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { initSuperAdmin }; 
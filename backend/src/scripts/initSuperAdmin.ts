import mongoose from 'mongoose';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Script d'initialisation pour créer le premier super administrateur
 * Usage: npm run init-super-admin
 */

const SUPER_ADMIN_DATA = {
  username: 'superadmin',
  password: 'SuperAdmin123!', // À changer lors de la première connexion
  firstName: 'Super',
  lastName: 'Administrator',
  role: 'super_admin'
};

async function initSuperAdmin() {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard-fusion';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Vérifier si un super admin existe déjà
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      logger.info('Super administrator already exists:', {
        username: existingSuperAdmin.username
      });
      return;
    }

    // Vérifier si l'username existe déjà
    const existingUser = await User.findOne({ username: SUPER_ADMIN_DATA.username });

    if (existingUser) {
      logger.error('Username already exists for another user');
      return;
    }

    // Créer le super administrateur
    const superAdmin = new User({
      username: SUPER_ADMIN_DATA.username,
      password: SUPER_ADMIN_DATA.password,
      firstName: SUPER_ADMIN_DATA.firstName,
      lastName: SUPER_ADMIN_DATA.lastName,
      role: SUPER_ADMIN_DATA.role,
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

    logger.info('Super administrator created successfully:', {
      id: superAdmin._id,
      username: superAdmin.username,
      role: superAdmin.role
    });

    console.log('\n=== SUPER ADMINISTRATOR CREATED ===');
    console.log(`Username: ${SUPER_ADMIN_DATA.username}`);
    console.log(`Password: ${SUPER_ADMIN_DATA.password}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('=====================================\n');

  } catch (error) {
    logger.error('Error creating super administrator:', error);
    console.error('Failed to create super administrator:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Fonction pour créer un super admin avec des données personnalisées
export async function createSuperAdmin(adminData: {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  try {
    // Vérifier si un super admin existe déjà
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      throw new Error('Super administrator already exists');
    }

    // Vérifier si l'username existe déjà
    const existingUser = await User.findOne({ username: adminData.username });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Validation du mot de passe
    if (adminData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Créer le super administrateur
    const superAdmin = new User({
      username: adminData.username,
      password: adminData.password,
      firstName: adminData.firstName || 'Super',
      lastName: adminData.lastName || 'Administrator',
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

    logger.info('Super administrator created programmatically:', {
      id: superAdmin._id,
      username: superAdmin.username
    });

    return superAdmin;
  } catch (error) {
    logger.error('Error creating super administrator programmatically:', error);
    throw error;
  }
}

// Fonction pour réinitialiser tous les utilisateurs (DANGER - pour développement uniquement)
export async function resetAllUsers() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset users in production environment');
  }

  try {
    await User.deleteMany({});
    logger.info('All users deleted');
    
    await initSuperAdmin();
    logger.info('Super administrator recreated');
  } catch (error) {
    logger.error('Error resetting users:', error);
    throw error;
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  initSuperAdmin()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export default initSuperAdmin; 
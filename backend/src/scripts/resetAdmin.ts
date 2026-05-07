import mongoose from 'mongoose';
import { User } from '../models/User';

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard-fusion');
    console.log('Connected to MongoDB');

    const password = process.env.ADMIN_RESET_PASSWORD || 'admin123';
    if (!process.env.ADMIN_RESET_PASSWORD) {
      console.warn('Warning: using default password. Set ADMIN_RESET_PASSWORD env var to override.');
    }

    // Supprimer l'ancien admin s'il existe
    await User.deleteOne({ username: 'admin' });
    console.log('Old admin deleted if existed');

    // Créer un nouvel admin - le password sera automatiquement hashé par le pre-hook
    const admin = new User({
      username: 'admin',
      password: password, // En clair, sera hashé automatiquement
      role: 'admin',
      isActive: true,
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

    await admin.save(); // Le pre-hook 'save' va hasher le password automatiquement
    console.log('Admin user created/reset successfully');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Failed to reset admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

resetAdmin(); 
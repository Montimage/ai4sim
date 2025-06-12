import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';
import { User } from '../models/User';

const createAdmin = async () => {
  try {
    await mongoose.connect(config.mongodb.uri);
    
    const password = 'admin123'; // Change this in production
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  }
};

createAdmin();

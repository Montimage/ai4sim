import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config/config';

export class AuthService {
  static async login(username: string, password: string) {
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role }, // Make sure the role is included
      config.security.jwtSecret,
      { expiresIn: '24h' }
    );

    // Make sure the role is included in the sanitized object
    const sanitizedUser = {
      _id: user._id,
      username: user.username,
      role: user.role
    };

    return { token, user: sanitizedUser };
  }
}

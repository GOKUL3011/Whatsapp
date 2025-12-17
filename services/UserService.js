const User = require('../models/User');

class UserService {
  async register(username, email, password) {
    try {
      // Check if username already exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        throw new Error('Email already registered');
      }

      const user = new User({ username, email, password });
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  async login(username, password) {
    try {
      // Find user by username
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error('Invalid username or password');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      return await User.findById(userId);
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      return await User.findOne({ username });
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers() {
    try {
      return await User.find().select('-password').sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async updateUserStatus(userId, status) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { status, lastSeen: Date.now() },
        { new: true }
      ).select('-password');
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      return await User.findByIdAndDelete(userId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();

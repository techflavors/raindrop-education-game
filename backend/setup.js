#!/usr/bin/env node

const User = require('./src/models/User');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';

async function testSetup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check environment variables
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);

    // Create admin user
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
    } else {
      const admin = new User({
        username: 'admin',
        password: 'password123',
        role: 'admin',
        profile: {
          firstName: 'System',
          lastName: 'Administrator'
        }
      });

      await admin.save();
      console.log('✅ Admin user created successfully');
    }

    // Create a test student
    const existingStudent = await User.findOne({ username: 'student1' });
    if (existingStudent) {
      console.log('ℹ️ Test student already exists');
    } else {
      const student = new User({
        username: 'student1',
        password: 'password123',
        role: 'student',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          grade: '3rd'
        }
      });

      await student.save();
      console.log('✅ Test student created successfully');
    }

    console.log('\n🎯 Setup completed! You can now test:');
    console.log('- Login with admin/password123 (admin role)');
    console.log('- Login with student1/password123 (student role)');

  } catch (error) {
    console.error('❌ Setup error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

testSetup();

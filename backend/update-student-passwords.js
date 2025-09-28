#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/raindrop-battle', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const updateStudentPasswords = async () => {
  try {
    await connectDB();
    
    // Find all student users
    const students = await User.find({ role: 'student' });
    console.log(`Found ${students.length} students`);
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Update all student passwords
    const result = await User.updateMany(
      { role: 'student' },
      { password: hashedPassword }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} student passwords to 'password123'`);
    
    // List all students with their details
    const updatedStudents = await User.find({ role: 'student' }, 'username profile.firstName profile.lastName profile.grade');
    console.log('\n📚 All Students:');
    updatedStudents.forEach(student => {
      console.log(`- Username: ${student.username} | Name: ${student.profile.firstName} ${student.profile.lastName} | Grade: ${student.profile.grade}`);
    });
    
    // Find Grade 5 students specifically
    const grade5Students = await User.find({ 
      role: 'student', 
      'profile.grade': '5' 
    }, 'username profile.firstName profile.lastName profile.grade');
    
    console.log('\n🎓 Grade 5 Students:');
    grade5Students.forEach(student => {
      console.log(`- Username: ${student.username} | Name: ${student.profile.firstName} ${student.profile.lastName}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
};

updateStudentPasswords();

// Database script to assign grades and subjects to teachers
// Run this script to enable test creation for existing teachers

const mongoose = require('mongoose');
const User = require('./src/models/User');

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';

async function assignGradesToTeachers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all teacher users
    const teachers = await User.find({ role: 'teacher' });
    console.log(`📚 Found ${teachers.length} teachers`);

    // Update each teacher with default assignments
    for (const teacher of teachers) {
      // Check if teacher already has assignments
      if (!teacher.profile.assignedGrades || teacher.profile.assignedGrades.length === 0) {
        teacher.profile.assignedGrades = ['3', '4', '5']; // Default grades
        console.log(`📝 Assigned grades 3, 4, 5 to teacher: ${teacher.username}`);
      }

      if (!teacher.profile.subjects || teacher.profile.subjects.length === 0) {
        teacher.profile.subjects = ['Math', 'Science']; // Default subjects
        console.log(`📖 Assigned Math, Science to teacher: ${teacher.username}`);
      }

      await teacher.save();
      console.log(`✅ Updated teacher: ${teacher.username}`);
    }

    console.log('🎉 All teachers have been assigned grades and subjects!');
    console.log('📋 Default assignments:');
    console.log('   - Grades: 3, 4, 5');
    console.log('   - Subjects: Math, Science');
    console.log('');
    console.log('💡 Teachers can now create tests!');
    console.log('🔧 Admins can modify these assignments via the Admin Dashboard');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📪 Database connection closed');
  }
}

// Run the script
assignGradesToTeachers();

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Question = require('../src/models/Question');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';

async function setupProductionDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('=== PRODUCTION DATABASE SETUP ===\n');

    // Check existing data
    const userCount = await User.countDocuments();
    const questionCount = await Question.countDocuments();

    console.log('📊 Current Database State:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Questions: ${questionCount}\n`);

    // Create admin user if doesn't exist
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('👤 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@raindrop.edu',
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        }
      });
      console.log('✅ Admin created (username: admin, password: admin123)');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create teacher user if doesn't exist
    const teacherExists = await User.findOne({ role: 'teacher' });
    
    if (!teacherExists) {
      console.log('👨‍🏫 Creating teacher user...');
      const hashedPassword = await bcrypt.hash('teacher123', 10);
      await User.create({
        username: 'teacher1',
        password: hashedPassword,
        email: 'teacher@raindrop.edu',
        role: 'teacher',
        profile: {
          firstName: 'John',
          lastName: 'Teacher',
          assignedGrades: ['5', '6', '7'],
          subjects: ['Math', 'Science', 'English']
        }
      });
      console.log('✅ Teacher created (username: teacher1, password: teacher123)');
    } else {
      console.log('ℹ️  Teacher user already exists');
    }

    // Create sample students if none exist
    const studentCount = await User.countDocuments({ role: 'student' });
    
    if (studentCount === 0) {
      console.log('\n👥 Creating sample students...');
      const students = [
        { username: 'emma_johnson', firstName: 'Emma', lastName: 'Johnson', grade: '5' },
        { username: 'liam_smith', firstName: 'Liam', lastName: 'Smith', grade: '5' },
        { username: 'olivia_brown', firstName: 'Olivia', lastName: 'Brown', grade: '6' }
      ];

      for (const student of students) {
        const hashedPassword = await bcrypt.hash('student123', 10);
        await User.create({
          username: student.username,
          password: hashedPassword,
          email: `${student.username}@students.raindrop.edu`,
          role: 'student',
          profile: {
            firstName: student.firstName,
            lastName: student.lastName,
            grade: student.grade,
            school: 'Raindrop Elementary'
          }
        });
        console.log(`   ✓ Created ${student.firstName} ${student.lastName}`);
      }
      console.log('✅ Sample students created (password: student123)');
    } else {
      console.log(`ℹ️  ${studentCount} student(s) already exist`);
    }

    // Check questions
    console.log('\n📚 Question Bank Status:');
    if (questionCount === 0) {
      console.log('   ⚠️  WARNING: No questions in database!');
      console.log('   → You need to import questions from your local database');
      console.log('   → Or use the question generator to create new ones');
      console.log('\n   To import from local MongoDB:');
      console.log('   1. Export: mongodump --db raindrop-battle --out ./backup');
      console.log('   2. Import: mongorestore --uri "YOUR_ATLAS_URI" ./backup/raindrop-battle');
    } else {
      console.log(`   ✅ ${questionCount} questions available`);
      
      // Show question breakdown by subject
      const subjects = await Question.distinct('subject');
      console.log('\n   Question breakdown:');
      for (const subject of subjects) {
        const count = await Question.countDocuments({ subject });
        console.log(`   - ${subject}: ${count}`);
      }
    }

    // Final summary
    const finalUserCount = await User.countDocuments();
    console.log('\n=== SETUP COMPLETE ===');
    console.log(`✅ Total users: ${finalUserCount}`);
    console.log(`✅ Total questions: ${questionCount}`);
    console.log('\n📝 Default Login Credentials:');
    console.log('   Admin:    admin / admin123');
    console.log('   Teacher:  teacher1 / teacher123');
    console.log('   Students: emma_johnson / student123');
    console.log('             liam_smith / student123');
    console.log('             olivia_brown / student123');
    console.log('\n⚠️  IMPORTANT: Change these passwords in production!\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupProductionDatabase();
}

module.exports = setupProductionDatabase;

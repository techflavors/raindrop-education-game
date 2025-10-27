const mongoose = require('mongoose');
const TestAttempt = require('./src/models/TestAttempt');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';

async function checkLeaderboard() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all Grade 5 students
    const students = await User.find({
      role: 'student',
      'profile.grade': 'Grade 5'
    }).select('profile.firstName profile.lastName username');

    console.log(`\n📊 Grade 5 Leaderboard:\n`);

    const leaderboard = [];
    
    for (const student of students) {
      const attempts = await TestAttempt.find({ studentId: student._id });
      const totalRaindrops = attempts.reduce((sum, attempt) => sum + (attempt.raindropsEarned || 0), 0);
      const averageScore = attempts.length > 0 
        ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
        : 0;

      leaderboard.push({
        name: `${student.profile.firstName} ${student.profile.lastName}`,
        username: student.username,
        totalRaindrops,
        averageScore,
        testsCompleted: attempts.length
      });
    }

    // Sort by raindrops
    leaderboard.sort((a, b) => b.totalRaindrops - a.totalRaindrops);

    // Display
    leaderboard.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name} (@${student.username})`);
      console.log(`   💧 Raindrops: ${student.totalRaindrops}`);
      console.log(`   📊 Avg Score: ${student.averageScore}%`);
      console.log(`   ✅ Tests: ${student.testsCompleted}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkLeaderboard();

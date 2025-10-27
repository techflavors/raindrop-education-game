const mongoose = require('mongoose');
const TestAttempt = require('./src/models/TestAttempt');
const User = require('./src/models/User');
const Test = require('./src/models/Test');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';

async function resetTestAttempt() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find Emma
    const emma = await User.findOne({ username: 'emma_johnson' });
    if (!emma) {
      console.log('❌ Emma not found');
      return;
    }

    console.log(`\n📝 Found Emma: ${emma.profile.firstName} ${emma.profile.lastName}`);

    // Find Emma's test attempts
    const attempts = await TestAttempt.find({ studentId: emma._id })
      .populate('testId', 'title');

    console.log(`\n🔍 Found ${attempts.length} test attempt(s) for Emma:`);
    attempts.forEach((attempt, index) => {
      console.log(`\n${index + 1}. Test: ${attempt.testId.title}`);
      console.log(`   Score: ${attempt.score}%`);
      console.log(`   Raindrops: ${attempt.raindropsEarned}`);
      console.log(`   Completed: ${attempt.completedAt}`);
      console.log(`   Attempt ID: ${attempt._id}`);
    });

    if (attempts.length === 0) {
      console.log('\n✅ No test attempts found to delete. Emma can take the test fresh!');
      return;
    }

    // Delete all test attempts for Emma
    const result = await TestAttempt.deleteMany({ studentId: emma._id });
    console.log(`\n✅ Deleted ${result.deletedCount} test attempt(s) for Emma`);
    console.log('Emma can now retake all tests!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

resetTestAttempt();

const mongoose = require('mongoose');
const TestAttempt = require('./src/models/TestAttempt');
const User = require('./src/models/User');
const Test = require('./src/models/Test');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';

async function resetSpecificTest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const testId = '68d832702a57794ad905c395'; // From the error log

    // Find Emma
    const emma = await User.findOne({ username: 'emma_johnson' });
    if (!emma) {
      console.log('❌ Emma not found');
      return;
    }

    // Get test details
    const test = await Test.findById(testId);
    if (!test) {
      console.log('❌ Test not found');
      return;
    }

    console.log(`\n📝 Test: ${test.title}`);
    console.log(`👤 Student: ${emma.profile.firstName} ${emma.profile.lastName}`);

    // Find existing attempt
    const attempt = await TestAttempt.findOne({
      studentId: emma._id,
      testId: testId
    });

    if (attempt) {
      console.log(`\n🔍 Found existing attempt:`);
      console.log(`   ID: ${attempt._id}`);
      console.log(`   Score: ${attempt.score}%`);
      console.log(`   Raindrops: ${attempt.raindropsEarned || 'N/A'}`);
      console.log(`   Completed: ${attempt.completedAt || 'N/A'}`);

      // Delete it
      await TestAttempt.deleteOne({ _id: attempt._id });
      console.log(`\n✅ Deleted test attempt!`);
      console.log(`Emma can now submit the test again.`);
    } else {
      console.log(`\n✅ No existing attempt found. Emma should be able to submit.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

resetSpecificTest();

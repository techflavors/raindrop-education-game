const mongoose = require('mongoose');

async function getEmmaTestDetails() {
  try {
    await mongoose.connect('mongodb://localhost:27017/raindrop-battle');
    
    // Find emma_johnson
    const User = mongoose.connection.db.collection('users');
    const emma = await User.findOne({ username: 'emma_johnson' });
    
    if (!emma) {
      console.log('❌ Emma Johnson not found');
      return;
    }
    
    console.log('✅ Found Emma Johnson');
    console.log(`   ID: ${emma._id}`);
    console.log(`   Name: ${emma.profile.firstName} ${emma.profile.lastName}\n`);
    
    // Find tests assigned to Emma
    const Tests = mongoose.connection.db.collection('tests');
    const assignedTests = await Tests.find({
      assignedStudents: emma._id
    }).toArray();
    
    console.log(`📚 Tests assigned to Emma: ${assignedTests.length}\n`);
    
    for (const test of assignedTests) {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📋 TEST: ${test.title}`);
      console.log(`   Subject: ${test.subject} | Grade: ${test.grade}`);
      console.log(`   Total Questions: ${test.questions.length}`);
      console.log('═══════════════════════════════════════════════════════\n');
      
      // Get full question details
      const Questions = mongoose.connection.db.collection('questions');
      
      for (let i = 0; i < test.questions.length; i++) {
        const questionId = test.questions[i].questionId;
        const question = await Questions.findOne({ _id: questionId });
        
        if (question) {
          console.log(`\n📝 QUESTION ${i + 1}:`);
          console.log(`   ${question.questionText}`);
          console.log(`   Type: ${question.questionType}`);
          console.log(`   Difficulty: ${question.difficulty}`);
          console.log(`   Subject: ${question.subject}`);
          
          if (question.options && question.options.length > 0) {
            console.log('\n   OPTIONS:');
            question.options.forEach((opt, idx) => {
              console.log(`   ${String.fromCharCode(65 + idx)}. ${opt}`);
            });
          }
          
          console.log(`\n   ✅ CORRECT ANSWER: ${question.correctAnswer}`);
          console.log(`   Points: ${question.points || 10}`);
          console.log('   ─────────────────────────────────────────────────');
        }
      }
      console.log('\n');
    }
    
    // Check if Emma has attempted any tests
    const TestAttempts = mongoose.connection.db.collection('testattempts');
    const attempts = await TestAttempts.find({ studentId: emma._id }).toArray();
    
    console.log(`\n📊 Emma's Test Attempts: ${attempts.length}`);
    if (attempts.length > 0) {
      for (const attempt of attempts) {
        console.log(`   Score: ${attempt.score}% | Raindrops: ${attempt.raindropsEarned}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

getEmmaTestDetails();

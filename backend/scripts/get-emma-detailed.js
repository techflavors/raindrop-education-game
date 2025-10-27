const mongoose = require('mongoose');

async function getEmmaTestWithOptions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/raindrop-battle');
    
    const User = mongoose.connection.db.collection('users');
    const emma = await User.findOne({ username: 'emma_johnson' });
    
    const Tests = mongoose.connection.db.collection('tests');
    const test = await Tests.findOne({ assignedStudents: emma._id });
    
    const Questions = mongoose.connection.db.collection('questions');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 EMMA\'S TEST: Sample Test');
    console.log('═══════════════════════════════════════════════════════\n');
    
    for (let i = 0; i < test.questions.length; i++) {
      const questionId = test.questions[i].questionId;
      const question = await Questions.findOne({ _id: questionId });
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 QUESTION ${i + 1} of ${test.questions.length}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n❓ ${question.questionText}`);
      console.log(`\n   📊 Difficulty: ${question.difficulty.toUpperCase()}`);
      console.log(`   💎 Points: ${question.points || 10}`);
      
      // Check if question has options array or answers array
      if (question.options && question.options.length > 0) {
        console.log('\n   🔵 ANSWER CHOICES:');
        question.options.forEach((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isCorrect = opt === question.correctAnswer ? ' ✅ CORRECT' : '';
          console.log(`      ${letter}) ${opt}${isCorrect}`);
        });
      } else if (question.answers && question.answers.length > 0) {
        console.log('\n   🔵 ANSWER CHOICES:');
        question.answers.forEach((ans, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isCorrect = ans.isCorrect ? ' ✅ CORRECT' : '';
          console.log(`      ${letter}) ${ans.text}${isCorrect}`);
        });
      }
      
      console.log('');
    }
    
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('✅ SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Questions: ${test.questions.length}`);
    console.log(`Subject: ${test.subject}`);
    console.log(`Grade: ${test.grade}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

getEmmaTestWithOptions();

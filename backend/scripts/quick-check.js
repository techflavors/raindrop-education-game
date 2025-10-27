const mongoose = require('mongoose');

async function quickCheck() {
  try {
    await mongoose.connect('mongodb://localhost:27017/raindrop-battle');
    
    const questionCount = await mongoose.connection.db.collection('questions').countDocuments();
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    
    console.log('✅ Database Status:');
    console.log(`   Questions: ${questionCount}`);
    console.log(`   Users: ${userCount}\n`);
    
    // Show question breakdown
    const subjects = await mongoose.connection.db.collection('questions').aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('📚 Questions by Subject:');
    subjects.forEach(s => console.log(`   ${s._id}: ${s.count}`));
    
    const grades = await mongoose.connection.db.collection('questions').aggregate([
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\n🎓 Questions by Grade:');
    grades.forEach(g => console.log(`   Grade ${g._id}: ${g.count}`));
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickCheck();

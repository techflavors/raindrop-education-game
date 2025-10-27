/**
 * Remove duplicate questions from Atlas
 * Keeps only the most recent version of each question
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function removeDuplicates() {
  console.log('\n🧹 Cleaning up duplicate questions in Atlas...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    const db = mongoose.connection.db;
    const questions = db.collection('questions');
    
    // Get all questions
    console.log('📊 Analyzing questions...');
    const allQuestions = await questions.find({}).toArray();
    console.log(`   Total questions: ${allQuestions.length}`);
    
    // Group by questionText to find duplicates
    const questionMap = new Map();
    const duplicateIds = [];
    
    allQuestions.forEach(q => {
      const text = q.questionText;
      if (questionMap.has(text)) {
        // Keep the newer one, mark older for deletion
        const existing = questionMap.get(text);
        if (new Date(q.createdAt) > new Date(existing.createdAt)) {
          duplicateIds.push(existing._id);
          questionMap.set(text, q);
        } else {
          duplicateIds.push(q._id);
        }
      } else {
        questionMap.set(text, q);
      }
    });
    
    console.log(`   Unique questions: ${questionMap.size}`);
    console.log(`   Duplicates to remove: ${duplicateIds.length}\n`);
    
    if (duplicateIds.length > 0) {
      console.log('🗑️  Removing duplicates...');
      const result = await questions.deleteMany({ 
        _id: { $in: duplicateIds }
      });
      console.log(`   ✅ Removed ${result.deletedCount} duplicate questions\n`);
    }
    
    // Verify
    const finalCount = await questions.countDocuments();
    console.log('✅ Cleanup complete!');
    console.log(`   Final question count: ${finalCount}\n`);
    
    // Show breakdown
    const subjects = await questions.distinct('subject');
    console.log('📊 Questions by subject:');
    for (const subject of subjects) {
      const count = await questions.countDocuments({ subject });
      console.log(`   ${subject}: ${count}`);
    }
    
    console.log('\n🎉 Database is clean!\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

removeDuplicates();

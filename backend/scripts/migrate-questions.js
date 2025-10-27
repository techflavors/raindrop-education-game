const mongoose = require('mongoose');

async function migrateQuestions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/');
    console.log('✅ Connected to MongoDB\n');
    
    // Connect to source database (raindrop-game)
    const sourceDB = mongoose.connection.useDb('raindrop-game');
    const targetDB = mongoose.connection.useDb('raindrop-battle');
    
    console.log('📊 Checking source database: raindrop-game');
    const sourceCount = await sourceDB.db.collection('questions').countDocuments();
    console.log(`   Found ${sourceCount} questions\n`);
    
    console.log('📊 Checking target database: raindrop-battle');
    const targetCountBefore = await targetDB.db.collection('questions').countDocuments();
    console.log(`   Currently has ${targetCountBefore} questions\n`);
    
    // Get all questions from raindrop-game
    const questions = await sourceDB.db.collection('questions').find({}).toArray();
    
    console.log('🔍 Analyzing questions from raindrop-game:');
    const subjects = [...new Set(questions.map(q => q.subject))];
    const grades = [...new Set(questions.map(q => q.grade))];
    const difficulties = [...new Set(questions.map(q => q.difficulty))];
    
    console.log(`   Subjects: ${subjects.join(', ')}`);
    console.log(`   Grades: ${grades.join(', ')}`);
    console.log(`   Difficulties: ${difficulties.join(', ')}\n`);
    
    // Ask for confirmation (in real scenario)
    console.log('🚀 Starting migration...');
    
    // Get existing teacher ID from raindrop-battle (use teacher1)
    const teacher = await targetDB.db.collection('users').findOne({ role: 'teacher' });
    const teacherId = teacher ? teacher._id : null;
    
    if (!teacherId) {
      console.log('⚠️  No teacher found in raindrop-battle. Questions will be migrated without teacherId.');
    } else {
      console.log(`   Using teacherId: ${teacherId} (${teacher.username})`);
    }
    
    // Transform questions to match raindrop-battle schema
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const question of questions) {
      // Check if question already exists (by questionText)
      const exists = await targetDB.db.collection('questions').findOne({
        questionText: question.questionText
      });
      
      if (exists) {
        skippedCount++;
        continue;
      }
      
      // Transform question to match new schema
      const newQuestion = {
        teacherId: teacherId || question.teacherId,
        grade: question.grade,
        subject: question.subject,
        questionText: question.questionText,
        questionType: question.options ? 'multiple-choice' : 'fill-in-blank',
        difficulty: question.difficulty || 'medium',
        options: question.options ? [
          question.options.a,
          question.options.b,
          question.options.c,
          question.options.d
        ].filter(Boolean) : [],
        correctAnswer: question.correctAnswer || question.answer,
        timeLimit: question.timeLimit || 30,
        points: question.points || 10,
        createdAt: question.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      // Insert into raindrop-battle
      await targetDB.db.collection('questions').insertOne(newQuestion);
      migratedCount++;
      
      if (migratedCount % 100 === 0) {
        console.log(`   Migrated ${migratedCount}/${sourceCount} questions...`);
      }
    }
    
    console.log('\n✅ Migration complete!');
    console.log(`   ✓ Migrated: ${migratedCount} questions`);
    console.log(`   ⊘ Skipped (duplicates): ${skippedCount} questions`);
    
    const targetCountAfter = await targetDB.db.collection('questions').countDocuments();
    console.log(`   📊 Total questions in raindrop-battle: ${targetCountAfter}\n`);
    
    // Show breakdown by subject and grade
    console.log('📈 Final Question Distribution:');
    for (const subject of subjects) {
      const count = await targetDB.db.collection('questions').countDocuments({ subject });
      console.log(`   ${subject}: ${count} questions`);
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

migrateQuestions();

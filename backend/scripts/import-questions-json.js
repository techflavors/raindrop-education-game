/**
 * Import Questions from JSON to Atlas
 * 
 * This script imports questions from a JSON backup file to MongoDB Atlas
 * 
 * Usage:
 *   export MONGODB_URI="mongodb+srv://..."
 *   node scripts/import-questions-json.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Question = require('../src/models/Question');

const MONGODB_URI = process.env.MONGODB_URI || process.env.ATLAS_MONGODB_URI;
const INPUT_FILE = path.join(__dirname, '../data/questions-backup.json');

if (!MONGODB_URI || MONGODB_URI.includes('localhost')) {
  console.error('\n❌ Error: MONGODB_URI must be set to Atlas connection string!');
  console.error('\nUsage:');
  console.error('  export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/raindrop-battle"');
  console.error('  node scripts/import-questions-json.js\n');
  process.exit(1);
}

async function importQuestions() {
  console.log('\n📥 Importing questions from JSON to Atlas...\n');
  
  try {
    // Check if file exists
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`❌ File not found: ${INPUT_FILE}`);
      console.error('\nRun this first to create the backup:');
      console.error('  node scripts/export-questions-json.js\n');
      process.exit(1);
    }
    
    // Read JSON file
    console.log(`📖 Reading file: ${INPUT_FILE}`);
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const questions = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${questions.length} questions from file\n`);
    
    if (questions.length === 0) {
      console.log('⚠️  No questions in file!');
      process.exit(0);
    }
    
    // Connect to Atlas
    console.log('🌐 Connecting to MongoDB Atlas...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}\n`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Check existing questions
    const existingCount = await Question.countDocuments();
    console.log(`📊 Current questions in Atlas: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('\n⚠️  WARNING: Atlas already has questions!');
      console.log('   This will ADD new questions (not replace).\n');
    }
    
    // Remove _id to let MongoDB generate new ones
    const questionsToInsert = questions.map(q => {
      const { _id, __v, ...questionWithoutId } = q;
      return questionWithoutId;
    });
    
    // Import in batches
    console.log('📤 Importing questions to Atlas...');
    console.log('   This may take a minute...\n');
    
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < questionsToInsert.length; i += batchSize) {
      const batch = questionsToInsert.slice(i, i + batchSize);
      await Question.insertMany(batch);
      imported += batch.length;
      console.log(`   Progress: ${imported}/${questionsToInsert.length} questions imported...`);
    }
    
    console.log(`\n✅ Successfully imported ${imported} questions\n`);
    
    // Verify
    const finalCount = await Question.countDocuments();
    console.log('═══════════════════════════════════════');
    console.log('Import Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Questions in file:    ${questions.length}`);
    console.log(`Questions imported:   ${imported}`);
    console.log(`Total in Atlas now:   ${finalCount}`);
    console.log('═══════════════════════════════════════\n');
    
    // Show breakdown
    const subjects = await Question.distinct('subject');
    console.log('📊 Questions by subject in Atlas:');
    for (const subject of subjects) {
      const count = await Question.countDocuments({ subject });
      console.log(`   ${subject}: ${count}`);
    }
    
    console.log('\n🎉 Import complete!\n');
    
    await mongoose.disconnect();
    console.log('✅ Done!\n');
    
  } catch (error) {
    console.error('\n❌ Import Error:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Tip: Check Atlas credentials:');
      console.error('   - Username and password correct?');
      console.error('   - Encode special characters in password');
      console.error('   - Database user has read/write permissions?\n');
    }
    
    await mongoose.disconnect();
    process.exit(1);
  }
}

importQuestions();

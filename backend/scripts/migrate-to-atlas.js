/**
 * Migrate Questions from Local MongoDB to Atlas
 * 
 * This script exports all questions from your local MongoDB
 * and imports them to MongoDB Atlas (production database)
 * 
 * Usage:
 *   node scripts/migrate-to-atlas.js
 */

const mongoose = require('mongoose');
const Question = require('../src/models/Question');

// Source: Local MongoDB
const LOCAL_MONGODB_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';

// Target: MongoDB Atlas (production)
const ATLAS_MONGODB_URI = process.env.MONGODB_URI || process.env.ATLAS_MONGODB_URI;

if (!ATLAS_MONGODB_URI || ATLAS_MONGODB_URI.includes('localhost')) {
  console.error('\n❌ Error: MONGODB_URI or ATLAS_MONGODB_URI environment variable not set!');
  console.error('\nUsage:');
  console.error('  export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/raindrop-battle"');
  console.error('  node scripts/migrate-to-atlas.js\n');
  process.exit(1);
}

async function migrateQuestions() {
  console.log('\n🔄 Starting Question Migration to Atlas...\n');
  
  let localConnection;
  let atlasConnection;
  
  try {
    // Step 1: Connect to local MongoDB
    console.log('📦 Step 1: Connecting to local MongoDB...');
    console.log(`   Source: ${LOCAL_MONGODB_URI}`);
    
    localConnection = await mongoose.createConnection(LOCAL_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('   ✅ Connected to local MongoDB\n');
    
    // Step 2: Export questions from local
    console.log('📤 Step 2: Exporting questions from local database...');
    
    const LocalQuestion = localConnection.model('Question', Question.schema);
    const questions = await LocalQuestion.find({}).lean();
    
    console.log(`   ✅ Found ${questions.length} questions\n`);
    
    if (questions.length === 0) {
      console.log('⚠️  No questions found in local database!');
      console.log('   Make sure your local MongoDB is running and has data.\n');
      await localConnection.close();
      process.exit(0);
    }
    
    // Show sample question
    if (questions.length > 0) {
      console.log('📋 Sample question:');
      console.log(`   Subject: ${questions[0].subject}`);
      console.log(`   Difficulty: ${questions[0].difficulty}`);
      if (questions[0].question) {
        console.log(`   Question: ${questions[0].question.substring(0, 50)}...`);
      }
      console.log('');
    }
    
    // Step 3: Connect to Atlas
    console.log('🌐 Step 3: Connecting to MongoDB Atlas...');
    console.log(`   Target: ${ATLAS_MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
    
    atlasConnection = await mongoose.createConnection(ATLAS_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('   ✅ Connected to MongoDB Atlas\n');
    
    // Step 4: Check existing questions in Atlas
    console.log('🔍 Step 4: Checking existing questions in Atlas...');
    
    const AtlasQuestion = atlasConnection.model('Question', Question.schema);
    const existingCount = await AtlasQuestion.countDocuments();
    
    console.log(`   Found ${existingCount} existing questions in Atlas\n`);
    
    // Step 5: Ask for confirmation (in script, we'll just show warning)
    if (existingCount > 0) {
      console.log('⚠️  WARNING: Atlas already has questions!');
      console.log('   This script will ADD new questions (not replace).');
      console.log('   If you want to replace all questions, delete them first.\n');
    }
    
    // Step 6: Import questions to Atlas
    console.log('📥 Step 5: Importing questions to Atlas...');
    console.log('   This may take a minute...\n');
    
    // Remove _id and transform data to match Atlas schema
    const questionsToInsert = questions.map(q => {
      const { _id, __v, ...questionData} = q;
      
      // Transform grade to match enum (handle "1st", "2nd", "3rd", "5th", etc.)
      if (questionData.grade) {
        let grade = questionData.grade.toString().toLowerCase();
        // Extract just the number from formats like "3rd", "5th", etc.
        grade = grade.replace(/st|nd|rd|th/g, '');
        // Remove any non-alphanumeric characters except K
        grade = grade.replace(/[^0-9Kk]/g, '');
        // Keep K uppercase, numbers as strings
        questionData.grade = grade.toUpperCase();
      }
      
      // Transform questionType to match enum (fill-in-blank → fill-blank)
      if (questionData.questionType === 'fill-in-blank') {
        questionData.questionType = 'fill-blank';
      }
      
      return questionData;
    });
    
    // Insert in batches of 100
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < questionsToInsert.length; i += batchSize) {
      const batch = questionsToInsert.slice(i, i + batchSize);
      await AtlasQuestion.insertMany(batch);
      imported += batch.length;
      console.log(`   Progress: ${imported}/${questionsToInsert.length} questions imported...`);
    }
    
    console.log(`   ✅ Successfully imported ${imported} questions\n`);
    
    // Step 7: Verify migration
    console.log('✅ Step 6: Verifying migration...');
    
    const finalCount = await AtlasQuestion.countDocuments();
    console.log(`   Total questions in Atlas: ${finalCount}`);
    
    // Verify by subject
    const subjects = await AtlasQuestion.distinct('subject');
    console.log(`   Subjects: ${subjects.join(', ')}\n`);
    
    // Show count by subject
    console.log('📊 Questions by subject:');
    for (const subject of subjects) {
      const count = await AtlasQuestion.countDocuments({ subject });
      console.log(`   - ${subject}: ${count}`);
    }
    
    console.log('\n🎉 Migration Complete!\n');
    console.log('═══════════════════════════════════════');
    console.log('Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Exported from local:  ${questions.length} questions`);
    console.log(`✅ Imported to Atlas:    ${imported} questions`);
    console.log(`✅ Total in Atlas now:   ${finalCount} questions`);
    console.log('═══════════════════════════════════════\n');
    
    console.log('🚀 Next Steps:');
    console.log('   1. Test your Atlas connection');
    console.log('   2. Deploy to Render');
    console.log('   3. Verify questions load in production\n');
    
    // Close connections
    await localConnection.close();
    await atlasConnection.close();
    
    console.log('✅ Done!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure your local MongoDB is running:');
      console.error('   brew services start mongodb-community@8.0');
      console.error('   # or');
      console.error('   mongod --dbpath ~/mongodb/data/db\n');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Tip: Check your Atlas credentials:');
      console.error('   - Username and password correct?');
      console.error('   - Password has special characters? Encode them!');
      console.error('   - Database user has read/write permissions?\n');
    }
    
    if (error.message.includes('Network')) {
      console.error('\n💡 Tip: Check your network settings:');
      console.error('   - Atlas Network Access allows 0.0.0.0/0?');
      console.error('   - Firewall blocking connections?');
      console.error('   - Internet connection working?\n');
    }
    
    // Close connections if open
    if (localConnection) await localConnection.close();
    if (atlasConnection) await atlasConnection.close();
    
    process.exit(1);
  }
}

// Run migration
console.log('\n╔════════════════════════════════════════╗');
console.log('║  Raindrop Battle - Question Migration ║');
console.log('║  Local MongoDB → MongoDB Atlas         ║');
console.log('╚════════════════════════════════════════╝\n');

migrateQuestions();

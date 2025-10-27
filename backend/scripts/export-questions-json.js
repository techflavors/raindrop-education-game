/**
 * Export Questions to JSON (Backup)
 * 
 * This script exports all questions from local MongoDB to a JSON file
 * Useful for backup or manual import
 * 
 * Usage:
 *   node scripts/export-questions-json.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Question = require('../src/models/Question');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raindrop-battle';
const OUTPUT_FILE = path.join(__dirname, '../data/questions-backup.json');

async function exportQuestions() {
  console.log('\n📦 Exporting questions to JSON...\n');
  
  try {
    // Connect to MongoDB
    console.log(`📡 Connecting to MongoDB...`);
    console.log(`   URI: ${MONGODB_URI}\n`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Fetch all questions
    console.log('📤 Fetching questions...');
    const questions = await Question.find({}).lean();
    
    console.log(`✅ Found ${questions.length} questions\n`);
    
    if (questions.length === 0) {
      console.log('⚠️  No questions found in database!');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write to JSON file
    console.log(`💾 Writing to file: ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(questions, null, 2));
    
    // Get file size
    const stats = fs.statSync(OUTPUT_FILE);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Export complete!\n`);
    
    // Show summary
    console.log('═══════════════════════════════════════');
    console.log('Export Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total questions:  ${questions.length}`);
    console.log(`File size:        ${fileSizeMB} MB`);
    console.log(`Output file:      ${OUTPUT_FILE}`);
    console.log('═══════════════════════════════════════\n');
    
    // Show breakdown by subject
    const subjects = {};
    questions.forEach(q => {
      subjects[q.subject] = (subjects[q.subject] || 0) + 1;
    });
    
    console.log('📊 Questions by subject:');
    Object.entries(subjects).sort((a, b) => b[1] - a[1]).forEach(([subject, count]) => {
      console.log(`   ${subject}: ${count}`);
    });
    
    console.log('\n💡 To import this file to Atlas:');
    console.log('   node scripts/import-questions-json.js\n');
    
    await mongoose.disconnect();
    console.log('✅ Done!\n');
    
  } catch (error) {
    console.error('\n❌ Export Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure MongoDB is running:');
      console.error('   brew services start mongodb-community@8.0\n');
    }
    
    await mongoose.disconnect();
    process.exit(1);
  }
}

exportQuestions();

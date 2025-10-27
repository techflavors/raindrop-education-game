const mongoose = require('mongoose');

async function verifyConnection() {
  try {
    const MONGODB_URI = 'mongodb://localhost:27017/raindrop-battle';
    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ Connected to:', mongoose.connection.db.databaseName);
    console.log('📍 Database Path: ~/mongodb/data/db\n');
    
    // Count documents in each collection
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('=== CURRENT DATABASE: raindrop-battle ===\n');
    
    for (const coll of collections) {
      const count = await mongoose.connection.db.collection(coll.name).countDocuments();
      console.log(`  ${coll.name}: ${count} documents`);
      
      if (coll.name === 'users' && count > 0) {
        const users = await mongoose.connection.db.collection('users').find({}, { 
          projection: { username: 1, role: 1, 'profile.firstName': 1, 'profile.lastName': 1 } 
        }).toArray();
        console.log('\n  👥 Users in database:');
        users.forEach(u => {
          const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : 'N/A';
          console.log(`    - ${u.username} (${u.role}) - ${name}`);
        });
      }
      
      if (coll.name === 'questions' && count > 0) {
        const subjects = await mongoose.connection.db.collection('questions').distinct('subject');
        const grades = await mongoose.connection.db.collection('questions').distinct('grade');
        console.log(`    Subjects: ${subjects.join(', ')}`);
        console.log(`    Grades: ${grades.join(', ')}`);
      }
    }
    
    console.log('\n=== OTHER DATABASES AVAILABLE ===');
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();
    databases.forEach(db => {
      if (!['admin', 'config', 'local'].includes(db.name)) {
        const size = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
        console.log(`  📂 ${db.name} (${size} MB)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

verifyConnection();

const mongoose = require('mongoose');

async function inspectDatabase() {
  try {
    await mongoose.connect('mongodb://localhost:27017/');
    console.log('✓ Connected to MongoDB\n');
    
    // List all databases
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();
    
    console.log('=== ALL DATABASES ===');
    databases.forEach(db => {
      console.log(`📂 ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log('');
    
    // Check each database for collections
    for (const db of databases) {
      if (db.name === 'admin' || db.name === 'local' || db.name === 'config') continue;
      
      console.log(`\n=== DATABASE: ${db.name} ===`);
      const database = mongoose.connection.useDb(db.name);
      const collections = await database.db.listCollections().toArray();
      
      for (const coll of collections) {
        const count = await database.db.collection(coll.name).countDocuments();
        console.log(`  📄 ${coll.name}: ${count} documents`);
        
        // Show sample document
        if (count > 0) {
          const sample = await database.db.collection(coll.name).findOne();
          console.log(`     Sample: ${JSON.stringify(sample, null, 2).substring(0, 200)}...`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

inspectDatabase();

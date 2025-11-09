#!/usr/bin/env node
/**
 * cleanup-production.js
 *
 * Simple script to remove all documents from the main production collections.
 * WARNING: destructive operation. This script performs UNDOABLE deletes.
 * Usage:
 *   node cleanup-production.js --prod-uri "<your-prod-mongo-uri>"
 * or set environment variable PROD_MONGODB_URI and run without args.
 */

const mongoose = require('mongoose');
const argv = require('minimist')(process.argv.slice(2));

const PROD_URI = argv['prod-uri'] || process.env.PROD_MONGODB_URI || process.env.MONGODB_URI;

if (!PROD_URI) {
  console.error('ERROR: --prod-uri or PROD_MONGODB_URI (or MONGODB_URI) is required');
  process.exit(1);
}

const MODELS = [
  { name: 'User', file: '../src/models/User' },
  { name: 'Question', file: '../src/models/Question' },
  { name: 'Assignment', file: '../src/models/Assignment' },
  { name: 'Test', file: '../src/models/Test' },
  { name: 'Challenge', file: '../src/models/Challenge' }
];

async function connect(uri) {
  return mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}

(async function main() {
  console.log('Connecting to production DB (redacted)...');
  const conn = await connect(PROD_URI);

  try {
    for (const m of MODELS) {
      const modelModule = require(m.file);
      const Model = conn.model(m.name, modelModule.schema || modelModule._schema || modelModule.model?.schema || modelModule.schema);

      const before = await Model.countDocuments();
      console.log(`${m.name}: ${before} documents found (will be deleted)`);

      const res = await Model.deleteMany({});
      console.log(`${m.name}: deleted ${res.deletedCount} documents`);

      const after = await Model.countDocuments();
      console.log(`${m.name}: ${after} documents remain`);
    }

    console.log('\nCleanup complete. Closing connection.');
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR during cleanup:', err);
    try { await conn.close(); } catch (e) {}
    process.exit(2);
  }
})();

#!/usr/bin/env node
/**
 * migrate-local-to-prod.js
 *
 * Safely migrate data from a local MongoDB to production, excluding TestAttempt documents.
 * - Dry-run by default: prints counts and samples for each collection.
 * - To execute, pass --run and type the interactive confirmation string shown.
 * - Requires --prod-uri (or PROD_MONGODB_URI) and optionally --local-uri.
 *
 * WARNING: This script will DELETE documents in production collections before inserting data from local.
 * Make sure you have a verified backup (mongodump) of production before running.
 *
 * Usage (dry-run):
 *   node migrate-local-to-prod.js --prod-uri "<prod-uri>" [--local-uri "mongodb://localhost:27017/raindrop-battle"]
 * To actually run:
 *   node migrate-local-to-prod.js --prod-uri "<prod-uri>" --run
 * The script will require you to type the exact confirmation string before proceeding.
 */

const mongoose = require('mongoose');
const argv = require('minimist')(process.argv.slice(2));
const readline = require('readline');

const PROD_URI = argv['prod-uri'] || process.env.PROD_MONGODB_URI || process.env.MONGODB_URI;
const LOCAL_URI = argv['local-uri'] || 'mongodb://localhost:27017/raindrop-battle';
const DO_RUN = argv.run === true || argv.run === 'true';

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

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function connect(uri) {
  const conn = await mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  return conn;
}

async function gatherSummary(conn) {
  const summary = [];
  for (const m of MODELS) {
    // require model file to access its schema
    const modelModule = require(m.file);
    const Model = conn.model(m.name, modelModule.schema || modelModule._schema || modelModule.model?.schema || modelModule.schema);
    const count = await Model.countDocuments();
    const sample = await Model.find({}).limit(5).lean();
    summary.push({ name: m.name, count, sample });
  }
  return summary;
}

async function migrate(localConn, prodConn) {
  for (const m of MODELS) {
    const modelModule = require(m.file);
    const Local = localConn.model(m.name, modelModule.schema || modelModule._schema || modelModule.model?.schema || modelModule.schema);
    const Prod = prodConn.model(m.name, modelModule.schema || modelModule._schema || modelModule.model?.schema || modelModule.schema);

    console.log(`\nProcessing model: ${m.name}`);
    const docs = await Local.find({}).lean();
    console.log(`  Local documents to copy: ${docs.length}`);

    // Delete all docs in prod
    const del = await Prod.deleteMany({});
    console.log(`  Deleted ${del.deletedCount} documents from production ${m.name}`);

    if (docs.length === 0) {
      console.log('  No documents to insert for this model');
      continue;
    }

    // Insert docs preserving _id
    // Note: if there are unique indexes (e.g., username) this will succeed because prod was cleared.
    const insertResult = await Prod.insertMany(docs, { ordered: false });
    console.log(`  Inserted ${insertResult.length} documents into production ${m.name}`);
  }
}

(async function main() {
  console.log('MIGRATION DRY-RUN (no changes) unless --run is provided');
  console.log('Local URI:', LOCAL_URI);
  console.log('Prod URI: (redacted)');

  const localConn = await connect(LOCAL_URI);
  const prodConn = await connect(PROD_URI);

  try {
    const [localSummary, prodSummary] = await Promise.all([gatherSummary(localConn), gatherSummary(prodConn)]);

    console.log('\n--- Local summary ---');
    localSummary.forEach(s => console.log(`${s.name}: ${s.count}`));

    console.log('\n--- Production summary ---');
    prodSummary.forEach(s => console.log(`${s.name}: ${s.count}`));

    console.log('\nSamples from local (up to 5/docs each):');
    localSummary.forEach(s => {
      console.log(`\nModel: ${s.name}`);
      console.table(s.sample.map(d => ({ _id: d._id, sample: JSON.stringify(d).slice(0,120) })));
    });

    if (!DO_RUN) {
      console.log('\nDry-run complete. To execute the migration, re-run with --run.');
      await localConn.close();
      await prodConn.close();
      process.exit(0);
    }

    console.log('\n-- RUN MODE --');
    console.log('THIS WILL DELETE DATA IN PRODUCTION COLLECTIONS listed above and replace them with LOCAL data.');
    console.log('Make sure you have a verified mongodump backup of production BEFORE proceeding.');

    // If production is already empty across the target collections, allow skipping the
    // interactive token confirmation so the script can be run non-interactively in that case.
    const prodTotal = prodSummary.reduce((acc, s) => acc + (s.count || 0), 0);
    if (prodTotal === 0) {
      console.log('Production appears EMPTY for target collections (0 documents).');
      console.log('Skipping interactive token confirmation and proceeding with migration as requested.');
    } else {
      const token = `MIGRATE_${Date.now()}`;
      console.log(`Type the following exact string to confirm: ${token}`);
      const ans = await prompt('Confirmation: ');
      if (ans !== token) {
        console.log('Confirmation mismatch — aborting. No changes made.');
        await localConn.close();
        await prodConn.close();
        process.exit(0);
      }
    }

    // Perform migration
    await migrate(localConn, prodConn);

    console.log('\nMigration complete. Closing connections.');
    await localConn.close();
    await prodConn.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR during migration preparation:', err);
    try { await localConn.close(); } catch (e) {}
    try { await prodConn.close(); } catch (e) {}
    process.exit(2);
  }
})();

#!/usr/bin/env node
/**
 * reset-all-passwords.js
 *
 * Safely update all user passwords in a MongoDB database to a single password.
 * - Uses bcrypt to hash the new password.
 * - Defaults to a dry-run mode (shows counts and a sample) unless --run is passed.
 * - Requires a MONGODB_URI environment variable or --uri argument.
 *
 * USAGE (dry-run):
 *   MONGODB_URI="your-uri" node reset-all-passwords.js --password password123
 * To actually perform the update (destructive):
 *   MONGODB_URI="your-uri" node reset-all-passwords.js --password password123 --run
 *
 * IMPORTANT: Back up your DB (mongodump) before running against production.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const argv = require('minimist')(process.argv.slice(2));

const MONGODB_URI = argv.uri || process.env.MONGODB_URI;
const NEW_PASSWORD = argv.password || 'password123';
const DO_RUN = argv.run === true || argv.run === 'true';
const SALT_ROUNDS = parseInt(argv.salt, 10) || 10;
const USERS_COLLECTION = argv.collection || 'users';

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is required as env var or --uri argument');
  process.exit(1);
}

async function confirmPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('MongoDB URI:', MONGODB_URI.replace(/(mongodb\\+srv:\/\/)([^:@]+):([^@]+)@/, '$1<user>:<pass>@'));
  console.log('Users collection:', USERS_COLLECTION);
  console.log('New password (plaintext):', NEW_PASSWORD);
  console.log('Dry run (no DB changes) unless --run is provided.');

  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const dbName = mongoose.connection.name;
    console.log('Connected to DB (via mongoose):', dbName);

    const db = mongoose.connection.db;
    const users = db.collection(USERS_COLLECTION);

    const total = await users.countDocuments();
    console.log(`Total user documents found: ${total}`);

    const sample = await users.find({}, { projection: { _id: 1, username: 1, email: 1 } }).limit(5).toArray();
    console.log('Sample users (first 5):');
    console.table(sample);

    if (!DO_RUN) {
      console.log('\nDry-run mode. To actually update passwords, re-run with --run flag.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\n-- RUN MODE --');
    const ok = await confirmPrompt('This will overwrite ALL user passwords with the new password. Type yes to continue: ');
    if (!ok) {
      console.log('Aborting. No changes made.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('Hashing new password with bcryptjs (salt rounds =', SALT_ROUNDS, ')...');
    const hashed = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);

    console.log('Updating all user documents...');
    const updateResult = await users.updateMany({}, { $set: { password: hashed } });

    console.log('Update summary:', updateResult);
    console.log(`Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);

    console.log('Done. Please rotate credentials and update any downstream secrets as needed.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

main();

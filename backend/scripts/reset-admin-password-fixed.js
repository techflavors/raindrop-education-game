#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));

const MONGODB_URI = process.env.MONGODB_URI || '';
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required as an environment variable');
  process.exit(1);
}

if (!NEW_PASSWORD) {
  console.error('❌ NEW_ADMIN_PASSWORD is required as an environment variable');
  process.exit(1);
}

async function resetAdminPassword() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ No admin user found.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Hash the new password and write it directly using findOneAndUpdate to avoid triggering
    // the pre-save hook that would hash again if we used admin.save().
    const saltRounds = 10;
    const hashed = await bcrypt.hash(NEW_PASSWORD, saltRounds);

    await User.findOneAndUpdate({ _id: admin._id }, { $set: { password: hashed } });

    console.log(`✅ Admin (${admin.username}) password updated successfully (fixed).`);
    console.log('ℹ️  Note: The password has been hashed using bcrypt and stored (no double-hash).');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting admin password:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

resetAdminPassword();

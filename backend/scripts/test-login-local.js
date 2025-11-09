const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const uri = process.argv[2] || process.env.MONGODB_URI;
const username = process.argv[3] || 'admin';
const password = process.argv[4] || 'password123';

if (!uri) {
  console.error('MONGODB URI required as argument or MONGODB_URI env var');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const user = await User.findOne({ username }).lean();
    if (!user) {
      console.log('NO_USER_FOUND');
      await mongoose.disconnect();
      process.exit(0);
    }
    const match = await bcrypt.compare(password, user.password);
    console.log({ username: user.username, passwordMatches: match });
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERR', err.message);
    process.exit(1);
  }
})();

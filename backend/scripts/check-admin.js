const mongoose = require('mongoose');
const User = require('../src/models/User');

const uri = process.argv[2] || process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB URI required as argument or MONGODB_URI env var');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const admin = await User.findOne({ role: 'admin' }).lean();
    if (!admin) {
      console.log('NO_ADMIN_FOUND');
    } else {
      console.log('FOUND_ADMIN', { username: admin.username, passwordHashSnippet: admin.password ? admin.password.slice(0, 40) : null });
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERR', err.message);
    process.exit(1);
  }
})();

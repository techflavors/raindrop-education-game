# MongoDB Atlas Setup Guide for Render Deployment

## Step 1: Create MongoDB Atlas Account

1. **Go to**: https://www.mongodb.com/cloud/atlas/register
2. **Sign up** with email or Google
3. **Skip** the survey (or fill it if you want)

## Step 2: Create Free Cluster

1. **Build a Database** → Click "Build a Database"
2. **Choose FREE tier**:
   - Click on **M0 (FREE)**
   - Provider: **AWS** (recommended)
   - Region: Choose closest to your Render region:
     - **US East (N. Virginia)** - us-east-1 (if deploying to Render US)
     - **Europe (Ireland)** - eu-west-1 (if deploying to Render EU)
   - Cluster Name: **Cluster0** (or any name you like)
3. **Click "Create"** (takes 3-5 minutes)

## Step 3: Create Database User

1. **Security → Database Access**
2. **Add New Database User**:
   - Authentication Method: **Password**
   - Username: `raindrop-admin`
   - Password: Click **Autogenerate Secure Password** (save this!)
   - Database User Privileges: **Built-in Role → Read and write to any database**
3. **Click "Add User"**

**IMPORTANT:** Save your password securely! You'll need it for the connection string.

## Step 4: Allow Network Access

1. **Security → Network Access**
2. **Add IP Address**
3. Choose: **Allow Access from Anywhere** (0.0.0.0/0)
   - This is needed because Render has dynamic IPs
4. **Confirm**

## Step 5: Get Connection String

1. **Database → Click "Connect"** on your cluster
2. **Connect your application**
3. **Select Driver**: Node.js, Version 4.1 or later
4. **Copy the connection string**:

```
mongodb+srv://raindrop-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. **Replace `<password>`** with your actual password
6. **Add database name** after `.mongodb.net/`:

```
mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority
```

## Step 6: Test Connection Locally

Update your backend `.env` file:

```env
MONGODB_URI=mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

Test the connection:

```bash
cd backend
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGODB_URI').then(() => console.log('✅ Connected!')).catch(err => console.error('❌ Error:', err));"
```

## Step 7: Run Database Setup Scripts

Once connected to MongoDB Atlas, run your setup scripts:

### Option A: Run Locally to Populate Atlas

```bash
cd backend

# 1. Set MongoDB URI in your terminal
export MONGODB_URI="mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority"

# 2. Run database setup
node scripts/database-setup.js

# 3. Verify connection
node scripts/verify-connection.js

# 4. Check question count
node scripts/quick-check.js
```

### Option B: Create a Deployment Script

Create `backend/scripts/setup-production-db.js`:

```javascript
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Question = require('../src/models/Question');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

async function setupProductionDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // Check if admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('👤 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@raindrop.edu',
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        }
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Check if teacher exists
    const teacherExists = await User.findOne({ role: 'teacher' });
    
    if (!teacherExists) {
      console.log('👨‍🏫 Creating teacher user...');
      const hashedPassword = await bcrypt.hash('teacher123', 10);
      await User.create({
        username: 'teacher1',
        password: hashedPassword,
        email: 'teacher@raindrop.edu',
        role: 'teacher',
        profile: {
          firstName: 'John',
          lastName: 'Teacher',
          assignedGrades: ['5'],
          subjects: ['Math', 'Science']
        }
      });
      console.log('✅ Teacher user created');
    } else {
      console.log('ℹ️  Teacher user already exists');
    }

    // Count questions
    const questionCount = await Question.countDocuments();
    console.log(`\n📚 Questions in database: ${questionCount}`);

    if (questionCount === 0) {
      console.log('⚠️  Warning: No questions in database!');
      console.log('   Run migration script to import questions from local database');
    }

    console.log('\n✅ Production database setup complete!');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupProductionDatabase();
```

Run it:

```bash
cd backend
MONGODB_URI="your-atlas-connection-string" node scripts/setup-production-db.js
```

## Step 8: Migrate Questions to Atlas

If you have questions in your local MongoDB:

```bash
cd backend

# Export from local MongoDB
mongodump --db raindrop-battle --out ./backup

# Import to MongoDB Atlas
mongorestore --uri "mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle" ./backup/raindrop-battle

# Or use the migration script
node scripts/migrate-questions.js
```

## Step 9: Configure Render Environment Variables

When deploying to Render, add this environment variable:

```env
MONGODB_URI=mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority
```

**⚠️ Important:** 
- Never commit this to GitHub!
- Use Render's environment variable settings
- Keep the password secure

## Step 10: Verify on Render

After deployment, check Render logs:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
🚀 Raindrop Battle API running on port 3000
```

## Troubleshooting

### Can't connect to Atlas?

1. **Check IP whitelist**: Make sure 0.0.0.0/0 is added
2. **Check password**: Special characters may need URL encoding
3. **Check database name**: Should be after `.mongodb.net/`
4. **Check user permissions**: User should have read/write access

### Special characters in password?

URL encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`

Example:
```
Password: Pass@123
Encoded:  Pass%40123
```

### Connection timeout?

- Check network access settings in Atlas
- Verify connection string is correct
- Try connecting from a different network

## MongoDB Atlas Dashboard

Access your database:
1. **Go to**: https://cloud.mongodb.com
2. **Database → Browse Collections**
3. View your data:
   - `users` collection
   - `questions` collection
   - `tests` collection
   - `testattempts` collection

## Free Tier Limits

MongoDB Atlas M0 (Free):
- ✅ 512 MB storage
- ✅ Shared RAM
- ✅ No credit card required
- ✅ Never expires
- ❌ No backups (upgrade for this)
- ❌ Limited to 1 cluster per project

**Storage estimation for your app:**
- Questions (1,305): ~2 MB
- Users (100): ~50 KB
- Test Attempts (1,000): ~5 MB
- Tests (50): ~200 KB

**Total: ~7-10 MB** (you have plenty of room!)

## Security Best Practices

1. **Use strong passwords** (auto-generated)
2. **Limit IP access** if possible (or use 0.0.0.0/0 for Render)
3. **Use environment variables** for connection strings
4. **Enable MongoDB Atlas alerts** for unusual activity
5. **Regular backups** (upgrade to M2+ for automated backups)

## Next Steps

After MongoDB Atlas is set up:

1. ✅ Update backend `.env` with Atlas connection string
2. ✅ Run database setup scripts locally
3. ✅ Verify data is in Atlas (use Atlas dashboard)
4. ✅ Deploy backend to Render with MONGODB_URI env var
5. ✅ Test the deployed app

---

**You're now ready to deploy to Render with MongoDB Atlas!** 🚀

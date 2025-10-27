# Question Migration Guide

## 🎯 Three Ways to Migrate Questions to Atlas

You have 1,305 questions in your local MongoDB that need to move to Atlas (production).

---

## ✅ Method 1: Direct Migration (Recommended)

**Best for:** Quick and easy migration

### Step 1: Make sure local MongoDB is running

```bash
# Check if MongoDB is running
brew services list | grep mongodb

# If not running, start it:
brew services start mongodb-community@8.0
```

### Step 2: Get your Atlas connection string

From MongoDB Atlas dashboard:
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Add database name: `/raindrop-battle?`

Example:
```
mongodb+srv://raindrop-admin:YourPassword123@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority
```

### Step 3: Run the migration script

```bash
cd backend

# Set your Atlas connection string
export MONGODB_URI="mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority"

# Run migration
node scripts/migrate-to-atlas.js
```

**What it does:**
- ✅ Connects to local MongoDB
- ✅ Exports all 1,305 questions
- ✅ Connects to Atlas
- ✅ Imports questions to Atlas
- ✅ Verifies migration
- ✅ Shows summary

**Expected output:**
```
╔════════════════════════════════════════╗
║  Raindrop Battle - Question Migration ║
║  Local MongoDB → MongoDB Atlas         ║
╚════════════════════════════════════════╝

📦 Step 1: Connecting to local MongoDB...
   ✅ Connected to local MongoDB

📤 Step 2: Exporting questions from local database...
   ✅ Found 1305 questions

🌐 Step 3: Connecting to MongoDB Atlas...
   ✅ Connected to MongoDB Atlas

📥 Step 5: Importing questions to Atlas...
   Progress: 100/1305 questions imported...
   Progress: 200/1305 questions imported...
   ...
   Progress: 1305/1305 questions imported...
   ✅ Successfully imported 1305 questions

✅ Step 6: Verifying migration...
   Total questions in Atlas: 1305

🎉 Migration Complete!
```

---

## ✅ Method 2: Export → Import (2-Step Process)

**Best for:** When you want a backup file first

### Step 1: Export to JSON (Backup)

```bash
cd backend

# This creates a backup file
node scripts/export-questions-json.js
```

**Output:**
- Creates: `backend/data/questions-backup.json`
- File size: ~2-5 MB
- Contains all 1,305 questions

### Step 2: Import to Atlas

```bash
# Set Atlas connection
export MONGODB_URI="mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle"

# Import from backup file
node scripts/import-questions-json.js
```

**Benefit:** You have a JSON backup file you can keep

---

## ✅ Method 3: Manual Verification (Test First)

### Test local connection:

```bash
cd backend

# Check local questions
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/raindrop-battle').then(async () => {
  const count = await mongoose.connection.collection('questions').countDocuments();
  console.log('📊 Local questions:', count);
  const sample = await mongoose.connection.collection('questions').findOne();
  console.log('📋 Sample:', sample.question);
  process.exit(0);
});
"
```

### Test Atlas connection:

```bash
# Set Atlas URI
export MONGODB_URI="mongodb+srv://..."

# Check Atlas
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const count = await mongoose.connection.collection('questions').countDocuments();
  console.log('📊 Atlas questions:', count);
  process.exit(0);
});
"
```

---

## 🔧 Troubleshooting

### Local MongoDB not running

**Error:**
```
MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017
```

**Fix:**
```bash
# Start MongoDB
brew services start mongodb-community@8.0

# Or manually:
mongod --dbpath ~/mongodb/data/db
```

### Atlas authentication failed

**Error:**
```
MongoServerError: Authentication failed
```

**Fix:**
1. Check username/password are correct
2. If password has special characters, encode them:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - Use: https://www.urlencoder.org/

Example:
```bash
# If password is: MyPass@123
# Use this in URI: MyPass%40123
export MONGODB_URI="mongodb+srv://user:MyPass%40123@cluster.mongodb.net/raindrop-battle"
```

### Network access denied

**Error:**
```
MongoNetworkError: connection timed out
```

**Fix:**
1. Go to Atlas → Network Access
2. Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
3. Wait 2 minutes for changes to apply
4. Try again

### Database name missing

**Error:**
```
Connected but no questions found
```

**Fix:**
Make sure URI includes database name:
```bash
# Wrong:
mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true

# Right:
mongodb+srv://user:pass@cluster.mongodb.net/raindrop-battle?retryWrites=true
```

---

## 📊 Verification After Migration

After running migration, verify it worked:

```bash
cd backend

# Check Atlas question count
export MONGODB_URI="mongodb+srv://..."
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // Count questions
  const count = await db.collection('questions').countDocuments();
  console.log('Total questions:', count);
  
  // Count by subject
  const subjects = await db.collection('questions').distinct('subject');
  console.log('\\nQuestions by subject:');
  for (const subject of subjects) {
    const subjectCount = await db.collection('questions').countDocuments({ subject });
    console.log(\`  \${subject}: \${subjectCount}\`);
  }
  
  // Count by difficulty
  const difficulties = ['easy', 'medium', 'hard'];
  console.log('\\nQuestions by difficulty:');
  for (const diff of difficulties) {
    const diffCount = await db.collection('questions').countDocuments({ difficulty: diff });
    console.log(\`  \${diff}: \${diffCount}\`);
  }
  
  process.exit(0);
});
"
```

**Expected output:**
```
Total questions: 1305

Questions by subject:
  math: 435
  science: 435
  english: 435

Questions by difficulty:
  easy: 435
  medium: 435
  hard: 435
```

---

## 🚀 Quick Start (Most Common)

Here's what most people do:

```bash
# 1. Start local MongoDB
brew services start mongodb-community@8.0

# 2. Go to backend folder
cd backend

# 3. Set Atlas connection (replace with your actual URI!)
export MONGODB_URI="mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority"

# 4. Run migration
node scripts/migrate-to-atlas.js

# 5. Verify (should show 1305)
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(async () => { console.log('Questions:', await mongoose.connection.collection('questions').countDocuments()); process.exit(0); });"
```

That's it! ✅

---

## 💡 Tips

1. **Backup first** (Method 2) if you're nervous - creates JSON file
2. **Test Atlas connection** before migrating
3. **Note:** Migration adds questions, doesn't replace them
4. **Delete first** if you need to re-migrate (run setup-production-db.js with drop flag)
5. **Keep backup JSON** file for safety

---

## ⚠️ Important Notes

- Migration takes about 30-60 seconds for 1,305 questions
- Your local MongoDB data is NOT deleted (safe to migrate)
- If you run migration twice, you'll get duplicate questions
- Atlas free tier supports up to ~100,000 questions (you're at 1,305)
- Backup JSON file is ~2-5 MB

---

## 🎉 After Successful Migration

Once questions are in Atlas:

1. ✅ Run setup script to create users:
   ```bash
   node scripts/setup-production-db.js
   ```

2. ✅ Deploy backend to Render

3. ✅ Deploy frontend to Render

4. ✅ Test your live app!

---

Need help? Check the main deployment guide:
`docs/RENDER_DEPLOYMENT_GUIDE.md`

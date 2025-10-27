# Complete Render Deployment Guide

## 🎯 Deployment Architecture

```
Frontend (Vercel)          Backend (Render)         Database (MongoDB Atlas)
─────────────────          ────────────────         ─────────────────────────
React App                  Express API              Cloud MongoDB
Port: N/A (static)         Port: 3000               Port: 27017
Domain: vercel.app    ───► Domain: render.com  ───► mongodb+srv://...
```

**Yes, frontend MUST connect to backend server!** Here's how:

---

## 📋 Complete Deployment Checklist

### Phase 1: MongoDB Atlas (Database) ✅
### Phase 2: Backend on Render (API Server) 🔄
### Phase 3: Frontend on Vercel (React App) 🔄
### Phase 4: Connect Frontend to Backend 🔄

---

## 🗄️ Phase 1: MongoDB Atlas Setup (Completed Above)

Already documented in `DEPLOYMENT_MONGODB_ATLAS.md`

Quick recap:
1. Create MongoDB Atlas account
2. Create free M0 cluster
3. Get connection string
4. Save it securely (you'll need it for Render)

**Example connection string:**
```
mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority
```

---

## 🚀 Phase 2: Deploy Backend to Render

### Step 1: Prepare Backend for Deployment

Create `backend/.env.example`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/raindrop-battle
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

Update `backend/src/app.js` for production CORS:

```javascript
// backend/src/app.js
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### Step 2: Create Render Account

1. **Go to**: https://render.com
2. **Sign up** with GitHub
3. **Authorize** Render to access your repositories

### Step 3: Deploy Backend Web Service

1. **Dashboard → New → Web Service**
2. **Connect GitHub repository**: `techflavors/raindrop-education-game`
3. **Configure:**

```
Name:                raindrop-backend
Region:              Oregon (US West) - or closest to you
Branch:              main
Root Directory:      backend
Runtime:             Node
Build Command:       npm install
Start Command:       npm start
```

4. **Select Free Plan** (bottom of page)

### Step 4: Add Environment Variables

**Important:** Add these BEFORE deploying!

Click **Advanced → Environment Variables → Add from .env**

Or add manually:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority` |
| `JWT_SECRET` | `your-super-secret-production-jwt-key-min-32-chars` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `FRONTEND_URL` | `https://raindrop-game.vercel.app` (we'll get this in Phase 3) |

**⚠️ Critical:** Replace values with your actual credentials!

### Step 5: Deploy Backend

1. **Click "Create Web Service"**
2. **Wait 3-5 minutes** for deployment
3. **Check logs** for successful connection:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
🚀 Raindrop Battle API running on port 3000
```

4. **Copy your backend URL**: 
   - Example: `https://raindrop-backend.onrender.com`
   - **Save this!** You need it for frontend

### Step 6: Test Backend API

Open in browser:
```
https://raindrop-backend.onrender.com/api/health

Should return:
{
  "status": "ok",
  "message": "Raindrop Battle API is running",
  "timestamp": "2025-10-26T..."
}
```

If you see this, backend is working! ✅

### Step 7: Run Database Setup on Render

**Option A: Run from local machine (Recommended)**

```bash
cd backend

# Set MongoDB URI to Atlas
export MONGODB_URI="mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle"

# Run production setup
node scripts/setup-production-db.js
```

**Option B: Run on Render (via Shell)**

1. Render Dashboard → Your Service → **Shell** tab
2. Run:
```bash
npm run setup-db
```

(First add this to `backend/package.json`:)
```json
{
  "scripts": {
    "start": "node src/app.js",
    "setup-db": "node scripts/setup-production-db.js"
  }
}
```

---

## 🎨 Phase 3: Deploy Frontend to Vercel

### Step 1: Prepare Frontend

Create `frontend/.env.example`:
```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
```

### Step 2: Create Vercel Account

1. **Go to**: https://vercel.com
2. **Sign up** with GitHub
3. **Authorize** Vercel

### Step 3: Import Project

1. **Dashboard → Add New → Project**
2. **Import Git Repository**: `techflavors/raindrop-education-game`
3. **Configure:**

```
Framework Preset:     Create React App
Root Directory:       frontend
Build Command:        npm run build
Output Directory:     build
Install Command:      npm install
```

### Step 4: Add Environment Variables

**Before deploying**, add:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://raindrop-backend.onrender.com/api` |

**⚠️ Replace with YOUR actual Render backend URL!**

### Step 5: Deploy Frontend

1. **Click "Deploy"**
2. **Wait 2-3 minutes**
3. **Get your URL**: 
   - Example: `https://raindrop-game.vercel.app`

### Step 6: Update Backend CORS

**Important!** Now go back to Render and update the `FRONTEND_URL`:

1. **Render Dashboard → raindrop-backend → Environment**
2. **Update** `FRONTEND_URL`:
```
FRONTEND_URL=https://raindrop-game.vercel.app
```
3. **Save** (this will redeploy backend)

---

## 🔗 Phase 4: Connect Frontend to Backend

### Verify Connection

Your frontend already has this code (no changes needed!):

```javascript
// frontend/src/components/StudentDashboard.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Makes requests like:
const response = await fetch(`${API_URL}/student/progress`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Test the Connection

1. **Open** your Vercel URL: `https://raindrop-game.vercel.app`
2. **Login** with: `admin` / `admin123`
3. **Check browser console** (F12 → Console tab)
4. **Look for**:
   - ✅ API calls to `https://raindrop-backend.onrender.com/api/...`
   - ✅ Successful responses with data
   - ❌ CORS errors (if you see this, check backend CORS settings)

### Troubleshooting Connection Issues

**Problem: CORS Error**
```
Access to fetch at 'https://raindrop-backend.onrender.com/api/...' 
from origin 'https://raindrop-game.vercel.app' has been blocked by CORS
```

**Solution:**
1. Check backend `FRONTEND_URL` environment variable
2. Verify `backend/src/app.js` CORS configuration:

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
};
app.use(cors(corsOptions));
```

**Problem: 404 Not Found**

**Solution:**
- Check `REACT_APP_API_URL` includes `/api` at the end
- Verify backend routes are working (test with curl/Postman)

**Problem: Network Error**

**Solution:**
- Check Render backend is running (not sleeping)
- Free tier sleeps after 15 min inactivity
- First request will wake it up (takes 30 seconds)

---

## 📊 Migration: Export Local Data to Atlas

### Export Questions from Local MongoDB

```bash
cd backend

# Export from local MongoDB
mongodump --db raindrop-battle --collection questions --out ./backup

# Import to MongoDB Atlas
mongorestore \
  --uri "mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle" \
  --drop \
  ./backup/raindrop-battle

# Verify
node scripts/quick-check.js
```

### Or Use the Migration Script

```bash
cd backend

# Update the script to use Atlas URI
export SOURCE_MONGODB_URI="mongodb://localhost:27017/raindrop-battle"
export TARGET_MONGODB_URI="mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle"

# Run migration
node scripts/migrate-questions.js
```

---

## 🎯 Final Deployment Checklist

### Backend (Render)
- [ ] Backend deployed to Render
- [ ] MongoDB Atlas connection string added
- [ ] Environment variables configured
- [ ] Backend accessible at Render URL
- [ ] API health check returns 200 OK
- [ ] Database has users and questions
- [ ] CORS configured with Vercel URL

### Frontend (Vercel)
- [ ] Frontend deployed to Vercel
- [ ] `REACT_APP_API_URL` points to Render backend
- [ ] Build successful with no errors
- [ ] App loads in browser
- [ ] Login works
- [ ] API requests succeed

### Database (MongoDB Atlas)
- [ ] Cluster created and running
- [ ] Database user created
- [ ] Network access allows 0.0.0.0/0
- [ ] Connection string tested
- [ ] Users collection populated
- [ ] Questions collection populated
- [ ] Can connect from Render backend

### Testing
- [ ] Can login as admin
- [ ] Can login as teacher
- [ ] Can login as student
- [ ] Dashboard loads correctly
- [ ] Questions display
- [ ] Tests can be submitted
- [ ] Scores save correctly
- [ ] Leaderboard works

---

## 🔄 Automatic Deployments

### Vercel (Frontend)
- ✅ **Auto-deploys** when you push to `main` branch
- ✅ **Preview deployments** for pull requests
- ✅ **Instant rollback** if needed

### Render (Backend)
- ✅ **Auto-deploys** when you push to `main` branch
- ✅ **Health checks** to verify deployment
- ✅ **Automatic restarts** if crashes

**Workflow:**
```bash
# Make changes locally
git add .
git commit -m "Add new feature"
git push origin main

# Wait 2-3 minutes
# ✅ Vercel rebuilds frontend automatically
# ✅ Render rebuilds backend automatically
# ✅ Both are live!
```

---

## 💰 Free Tier Limits

### Render Free Tier
- ✅ **750 hours/month** (31 days = 744 hours - perfect!)
- ✅ **Sleeps after 15 min** inactivity
- ✅ **Wake up time**: ~30 seconds
- ✅ **1 GB RAM**
- ✅ **Automatic SSL**

**Tips:**
- Backend sleeps when no requests
- First request after sleep takes 30s
- Consider upgrading to $7/month for always-on

### Vercel Free Tier
- ✅ **Unlimited deployments**
- ✅ **100 GB bandwidth/month**
- ✅ **No sleep time**
- ✅ **Fast global CDN**
- ✅ **Automatic SSL**

### MongoDB Atlas Free Tier
- ✅ **512 MB storage**
- ✅ **Shared RAM**
- ✅ **No time limit**
- ✅ **No credit card needed**

**Total Monthly Cost: $0** 🎉

---

## 🔐 Security Checklist

- [ ] Change default passwords (admin, teacher, students)
- [ ] Use strong JWT secret (32+ characters)
- [ ] Don't commit `.env` files to git
- [ ] Use environment variables in Render/Vercel
- [ ] Enable MongoDB Atlas IP whitelist (if possible)
- [ ] Regular security updates (`npm audit fix`)

---

## 📱 Custom Domain (Optional)

### Add Custom Domain to Vercel

1. **Vercel Dashboard → Settings → Domains**
2. **Add domain**: `raindropgame.com`
3. **Update DNS** (at your domain registrar):
```
Type    Name    Value
CNAME   www     cname.vercel-dns.com
A       @       76.76.21.21
```
4. **Wait for verification** (5-10 minutes)
5. **SSL automatically configured** ✅

### Update Backend CORS

Update Render environment variable:
```
FRONTEND_URL=https://raindropgame.com
```

---

## 🐛 Common Issues & Solutions

### Issue: Backend Not Responding

**Check:**
```bash
# Test backend directly
curl https://raindrop-backend.onrender.com/api/health
```

**Solutions:**
- Check Render logs for errors
- Verify MongoDB connection string
- Check environment variables
- Restart service in Render dashboard

### Issue: Frontend Can't Reach Backend

**Check browser console:**
- CORS errors → Fix `FRONTEND_URL` in Render
- 404 errors → Check API URL has `/api`
- Network errors → Backend might be sleeping

### Issue: MongoDB Connection Failed

**Check:**
- Connection string has correct password
- Database name is included in URI
- IP whitelist includes 0.0.0.0/0
- User has read/write permissions

### Issue: Login Not Working

**Check:**
- Admin user exists in database
- Password is correct (default: `admin123`)
- JWT secret is set in environment
- Network tab shows successful API calls

---

## 🚀 You're Ready to Deploy!

### Quick Start Commands

```bash
# 1. Commit deployment configs
git add .
git commit -m "Add deployment configurations"
git push origin main

# 2. Setup MongoDB Atlas (follow guide above)

# 3. Deploy to Render
# - Go to render.com
# - New Web Service
# - Connect repo
# - Add environment variables
# - Deploy!

# 4. Run database setup
export MONGODB_URI="your-atlas-uri"
cd backend
node scripts/setup-production-db.js

# 5. Deploy to Vercel
# - Go to vercel.com
# - Import project
# - Add REACT_APP_API_URL
# - Deploy!

# 6. Test your app!
# Open https://your-app.vercel.app
# Login with admin/admin123
```

---

## 📞 Need Help?

If you encounter issues:
1. Check Render logs (Dashboard → Logs)
2. Check Vercel logs (Deployment details)
3. Check MongoDB Atlas metrics
4. Test API endpoints with curl/Postman
5. Check browser console for errors

**Your app will be live in about 15-20 minutes!** 🎉

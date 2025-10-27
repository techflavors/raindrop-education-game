# Complete Render Deployment Guide
## Deploy Both Frontend & Backend on Render

## 🎯 Deployment Architecture

```
Frontend (Render Static Site)    Backend (Render Web Service)    Database (MongoDB Atlas)
──────────────────────────────    ────────────────────────────    ─────────────────────────
React App (Static Build)          Express API                     Cloud MongoDB
Served as static files            Port: 3000                      Port: 27017
Domain: your-app.onrender.com ───► Domain: api.onrender.com  ───► mongodb+srv://...
```

**Total Monthly Cost: $0** 🎉

---

## 📋 Complete Deployment Checklist

1. ✅ **MongoDB Atlas** (Database - Free 512MB)
2. 🔄 **Render Backend** (API Server - Free 750 hrs/month)
3. 🔄 **Render Frontend** (Static Site - Free 100GB bandwidth)
4. 🔄 **Connect Everything**

---

## 🗄️ Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Account

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (no credit card required)
3. Choose **FREE M0 Cluster**
4. Select cloud provider: **AWS**
5. Region: Choose closest to you (e.g., **US East**)
6. Cluster Name: `Cluster0` (default is fine)
7. Click **Create Cluster** (takes 3-5 minutes)

### 1.2 Create Database User

1. **Security → Database Access → Add New Database User**
2. **Authentication Method**: Password
3. **Username**: `raindrop-admin`
4. **Password**: Generate secure password (save it!)
5. **Database User Privileges**: Read and write to any database
6. Click **Add User**

### 1.3 Configure Network Access

**Important for Render!**

1. **Security → Network Access → Add IP Address**
2. Click **"Allow Access from Anywhere"**
3. This adds `0.0.0.0/0` (required for Render)
4. Click **Confirm**

### 1.4 Get Connection String

1. **Deployment → Database → Connect**
2. **Connect your application**
3. **Driver**: Node.js, Version: 5.5 or later
4. **Copy connection string**:

```
mongodb+srv://raindrop-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. **Important**: Replace `<password>` with your actual password
6. **Add database name** before the `?`:

```
mongodb+srv://raindrop-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority
```

**Save this connection string!** You'll need it for Render.

---

## 🚀 Step 2: Deploy Backend to Render

### 2.1 Create Render Account

1. Go to: https://render.com
2. **Sign up with GitHub** (easiest option)
3. **Authorize Render** to access your repositories

### 2.2 Create Backend Web Service

1. **Dashboard → New → Web Service**
2. **Connect repository**: `techflavors/raindrop-education-game`
3. **Configure service:**

```yaml
Name:                 raindrop-backend
Region:               Oregon (US West) or closest to you
Branch:               main
Root Directory:       backend
Runtime:              Node
Build Command:        npm install
Start Command:        npm start
```

4. **Instance Type**: **Free** (scroll down to see it)
5. **Don't click "Create Web Service" yet!** ⚠️

### 2.3 Add Environment Variables

**Before deploying**, click **Advanced** and add environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `MONGODB_URI` | `mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority` | From Atlas |
| `NODE_ENV` | `production` | Required |
| `PORT` | `3000` | Required |
| `JWT_SECRET` | `your-super-secret-production-jwt-key-min-32-chars-random-string` | Change this! |
| `FRONTEND_URL` | `https://raindrop-game.onrender.com` | We'll get exact URL in Step 3 |
| `CLIENT_URL` | `https://raindrop-game.onrender.com` | Same as FRONTEND_URL |

**⚠️ IMPORTANT:**
- Replace `PASSWORD` in MONGODB_URI with your actual Atlas password
- If password has special characters like `@`, `#`, encode them:
  - `@` becomes `%40`
  - `#` becomes `%23`
  - Or use https://www.urlencoder.org/
- Generate a random 32+ character string for JWT_SECRET
- We'll update FRONTEND_URL after deploying frontend

### 2.4 Deploy Backend

1. **Click "Create Web Service"**
2. **Wait 3-5 minutes** for deployment
3. Watch the logs for:

```
Building...
✓ Installed dependencies
Starting server...
✅ Connected to MongoDB
🚀 Raindrop Battle API running on port 3000
```

4. **Copy your backend URL**: 
   - Example: `https://raindrop-backend.onrender.com`
   - Click on the URL at the top to open it
   - **Save this URL!**

### 2.5 Test Backend

Open in browser:
```
https://raindrop-backend.onrender.com/
```

Should see:
```json
{
  "message": "🌧️ Welcome to Raindrop Battle API",
  "version": "1.0.0",
  "status": "active"
}
```

Test health check:
```
https://raindrop-backend.onrender.com/health
```

✅ **Backend is live!**

---

## 🎨 Step 3: Deploy Frontend to Render

### 3.1 Create Frontend Static Site

1. **Dashboard → New → Static Site**
2. **Connect repository**: `techflavors/raindrop-education-game` (same repo)
3. **Configure site:**

```yaml
Name:                 raindrop-game
Branch:               main
Root Directory:       frontend
Build Command:        npm install && npm run build
Publish Directory:    build
```

4. **Don't click "Create Static Site" yet!** ⚠️

### 3.2 Add Environment Variables

Click **Advanced** and add:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://raindrop-backend.onrender.com/api` |

**⚠️ Replace with YOUR actual backend URL from Step 2.4!**

**Important**: Must include `/api` at the end!

### 3.3 Deploy Frontend

1. **Click "Create Static Site"**
2. **Wait 2-4 minutes** for build
3. Watch for:

```
Building...
> react-scripts build
Creating an optimized production build...
Compiled successfully!
✓ Build complete
```

4. **Get your frontend URL**:
   - Example: `https://raindrop-game.onrender.com`
   - **Save this URL!**

### 3.4 Update Backend CORS

**Important!** Now update backend with your actual frontend URL:

1. **Go to backend service** (raindrop-backend)
2. **Environment → Edit**
3. **Update these variables**:

```
FRONTEND_URL=https://raindrop-game.onrender.com
CLIENT_URL=https://raindrop-game.onrender.com
```

4. **Save** (this will auto-redeploy backend - takes 2-3 min)

---

## 🗃️ Step 4: Initialize Database

### 4.1 Setup Production Database

Run this **from your local machine**:

```bash
cd backend

# Set MongoDB URI to your Atlas connection
export MONGODB_URI="mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle?retryWrites=true&w=majority"

# Run production setup script
node scripts/setup-production-db.js
```

**This will create:**
- ✅ Admin user: `admin` / `admin123`
- ✅ Teacher user: `teacher1` / `teacher123`
- ✅ 3 sample students (password: `student123`)

**Output should show:**
```
🎯 Production Database Setup Complete!

📊 Setup Summary:
✅ Users created: 5
✅ Questions found: 0 (needs migration)

🔐 Default Credentials:
Admin:    admin / admin123
Teacher:  teacher1 / teacher123
Students: emma_johnson, liam_smith, olivia_brown / student123

⚠️  SECURITY WARNING: Change these passwords in production!
```

### 4.2 Migrate Questions from Local Database

**Export from local MongoDB:**

```bash
cd backend

# Export all questions from local database
mongodump \
  --uri="mongodb://localhost:27017/raindrop-battle" \
  --collection=questions \
  --out=./backup

# You should see:
# 2025-10-26... done dumping raindrop-battle.questions (1305 documents)
```

**Import to MongoDB Atlas:**

```bash
# Import to Atlas
mongorestore \
  --uri="mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle" \
  --drop \
  ./backup

# You should see:
# 2025-10-26... restoring raindrop-battle.questions from backup/raindrop-battle/questions.bson
# 2025-10-26... 1305 document(s) restored successfully
```

**Verify migration:**

```bash
# Check question count
export MONGODB_URI="mongodb+srv://raindrop-admin:PASSWORD@cluster0.xxxxx.mongodb.net/raindrop-battle"
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const count = await mongoose.connection.collection('questions').countDocuments();
  console.log('✅ Questions in Atlas:', count);
  process.exit(0);
});
"
```

Expected output: `✅ Questions in Atlas: 1305`

---

## 🔗 Step 5: Test Complete System

### 5.1 Open Your App

Visit your frontend URL:
```
https://raindrop-game.onrender.com
```

### 5.2 Test Login

**Login as Admin:**
- Username: `admin`
- Password: `admin123`

**Should see:**
- ✅ Admin dashboard loads
- ✅ User management panel
- ✅ Can create tests

**Login as Student:**
- Username: `emma_johnson`
- Password: `student123`

**Should see:**
- ✅ Student dashboard
- ✅ Raindrop counter
- ✅ Available tests
- ✅ Leaderboard

### 5.3 Check Browser Console

Press `F12` → Console tab

**Should see:**
```
✅ API calls to: https://raindrop-backend.onrender.com/api/...
✅ Successful responses with data
```

**Should NOT see:**
```
❌ CORS errors
❌ Network errors
❌ 404 errors
```

### 5.4 Test Full Workflow

1. **As Admin**: Create a test with 5 questions
2. **As Student**: Take the test and submit
3. **Check**: Score saves correctly
4. **Check**: Raindrops increase
5. **Check**: Leaderboard updates

✅ **Everything working? You're deployed!** 🎉

---

## 🔧 Step 6: Configure Auto-Deployments

### 6.1 Enable Auto-Deploy (Already On!)

Both services automatically deploy when you push to GitHub:

```bash
# Make any changes locally
git add .
git commit -m "Update feature"
git push origin main

# Wait 3-5 minutes
# ✅ Backend rebuilds automatically
# ✅ Frontend rebuilds automatically
```

### 6.2 Monitor Deployments

**Backend:**
- Go to Render Dashboard → raindrop-backend
- **Logs** tab shows real-time deployment
- **Events** tab shows deployment history

**Frontend:**
- Go to Render Dashboard → raindrop-game  
- **Logs** tab shows build output
- **Deploys** tab shows history

---

## 🐛 Troubleshooting Guide

### Problem: Backend Won't Start

**Check Render logs:**
```
Dashboard → raindrop-backend → Logs
```

**Common issues:**

1. **MongoDB connection failed**
```
Error: MongoNetworkError
```
**Fix:**
- Verify MONGODB_URI has correct password
- Check password encoding (special chars)
- Verify database name in URI: `/raindrop-battle?`
- Check Atlas network access allows 0.0.0.0/0

2. **Port already in use**
```
Error: EADDRINUSE
```
**Fix:**
- Render handles ports automatically
- Ensure `PORT` env variable is set to `3000`

3. **Missing environment variables**
```
JWT_SECRET is not defined
```
**Fix:**
- Check all environment variables are set
- Click "Manual Deploy" to restart with new variables

### Problem: Frontend Shows Blank Page

**Check browser console** (F12):

1. **CORS Error**
```
Access to fetch blocked by CORS policy
```
**Fix:**
- Update backend `FRONTEND_URL` to match your frontend URL
- Must match exactly (no trailing slash)
- Redeploy backend after changing

2. **API URL Wrong**
```
GET https://raindrop-backend.onrender.com/api/undefined 404
```
**Fix:**
- Check `REACT_APP_API_URL` includes `/api` at end
- Redeploy frontend after fixing

3. **Build Failed**
```
Module not found: Error: Can't resolve
```
**Fix:**
- Check Render build logs
- Verify all dependencies in package.json
- Clear cache and redeploy

### Problem: Login Not Working

**Check:**

1. **Admin user exists?**
```bash
# Run locally to check
export MONGODB_URI="your-atlas-uri"
node scripts/setup-production-db.js
```

2. **Wrong password?**
- Default: `admin123`
- Try resetting in database

3. **JWT secret missing?**
- Check backend logs for JWT errors
- Verify `JWT_SECRET` env variable is set

### Problem: Slow First Load (30+ seconds)

**This is normal for Render free tier!**

**Why:**
- Free tier services sleep after 15 minutes of inactivity
- First request wakes up the backend (takes 30-50 seconds)
- Subsequent requests are fast

**Solutions:**
- **Upgrade to paid tier** ($7/month for always-on)
- **Use a pinger service** (keeps your app awake)
  - https://uptimerobot.com (free, pings every 5 min)
  - Add your backend URL to ping

**Setup UptimeRobot:**
1. Sign up at https://uptimerobot.com
2. Add New Monitor
3. Monitor Type: HTTP(s)
4. URL: `https://raindrop-backend.onrender.com/health`
5. Monitoring Interval: 5 minutes
6. This keeps your backend awake!

### Problem: Questions Not Loading

**Check:**

1. **Questions migrated?**
```bash
# Verify count
mongosh "mongodb+srv://..." --eval "db.questions.countDocuments()"
```

2. **API returning data?**
```bash
# Test directly
curl https://raindrop-backend.onrender.com/api/questions/random?subject=math&difficulty=easy
```

3. **Frontend making requests?**
- Check browser Network tab (F12 → Network)
- Look for `/api/questions/random` calls
- Check response data

---

## 📊 Free Tier Limits

### Render Backend (Web Service)
- ✅ **750 hours/month** (~31 days)
- ⏰ **Sleeps after 15 min** inactivity  
- 🔄 **Wake up time**: 30-50 seconds
- 💾 **512 MB RAM**
- 🔒 **Automatic SSL**
- 🌐 **Custom domains** (free)

### Render Frontend (Static Site)
- ✅ **100 GB bandwidth/month**
- ✅ **Unlimited builds**
- ⚡ **No sleep time** (always on!)
- 🚀 **Global CDN**
- 🔒 **Automatic SSL**
- 🌐 **Custom domains** (free)

### MongoDB Atlas
- ✅ **512 MB storage** (~100k-500k documents)
- ✅ **Shared RAM**
- ✅ **No time limit**
- ✅ **No credit card**
- ✅ **Always on**

**Your current usage:**
- Questions: 1,305 (~1 MB)
- Users: 5-50 (~5 KB)
- Test attempts: Growing
- **Total: ~5-10 MB** (plenty of room!)

---

## 🔐 Security Checklist

Before going live, secure your app:

### Backend Environment

- [ ] Change `JWT_SECRET` to random 32+ char string
- [ ] Use strong MongoDB password (16+ chars)
- [ ] Don't commit `.env` files
- [ ] Enable rate limiting (already configured)
- [ ] Review CORS settings

### Default Passwords

- [ ] Change admin password from `admin123`
- [ ] Change teacher password from `teacher123`
- [ ] Change student passwords from `student123`
- [ ] Document new passwords securely

### MongoDB Atlas

- [ ] Consider restricting IP whitelist (instead of 0.0.0.0/0)
- [ ] Enable MongoDB backup (paid feature)
- [ ] Monitor usage in Atlas dashboard
- [ ] Set up alerts for high usage

### Regular Maintenance

- [ ] Run `npm audit fix` regularly
- [ ] Update dependencies monthly
- [ ] Monitor Render logs for errors
- [ ] Check Atlas metrics weekly

---

## 🎯 Custom Domain (Optional)

### Add Custom Domain

Both frontend and backend support custom domains on Render:

**Frontend Custom Domain:**
1. **Buy domain** (Namecheap, Google Domains, etc.)
2. **Render Dashboard** → raindrop-game → Settings → Custom Domain
3. **Add domain**: `raindropgame.com`
4. **Update DNS** at your domain registrar:
```
Type    Name    Value
CNAME   www     raindrop-game.onrender.com
CNAME   @       raindrop-game.onrender.com
```
5. **Wait 5-10 minutes** for DNS propagation
6. **SSL automatically configured** ✅

**Backend Custom Domain:**
1. **Add subdomain**: `api.raindropgame.com`
2. **Update DNS**:
```
Type    Name    Value
CNAME   api     raindrop-backend.onrender.com
```
3. **Update frontend env variable**:
```
REACT_APP_API_URL=https://api.raindropgame.com/api
```

---

## 📈 Monitoring & Logs

### View Backend Logs

```
Render Dashboard → raindrop-backend → Logs
```

**Look for:**
- ✅ MongoDB connection success
- ✅ API requests and responses
- ❌ Error stack traces
- ⚠️ Warnings

### View Frontend Logs

```
Render Dashboard → raindrop-game → Logs
```

**Look for:**
- ✅ Build success
- ✅ Asset optimization
- ❌ Build errors

### MongoDB Atlas Monitoring

```
Atlas Dashboard → Cluster → Metrics
```

**Monitor:**
- 📊 Connections
- 💾 Storage usage
- 🔄 Operations per second
- ⚠️ Alerts

---

## 🚀 Deployment Complete!

### Your Live URLs

**Frontend (React App):**
```
https://raindrop-game.onrender.com
```

**Backend (API):**
```
https://raindrop-backend.onrender.com
```

**MongoDB (Database):**
```
mongodb+srv://...
```

### Quick Reference Commands

**Update Backend:**
```bash
cd backend
git add .
git commit -m "Backend update"
git push origin main
# Auto-deploys in 3-5 minutes
```

**Update Frontend:**
```bash
cd frontend
git add .
git commit -m "Frontend update"
git push origin main
# Auto-rebuilds in 2-4 minutes
```

**Check Database:**
```bash
export MONGODB_URI="your-atlas-uri"
node scripts/setup-production-db.js
```

**Manual Deploy:**
- Go to Render Dashboard
- Click service → Manual Deploy → Deploy latest commit

---

## 📞 Need Help?

**Render Support:**
- Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

**MongoDB Atlas Support:**
- Docs: https://www.mongodb.com/docs/atlas/
- Forums: https://www.mongodb.com/community/forums
- Support: https://support.mongodb.com

**Common Issues:**
1. Check Render logs first
2. Verify environment variables
3. Test API endpoints directly
4. Check browser console for frontend errors

---

## 🎉 Congratulations!

Your Raindrop Battle game is now **live and accessible from anywhere**!

**Next Steps:**
1. Share your app URL with students
2. Monitor usage and performance
3. Add more questions to database
4. Implement new features
5. Consider upgrading if you need more resources

**Your app is production-ready!** 🚀

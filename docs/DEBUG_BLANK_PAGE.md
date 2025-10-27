# Debugging Blank Page on Render Deployment

## 🔍 How to Debug Your Deployed App

Since you're seeing a **blank page** at `https://raindrop-game.onrender.com`, let's diagnose the issue step by step.

---

## 📋 Step 1: Check Browser Console (MOST IMPORTANT!)

### Open Developer Tools:
- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+I` (Mac: `Cmd+Option+I`)
- **Firefox:** Press `F12`
- **Safari:** `Cmd+Option+I`

### Click on "Console" Tab

### Look for Errors:

Common errors you might see:

#### ❌ **Error 1: API Connection Failed**
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
https://your-backend.onrender.com/api/health

OR

Access to fetch at 'http://localhost:3000/api/health' blocked by CORS
```

**Cause:** Environment variable `REACT_APP_API_URL` not set in Render
**Solution:** Add it in Render dashboard (see Step 3 below)

---

#### ❌ **Error 2: Module Not Found**
```
Uncaught Error: Cannot find module 'framer-motion'
```

**Cause:** Missing dependencies in build
**Solution:** Rebuild the app

---

#### ❌ **Error 3: Router Error**
```
Error: useRoutes() may be used only in the context of a <Router> component
```

**Cause:** React Router version mismatch
**Solution:** Check package.json

---

#### ❌ **Error 4: CORS Error**
```
Access to fetch at 'https://backend.onrender.com/api/...' from origin 
'https://raindrop-game.onrender.com' has been blocked by CORS policy
```

**Cause:** Backend CORS not configured for frontend URL
**Solution:** Update backend `FRONTEND_URL` environment variable

---

## 📋 Step 2: Check Network Tab

1. In Developer Tools, click **"Network"** tab
2. Refresh the page (`Ctrl+R` or `Cmd+R`)
3. Look at the requests:

### ✅ What You Should See:
```
✓ index.html          200 OK
✓ main.[hash].js      200 OK
✓ main.[hash].css     200 OK
✓ static/...          200 OK
```

### ❌ What's Bad:
```
✗ index.html          404 Not Found  ← Page not deployed correctly
✗ main.js             Failed         ← JavaScript not loading
✗ /api/health         Failed         ← Backend not reachable
```

---

## 📋 Step 3: Verify Render Environment Variables

### Check Frontend Settings:

1. Go to **Render Dashboard** → **raindrop-game** (frontend)
2. Click **"Environment"** in left sidebar
3. **Verify this variable exists:**

```
REACT_APP_API_URL = https://your-backend.onrender.com/api
```

**⚠️ CRITICAL:** 
- Must start with `REACT_APP_`
- Must include `/api` at the end
- Must be your actual backend URL (not localhost!)

### If Missing or Wrong:

1. Click **"Add Environment Variable"**
2. Key: `REACT_APP_API_URL`
3. Value: `https://your-backend-url.onrender.com/api`
4. Click **"Save"**
5. **Rebuild** the app (it won't update automatically!)

---

## 📋 Step 4: Check Build Logs

1. **Render Dashboard** → **raindrop-game**
2. Click **"Logs"** or **"Events"**
3. Look for the latest deployment

### ✅ Good Build:
```
==> Cloning from https://github.com/techflavors/raindrop-education-game...
==> Running build command: npm install && npm run build
✓ Dependencies installed
✓ Creating optimized production build...
✓ Compiled successfully!
✓ Build complete
==> Uploading build...
==> Build successful!
```

### ❌ Bad Build:
```
Error: ENOENT: no such file or directory
Failed to compile
Build failed
```

---

## 📋 Step 5: Quick Diagnostic Script

**Copy this into your browser console:**

```javascript
// Paste this in the Console tab of Developer Tools
console.log('=== RAINDROP DEBUG ===');
console.log('1. Current URL:', window.location.href);
console.log('2. React loaded:', typeof React !== 'undefined');
console.log('3. App rendered:', document.querySelector('.App') !== null);
console.log('4. Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  API_URL: process.env.REACT_APP_API_URL
});

// Test API connection
fetch('https://your-backend.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log('5. Backend API:', '✅ Connected', d))
  .catch(e => console.error('5. Backend API:', '❌ Failed', e.message));
```

**Replace `your-backend.onrender.com` with your actual backend URL!**

---

## 🎯 Common Issues & Solutions

### Issue 1: "Blank page, no errors in console"

**Diagnosis Steps:**
1. View page source (`Ctrl+U` or right-click → View Source)
2. Check if you see React app code or just empty HTML

**If empty HTML:**
- Build didn't complete correctly
- Rebuild the app in Render

**If you see app code but blank:**
- JavaScript failed to execute
- Check Console for errors

---

### Issue 2: "API calls failing to localhost:3000"

**Problem:** Environment variable not set or not rebuilding

**Solution:**
```bash
# In Render Dashboard:
1. Add: REACT_APP_API_URL = https://your-backend.onrender.com/api
2. Manual Deploy → Deploy latest commit
3. Wait for rebuild (2-3 minutes)
4. Refresh browser
```

---

### Issue 3: "CORS errors"

**Problem:** Backend not allowing frontend domain

**Solution - Update Backend:**
```bash
# In Backend Render service:
1. Environment → Edit
2. Set: FRONTEND_URL = https://raindrop-game.onrender.com
3. Set: CLIENT_URL = https://raindrop-game.onrender.com
4. Save (auto-redeploys)
```

---

### Issue 4: "React Router 404s"

**Problem:** Redirects/Rewrites not configured

**Solution:**
```bash
# In Render Dashboard → Frontend:
1. Redirects/Rewrites tab
2. Add Rule:
   Source: /*
   Destination: /index.html
   Action: Rewrite
3. Save
```

---

## 📱 Quick Checklist

Run through this checklist:

### Frontend Deployment:
- [ ] Build completed successfully (check Render logs)
- [ ] Environment variable set: `REACT_APP_API_URL`
- [ ] Redirect rule added: `/*` → `/index.html` (Rewrite)
- [ ] Latest code deployed (check git commit hash)

### Backend Deployment:
- [ ] Backend service is running (not sleeping)
- [ ] Environment variables set: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`
- [ ] CORS configured with frontend URL
- [ ] Health check endpoint works: `/api/health`

### Testing:
- [ ] Visit frontend URL directly
- [ ] Check browser Console for errors
- [ ] Check Network tab for failed requests
- [ ] Test API endpoint directly in browser
- [ ] Try in incognito/private window (clears cache)

---

## 🔧 Emergency Fix: Test Backend First

Before debugging frontend, verify backend is working:

**Test this URL in your browser:**
```
https://your-backend.onrender.com/api/health
```

**Should return:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-26T...",
  "uptime": 123.456
}
```

**If you get error:**
- Backend is sleeping (wait 30 seconds for wake-up)
- Backend failed to deploy
- Backend environment variables wrong

---

## 📞 Next Steps

**Please do this and report back:**

1. **Open** `https://raindrop-game.onrender.com` in browser
2. **Press F12** to open Developer Tools
3. **Go to Console tab**
4. **Take a screenshot** of any errors
5. **Copy/paste** the errors here

**Also check:**
- What do you see in the Network tab?
- What's in View Source (`Ctrl+U`)?
- Is the backend URL accessible?

---

## 🎯 Most Likely Causes (in order):

1. **Environment variable not set** (90% chance)
   - `REACT_APP_API_URL` missing in Render dashboard
   - App trying to connect to localhost instead of production

2. **Backend not running** (5% chance)
   - Backend sleeping (free tier)
   - First load takes 30-50 seconds

3. **CORS error** (3% chance)
   - Backend `FRONTEND_URL` not set correctly

4. **Build failed** (2% chance)
   - Check Render build logs

**Check #1 first!** 90% of blank pages are due to missing environment variables.

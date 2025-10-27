# MongoDB Database Status Report
**Generated:** October 26, 2025  
**Database:** raindrop-battle  
**MongoDB Version:** 8.0.13

---

## 📊 Collections Overview

| # | Collection Name | Documents | Status | Purpose |
|---|----------------|-----------|--------|---------|
| 1 | **users** | 0 | ✅ Ready | Stores student, teacher, and admin accounts |
| 2 | **questions** | 0 | ✅ Ready | Question bank for tests and challenges |
| 3 | **tests** | 0 | ✅ Ready | Teacher-created test assignments |
| 4 | **assignments** | 0 | ✅ Ready | Student test assignments |
| 5 | **testattempts** | 0 | ✅ Ready | Student test submissions and raindrop tracking |
| 6 | **challenges** | 0 | 🆕 Ready | Student-to-student battle challenges |
| 7 | **battles** | 0 | 🆕 Ready | Real-time battle sessions |

**Total Collections:** 7  
**Total Documents:** 0 (Fresh database - no data yet)

---

## 🗂️ Collection Details

### 1. **users**
- **Purpose:** Authentication and user management
- **Roles:** student, teacher, admin
- **Key Fields:** username, email, password (hashed), profile, role
- **Relationships:** Referenced by tests, assignments, challenges

### 2. **questions**
- **Purpose:** Question bank for assessments
- **Fields:** questionText, options, correctAnswer, difficulty, subject, grade
- **Difficulties:** easy, medium, hard, advanced, expert
- **Used By:** Tests and battle challenges

### 3. **tests**
- **Purpose:** Teacher-created assessments
- **Fields:** title, subject, grade, questions[], timeLimit
- **Created By:** Teachers
- **Assigned To:** Students via assignments

### 4. **assignments**
- **Purpose:** Links tests to students
- **Fields:** testId, studentId, dueDate, status
- **Status:** pending, completed, graded

### 5. **testattempts**
- **Purpose:** Student test submissions
- **Fields:** studentId, testId, answers[], score, raindropsEarned
- **Raindrop Logic:** Based on speed and difficulty
- **Used For:** Progress tracking and leaderboards

### 6. **challenges** 🆕
- **Purpose:** Student battle invitations
- **Fields:** challenger, challenged, questions[], wagerRaindrops, status
- **Status:** pending, accepted, declined, completed, expired
- **Difficulty Levels:** advanced (25+ raindrops), expert (75+ raindrops)

### 7. **battles** 🆕
- **Purpose:** Real-time battle sessions
- **Fields:** challengeId, participants[], status, winner
- **Features:** Live scoring, answer tracking, time tracking
- **Events:** Battle start, answers submitted, completion

---

## 🔐 Database Configuration

**Connection String:** `mongodb://localhost:27017/raindrop-battle`  
**Data Directory:** `/usr/local/var/mongodb`  
**Log Directory:** `/usr/local/var/log/mongodb`  
**Service Status:** Running (PID: varies)

---

## 🚀 Getting Started

### To populate the database with sample data:

1. **Create Admin User:**
   ```bash
   # Use the backend API or create via database-setup.js
   cd backend
   node database-setup.js
   ```

2. **Add Sample Questions:**
   ```javascript
   // Use the question generator service
   // POST /api/questions/generate
   ```

3. **Create Teachers & Students:**
   ```javascript
   // Use admin dashboard user creation
   // POST /api/auth/register
   ```

### To check database status:
```bash
# List collections
node -e "require('mongoose').connect('mongodb://localhost:27017/raindrop-battle').then(async () => { const db = require('mongoose').connection.db; const cols = await db.listCollections().toArray(); cols.forEach(c => console.log(c.name)); process.exit(0); });"

# Count documents
node -e "require('mongoose').connect('mongodb://localhost:27017/raindrop-battle').then(async () => { const db = require('mongoose').connection.db; for (const c of await db.listCollections().toArray()) { console.log(c.name + ':', await db.collection(c.name).countDocuments()); } process.exit(0); });"
```

---

## 📈 Expected Data Flow

```
1. Admin creates → Teachers & Students (users collection)
2. Teachers create → Questions (questions collection)
3. Teachers create → Tests (tests collection)
4. Tests assigned to → Students (assignments collection)
5. Students complete → Test Attempts (testattempts collection)
6. Students earn → Raindrops (tracked in testattempts)
7. Students send → Challenges (challenges collection)
8. Challenges accepted → Battles (battles collection)
9. Battles complete → Update challenge & raindrop totals
```

---

## 🎮 Battle System Features

### Challenge Unlock Progression:
- **0-24 raindrops:** Practice tests only
- **25+ raindrops:** 🔓 Advanced challenges unlocked
- **75+ raindrops:** 🔓 Expert challenges unlocked

### Battle Rewards:
- **Correct answer:** 1-5 raindrops (based on difficulty + speed)
- **Battle win:** Additional raindrops from wager
- **Level progression:** Unlock harder challenges

---

## 🔧 Maintenance Commands

### Start MongoDB:
```bash
mongod --dbpath /usr/local/var/mongodb --logpath /usr/local/var/log/mongodb/mongo.log --fork
```

### Stop MongoDB:
```bash
pkill mongod
```

### Backup Database:
```bash
mongodump --db raindrop-battle --out /path/to/backup
```

### Restore Database:
```bash
mongorestore --db raindrop-battle /path/to/backup/raindrop-battle
```

---

## 📝 Notes

- All collections are indexed for optimal performance
- User passwords are hashed using bcrypt
- Challenge unlock requirements are enforced at API level
- Real-time battle updates use polling (WebSocket integration pending)
- Raindrop calculations include time bonuses for quick answers

---

**Last Updated:** October 26, 2025  
**Status:** ✅ Database ready for application use

# Database Setup Scripts

This directory contains comprehensive Node.js scripts for setting up and managing the Raindrop Education Game database.

## 📁 Scripts Overview

### 1. `database-setup.js` - Main Setup Script
Complete database initialization script that creates all necessary data.

**Features:**
- Creates admin, teachers, and students
- Generates comprehensive math questions for grades 3-6
- Sets up sample assignments
- Supports command-line options for customization

**Usage:**
```bash
# Full setup (creates everything)
node database-setup.js

# Clear existing data and setup fresh
node database-setup.js --reset

# Setup only for specific grade
node database-setup.js --grade=5

# Setup for specific subject
node database-setup.js --subject=Science

# Get help
node database-setup.js --help
```

### 2. `database-utils.js` - Utility Operations
Quick utility script for common database operations.

**Features:**
- Create additional students, teachers, or questions
- Reset passwords
- List all users
- Create data backups

**Usage:**
```bash
# Create 10 students for grade 7
node database-utils.js create-students 7 10

# Create 15 advanced Math questions for grade 5
node database-utils.js create-questions 5 Math advanced 15

# Create a new teacher
node database-utils.js create-teacher teacher4 "4,5,6" "Math,Science"

# Reset all passwords to default
node database-utils.js reset-passwords

# List all users by role
node database-utils.js list-users

# Create backup of current data
node database-utils.js backup
```

## 🔑 Default Login Credentials

After running the setup scripts, you can log in with these credentials:

### Admin
- **Username:** `admin`
- **Password:** `admin123`

### Teachers
- **Username:** `teacher1`, `teacher2`, `teacher3`
- **Password:** `password123`
- **Teacher1:** Teaches Math & Science for grades 3-5
- **Teacher2:** Teaches English & History for grades 4-6
- **Teacher3:** Teaches Science & Math for grades 3-6

### Students
- **Username:** `student_[grade]_[number]` (e.g., `student_5_1`)
- **Password:** `student123`
- **Default:** 5 students per grade for grades 3-6

## 📊 Data Structure

### Questions Database
- **Grades:** 3, 4, 5, 6
- **Subjects:** Math (primary), Science, English, History
- **Difficulty Levels:** easy, beginner, medium, advanced, expert
- **Questions per Level:** 20 questions per difficulty level
- **Point System:** 
  - Easy: 5 points
  - Beginner: 10 points
  - Medium: 15 points
  - Advanced: 20 points
  - Expert: 25 points

### Users
- **1 Admin:** System administrator
- **3 Teachers:** With different grade and subject assignments
- **20 Students:** 5 students each for grades 3-6

### Assignments
- **Regular Tests:** 10 questions from easy/beginner/medium levels
- **Challenge Tests:** 10 questions from advanced level
- **Auto-assigned:** To all students in respective grades

## 🛠️ Prerequisites

Before running these scripts, ensure you have:

1. **MongoDB** running locally on `mongodb://localhost:27017`
2. **Node.js** and npm installed
3. **Dependencies** installed:
   ```bash
   cd backend
   npm install
   ```

## 🚀 Quick Start

1. **Start MongoDB:**
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community
   
   # Or manually
   mongod
   ```

2. **Run complete setup:**
   ```bash
   cd backend
   node database-setup.js --reset
   ```

3. **Verify setup:**
   ```bash
   node database-utils.js list-users
   ```

4. **Start the application:**
   ```bash
   # In backend directory
   npm start
   
   # In frontend directory (new terminal)
   cd ../frontend
   npm start
   ```

## 🔄 Common Operations

### Adding More Students
```bash
# Add 5 more students to grade 5
node database-utils.js create-students 5 5
```

### Creating Custom Questions
```bash
# Add 10 expert Science questions for grade 6
node database-utils.js create-questions 6 Science expert 10
```

### Creating New Teachers
```bash
# Create a specialized teacher
node database-utils.js create-teacher math_specialist "3,4,5" "Math"
```

### Backup Before Changes
```bash
# Always backup before major changes
node database-utils.js backup
```

## 📋 Database Collections

The scripts create and manage these MongoDB collections:

- **users** - Admin, teachers, and students
- **questions** - All quiz questions with answers
- **assignments** - Test assignments linking questions to students

## 🔧 Troubleshooting

### Connection Issues
- Ensure MongoDB is running on port 27017
- Check if the `raindrop-battle` database exists
- Verify network connectivity

### Permission Errors
- Make sure scripts are executable: `chmod +x database-setup.js`
- Check file permissions in the backend directory

### Data Issues
- Use `--reset` flag to start fresh
- Check the console output for specific error messages
- Use `list-users` to verify data creation

## 📝 Notes

- Scripts are idempotent - safe to run multiple times
- Always backup before making significant changes
- Student usernames follow pattern: `student_[grade]_[number]`
- Teacher assignments are automatically managed
- Questions include proper validation and point systems

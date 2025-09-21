#!/usr/bin/env node

/**
 * Raindrop Education Game - Database Utilities
 * 
 * Quick utility scripts for common database operations
 * 
 * Usage: node database-utils.js <command> [options]
 * 
 * Commands:
 *   create-students <grade> <count>  : Create students for specific grade
 *   create-questions <grade> <subject> <difficulty> <count> : Create questions
 *   create-teacher <username> <grades> <subjects> : Create a teacher
 *   reset-passwords : Reset all passwords to default
 *   list-users : List all users by role
 *   backup : Create a backup of current data
 *   restore : Restore from backup
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;

// Import models
const User = require('./src/models/User');
const Question = require('./src/models/Question');
const Assignment = require('./src/models/Assignment');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/raindrop-battle', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Create students for a specific grade
const createStudentsForGrade = async (grade, count = 5) => {
  const studentNames = [
    ['Alex', 'Anderson'], ['Bella', 'Brown'], ['Charlie', 'Chen'], ['Diana', 'Davis'], ['Ethan', 'Evans'],
    ['Fiona', 'Foster'], ['Gabriel', 'Garcia'], ['Hannah', 'Harris'], ['Isaac', 'Ibrahim'], ['Julia', 'Jones'],
    ['Kevin', 'Kim'], ['Luna', 'Lopez'], ['Mason', 'Miller'], ['Nina', 'Nguyen'], ['Oscar', 'O\'Connor'],
    ['Priya', 'Patel'], ['Quinn', 'Quinn'], ['Ruby', 'Rodriguez'], ['Samuel', 'Smith'], ['Tara', 'Taylor'],
    ['Uma', 'Upton'], ['Victor', 'Vega'], ['Willow', 'Wang'], ['Xavier', 'Xu'], ['Yara', 'Young'], ['Zoe', 'Zhang']
  ];

  try {
    const existingCount = await User.countDocuments({ 'profile.grade': grade, role: 'student' });
    const students = [];

    for (let i = 1; i <= count; i++) {
      const nameIndex = (existingCount + i - 1) % studentNames.length;
      const [firstName, lastName] = studentNames[nameIndex];
      
      const student = new User({
        username: `student_${grade}_${existingCount + i}`,
        password: 'student123',
        role: 'student',
        profile: {
          firstName,
          lastName,
          grade: grade
        }
      });

      await student.save();
      students.push(student);
    }

    console.log(`✅ Created ${count} students for grade ${grade}`);
    return students;
  } catch (error) {
    console.error('❌ Error creating students:', error.message);
    throw error;
  }
};

// Create questions for specific criteria
const createQuestionsForCriteria = async (grade, subject, difficulty, count = 10) => {
  const teacher1 = await User.findOne({ username: 'teacher1' });
  if (!teacher1) {
    throw new Error('Teacher1 not found. Please run main setup first.');
  }

  const questionTemplates = {
    Math: [
      { q: `What is the result of this ${difficulty} math problem?`, answers: ["Answer A", "Answer B", "Answer C", "Answer D"], correct: 0 },
      { q: `Solve this ${difficulty} equation for grade ${grade}`, answers: ["Solution 1", "Solution 2", "Solution 3", "Solution 4"], correct: 0 },
      { q: `Calculate the ${difficulty} expression`, answers: ["Result A", "Result B", "Result C", "Result D"], correct: 0 },
    ],
    Science: [
      { q: `What is this ${difficulty} science concept for grade ${grade}?`, answers: ["Concept A", "Concept B", "Concept C", "Concept D"], correct: 0 },
      { q: `Identify the ${difficulty} scientific principle`, answers: ["Principle A", "Principle B", "Principle C", "Principle D"], correct: 0 },
    ],
    English: [
      { q: `Choose the correct ${difficulty} grammar rule for grade ${grade}`, answers: ["Rule A", "Rule B", "Rule C", "Rule D"], correct: 0 },
      { q: `Select the ${difficulty} vocabulary word meaning`, answers: ["Meaning A", "Meaning B", "Meaning C", "Meaning D"], correct: 0 },
    ]
  };

  const templates = questionTemplates[subject] || questionTemplates.Math;
  const questions = [];

  try {
    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      
      const question = new Question({
        teacherId: teacher1._id,
        grade: grade,
        subject: subject,
        questionText: `${template.q} (Question ${i + 1})`,
        questionType: 'multiple-choice',
        difficulty: difficulty,
        answers: template.answers.map((answer, index) => ({
          text: answer,
          isCorrect: index === template.correct,
          points: getPointsForDifficulty(difficulty)
        })),
        basePoints: getPointsForDifficulty(difficulty),
        tags: [difficulty, subject.toLowerCase(), `grade-${grade}`],
        generatedByAI: false,
        isActive: true
      });

      await question.save();
      questions.push(question);
    }

    console.log(`✅ Created ${count} ${difficulty} ${subject} questions for grade ${grade}`);
    return questions;
  } catch (error) {
    console.error('❌ Error creating questions:', error.message);
    throw error;
  }
};

// Helper function for points
const getPointsForDifficulty = (difficulty) => {
  const pointMap = {
    easy: 5,
    beginner: 10,
    medium: 15,
    advanced: 20,
    expert: 25
  };
  return pointMap[difficulty] || 10;
};

// Create a new teacher
const createTeacher = async (username, assignedGrades = [], subjects = []) => {
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new Error(`Username ${username} already exists`);
    }

    const teacher = new User({
      username,
      password: 'password123',
      role: 'teacher',
      profile: {
        firstName: username.charAt(0).toUpperCase() + username.slice(1),
        lastName: 'Teacher',
        assignedGrades: assignedGrades,
        subjects: subjects,
        assignedStudents: []
      }
    });

    await teacher.save();
    console.log(`✅ Created teacher: ${username}`);
    return teacher;
  } catch (error) {
    console.error('❌ Error creating teacher:', error.message);
    throw error;
  }
};

// Reset all passwords to default
const resetPasswords = async () => {
  try {
    const users = await User.find({});
    let resetCount = 0;

    for (const user of users) {
      if (user.role === 'admin') {
        user.password = 'admin123';
      } else if (user.role === 'teacher') {
        user.password = 'password123';
      } else if (user.role === 'student') {
        user.password = 'student123';
      }
      await user.save();
      resetCount++;
    }

    console.log(`✅ Reset passwords for ${resetCount} users`);
  } catch (error) {
    console.error('❌ Error resetting passwords:', error.message);
    throw error;
  }
};

// List all users by role
const listUsers = async () => {
  try {
    const users = await User.find({}).select('username role profile.firstName profile.lastName profile.grade profile.assignedGrades profile.subjects');
    
    const usersByRole = {
      admin: [],
      teacher: [],
      student: []
    };

    users.forEach(user => {
      usersByRole[user.role].push(user);
    });

    console.log('\n👥 Users by Role:\n');
    
    Object.keys(usersByRole).forEach(role => {
      console.log(`${role.toUpperCase()}S (${usersByRole[role].length}):`);
      usersByRole[role].forEach(user => {
        let info = `  • ${user.username} - ${user.profile.firstName} ${user.profile.lastName}`;
        if (user.role === 'student' && user.profile.grade) {
          info += ` (Grade ${user.profile.grade})`;
        }
        if (user.role === 'teacher') {
          info += ` (Grades: ${user.profile.assignedGrades?.join(', ') || 'None'}, Subjects: ${user.profile.subjects?.join(', ') || 'None'})`;
        }
        console.log(info);
      });
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    throw error;
  }
};

// Create backup of current data
const createBackup = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backups/${timestamp}`;
    
    // Create backup directory
    await fs.mkdir('./backups', { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });

    // Export collections
    const users = await User.find({});
    const questions = await Question.find({});
    const assignments = await Assignment.find({});

    await fs.writeFile(`${backupDir}/users.json`, JSON.stringify(users, null, 2));
    await fs.writeFile(`${backupDir}/questions.json`, JSON.stringify(questions, null, 2));
    await fs.writeFile(`${backupDir}/assignments.json`, JSON.stringify(assignments, null, 2));

    console.log(`✅ Backup created: ${backupDir}`);
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Questions: ${questions.length}`);
    console.log(`   • Assignments: ${assignments.length}`);
  } catch (error) {
    console.error('❌ Error creating backup:', error.message);
    throw error;
  }
};

// Command line interface
const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
Raindrop Education Game - Database Utilities

Usage: node database-utils.js <command> [options]

Commands:
  create-students <grade> [count]           : Create students for specific grade (default count: 5)
  create-questions <grade> <subject> <difficulty> [count] : Create questions (default count: 10)
  create-teacher <username> <grades> <subjects> : Create a teacher (comma-separated lists)
  reset-passwords                           : Reset all passwords to default
  list-users                               : List all users by role
  backup                                   : Create a backup of current data

Examples:
  node database-utils.js create-students 7 10
  node database-utils.js create-questions 5 Math advanced 15
  node database-utils.js create-teacher teacher4 "4,5,6" "Math,Science"
  node database-utils.js list-users
    `);
    process.exit(0);
  }

  await connectDB();

  try {
    switch (command) {
      case 'create-students':
        const grade = args[0];
        const count = parseInt(args[1]) || 5;
        if (!grade) throw new Error('Grade is required');
        await createStudentsForGrade(grade, count);
        break;

      case 'create-questions':
        const [qGrade, subject, difficulty] = args;
        const qCount = parseInt(args[3]) || 10;
        if (!qGrade || !subject || !difficulty) {
          throw new Error('Grade, subject, and difficulty are required');
        }
        await createQuestionsForCriteria(qGrade, subject, difficulty, qCount);
        break;

      case 'create-teacher':
        const [username, gradesStr, subjectsStr] = args;
        if (!username) throw new Error('Username is required');
        const grades = gradesStr ? gradesStr.split(',').map(g => g.trim()) : [];
        const subjects = subjectsStr ? subjectsStr.split(',').map(s => s.trim()) : [];
        await createTeacher(username, grades, subjects);
        break;

      case 'reset-passwords':
        await resetPasswords();
        break;

      case 'list-users':
        await listUsers();
        break;

      case 'backup':
        await createBackup();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }

  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createStudentsForGrade,
  createQuestionsForCriteria,
  createTeacher,
  resetPasswords,
  listUsers,
  createBackup
};

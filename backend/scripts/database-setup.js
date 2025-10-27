#!/usr/bin/env node

/**
 * Raindrop Education Game - Database Setup Script
 * 
 * This script creates all necessary data for the raindrop education game:
 * - Admin users
 * - Teachers with assigned grades and subjects
 * - Students for multiple grades
 * - Math questions for all difficulty levels
 * - Basic assignments
 * 
 * Usage: node database-setup.js [options]
 * Options:
 *   --reset     : Clear all existing data before creating new data
 *   --grade=5   : Create data for specific grade (default: creates for grades 3-6)
 *   --subject=Math : Create questions for specific subject (default: Math)
 *   --help      : Show this help message
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./src/models/User');
const Question = require('./src/models/Question');
const Assignment = require('./src/models/Assignment');

// Configuration
const CONFIG = {
  grades: ['3', '4', '5', '6'],
  subjects: ['Math', 'Science', 'English', 'History'],
  difficulties: ['easy', 'beginner', 'medium', 'advanced', 'expert'],
  questionsPerDifficulty: 20,
  studentsPerGrade: 5
};

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

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Question.deleteMany({});
    await Assignment.deleteMany({});
    console.log('🗑️  Database cleared');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    throw error;
  }
};

// Create admin user
const createAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('👨‍💼 Admin user already exists');
      return adminExists;
    }

    const admin = new User({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      profile: {
        firstName: 'System',
        lastName: 'Administrator'
      }
    });

    await admin.save();
    console.log('👨‍💼 Admin user created (username: admin, password: admin123)');
    return admin;
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    throw error;
  }
};

// Create teachers
const createTeachers = async () => {
  const teachers = [];
  
  try {
    // Teacher 1 - Math specialist for grades 3-5
    const teacher1 = new User({
      username: 'teacher1',
      password: 'password123',
      role: 'teacher',
      profile: {
        firstName: 'Emma',
        lastName: 'Johnson',
        assignedGrades: ['3', '4', '5'],
        subjects: ['Math', 'Science'],
        assignedStudents: []
      }
    });

    // Teacher 2 - English specialist for grades 4-6
    const teacher2 = new User({
      username: 'teacher2',
      password: 'password123',
      role: 'teacher',
      profile: {
        firstName: 'Michael',
        lastName: 'Davis',
        assignedGrades: ['4', '5', '6'],
        subjects: ['English', 'History'],
        assignedStudents: []
      }
    });

    // Teacher 3 - Science specialist for all grades
    const teacher3 = new User({
      username: 'teacher3',
      password: 'password123',
      role: 'teacher',
      profile: {
        firstName: 'Sarah',
        lastName: 'Wilson',
        assignedGrades: ['3', '4', '5', '6'],
        subjects: ['Science', 'Math'],
        assignedStudents: []
      }
    });

    await teacher1.save();
    await teacher2.save();
    await teacher3.save();

    teachers.push(teacher1, teacher2, teacher3);
    console.log('👩‍🏫 Created 3 teachers (teacher1, teacher2, teacher3)');
    return teachers;
  } catch (error) {
    console.error('❌ Error creating teachers:', error.message);
    throw error;
  }
};

// Create students
const createStudents = async (teachers) => {
  const students = [];
  const studentNames = [
    ['Alex', 'Anderson'], ['Bella', 'Brown'], ['Charlie', 'Chen'], ['Diana', 'Davis'], ['Ethan', 'Evans'],
    ['Fiona', 'Foster'], ['Gabriel', 'Garcia'], ['Hannah', 'Harris'], ['Isaac', 'Ibrahim'], ['Julia', 'Jones'],
    ['Kevin', 'Kim'], ['Luna', 'Lopez'], ['Mason', 'Miller'], ['Nina', 'Nguyen'], ['Oscar', 'O\'Connor'],
    ['Priya', 'Patel'], ['Quinn', 'Quinn'], ['Ruby', 'Rodriguez'], ['Samuel', 'Smith'], ['Tara', 'Taylor']
  ];

  try {
    let nameIndex = 0;
    for (const grade of CONFIG.grades) {
      for (let i = 1; i <= CONFIG.studentsPerGrade; i++) {
        const [firstName, lastName] = studentNames[nameIndex % studentNames.length];
        const student = new User({
          username: `student_${grade}_${i}`,
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
        nameIndex++;
      }
    }

    // Assign students to teachers
    for (const teacher of teachers) {
      const teacherStudents = students.filter(student => 
        teacher.profile.assignedGrades.includes(student.profile.grade)
      );
      teacher.profile.assignedStudents = teacherStudents.map(s => s._id);
      await teacher.save();
    }

    console.log(`👥 Created ${students.length} students across ${CONFIG.grades.length} grades`);
    return students;
  } catch (error) {
    console.error('❌ Error creating students:', error.message);
    throw error;
  }
};

// Math question templates
const getMathQuestions = (grade, difficulty) => {
  const templates = {
    '3': {
      easy: [
        { q: "What is 5 + 3?", answers: ["8", "7", "9", "6"], correct: 0 },
        { q: "What is 10 - 4?", answers: ["6", "5", "7", "4"], correct: 0 },
        { q: "What is 2 × 3?", answers: ["6", "5", "7", "8"], correct: 0 },
        { q: "What is 8 ÷ 2?", answers: ["4", "3", "5", "6"], correct: 0 },
      ],
      beginner: [
        { q: "What is 15 + 27?", answers: ["42", "41", "43", "40"], correct: 0 },
        { q: "What is 50 - 18?", answers: ["32", "31", "33", "30"], correct: 0 },
        { q: "What is 7 × 6?", answers: ["42", "41", "43", "40"], correct: 0 },
        { q: "What is 24 ÷ 3?", answers: ["8", "7", "9", "6"], correct: 0 },
      ],
      medium: [
        { q: "What is 123 + 456?", answers: ["579", "578", "580", "577"], correct: 0 },
        { q: "What is 100 - 37?", answers: ["63", "62", "64", "61"], correct: 0 },
        { q: "What is 12 × 8?", answers: ["96", "95", "97", "94"], correct: 0 },
        { q: "What is 72 ÷ 9?", answers: ["8", "7", "9", "6"], correct: 0 },
      ],
      advanced: [
        { q: "What is the area of a rectangle with length 8 and width 5?", answers: ["40", "39", "41", "38"], correct: 0 },
        { q: "If you have 3 groups of 15 items each, how many items do you have in total?", answers: ["45", "44", "46", "43"], correct: 0 },
        { q: "What is 144 ÷ 12?", answers: ["12", "11", "13", "10"], correct: 0 },
        { q: "Round 267 to the nearest hundred.", answers: ["300", "200", "270", "260"], correct: 0 },
      ],
      expert: [
        { q: "What is 15 × 13?", answers: ["195", "194", "196", "193"], correct: 0 },
        { q: "A triangle has sides of 3, 4, and 5 units. What is its perimeter?", answers: ["12", "11", "13", "10"], correct: 0 },
        { q: "What is 1000 - 347?", answers: ["653", "652", "654", "651"], correct: 0 },
        { q: "How many minutes are in 2.5 hours?", answers: ["150", "149", "151", "148"], correct: 0 },
      ]
    },
    '4': {
      easy: [
        { q: "What is 15 + 25?", answers: ["40", "39", "41", "38"], correct: 0 },
        { q: "What is 60 - 23?", answers: ["37", "36", "38", "35"], correct: 0 },
        { q: "What is 6 × 7?", answers: ["42", "41", "43", "40"], correct: 0 },
        { q: "What is 35 ÷ 5?", answers: ["7", "6", "8", "5"], correct: 0 },
      ],
      beginner: [
        { q: "What is 234 + 567?", answers: ["801", "800", "802", "799"], correct: 0 },
        { q: "What is 400 - 156?", answers: ["244", "243", "245", "242"], correct: 0 },
        { q: "What is 9 × 8?", answers: ["72", "71", "73", "70"], correct: 0 },
        { q: "What is 96 ÷ 8?", answers: ["12", "11", "13", "10"], correct: 0 },
      ],
      medium: [
        { q: "What is 1,234 + 5,678?", answers: ["6,912", "6,911", "6,913", "6,910"], correct: 0 },
        { q: "What is 1000 - 678?", answers: ["322", "321", "323", "320"], correct: 0 },
        { q: "What is 25 × 16?", answers: ["400", "399", "401", "398"], correct: 0 },
        { q: "What is 144 ÷ 16?", answers: ["9", "8", "10", "7"], correct: 0 },
      ],
      advanced: [
        { q: "What is the area of a square with side length 12?", answers: ["144", "143", "145", "142"], correct: 0 },
        { q: "How many seconds are in 5 minutes?", answers: ["300", "299", "301", "298"], correct: 0 },
        { q: "What is 18 × 15?", answers: ["270", "269", "271", "268"], correct: 0 },
        { q: "If a pizza is cut into 8 equal slices and you eat 3, what fraction did you eat?", answers: ["3/8", "2/8", "4/8", "1/8"], correct: 0 },
      ],
      expert: [
        { q: "What is 237 × 19?", answers: ["4,503", "4,502", "4,504", "4,501"], correct: 0 },
        { q: "A rectangle has a perimeter of 24. If the length is 8, what is the width?", answers: ["4", "3", "5", "2"], correct: 0 },
        { q: "What is 2,500 ÷ 25?", answers: ["100", "99", "101", "98"], correct: 0 },
        { q: "Round 3,847 to the nearest thousand.", answers: ["4,000", "3,000", "3,800", "3,900"], correct: 0 },
      ]
    },
    '5': {
      easy: [
        { q: "What is 45 + 67?", answers: ["112", "111", "113", "110"], correct: 0 },
        { q: "What is 200 - 85?", answers: ["115", "114", "116", "113"], correct: 0 },
        { q: "What is 12 × 9?", answers: ["108", "107", "109", "106"], correct: 0 },
        { q: "What is 84 ÷ 7?", answers: ["12", "11", "13", "10"], correct: 0 },
      ],
      beginner: [
        { q: "What is 456 + 789?", answers: ["1,245", "1,244", "1,246", "1,243"], correct: 0 },
        { q: "What is 1,000 - 234?", answers: ["766", "765", "767", "764"], correct: 0 },
        { q: "What is 15 × 12?", answers: ["180", "179", "181", "178"], correct: 0 },
        { q: "What is 225 ÷ 15?", answers: ["15", "14", "16", "13"], correct: 0 },
      ],
      medium: [
        { q: "What is 2.5 + 3.7?", answers: ["6.2", "6.1", "6.3", "6.0"], correct: 0 },
        { q: "What is 10.8 - 4.3?", answers: ["6.5", "6.4", "6.6", "6.3"], correct: 0 },
        { q: "What is 0.6 × 0.8?", answers: ["0.48", "0.47", "0.49", "0.46"], correct: 0 },
        { q: "What is 3/4 as a decimal?", answers: ["0.75", "0.74", "0.76", "0.73"], correct: 0 },
      ],
      advanced: [
        { q: "What is the volume of a cube with side length 5?", answers: ["125", "124", "126", "123"], correct: 0 },
        { q: "Convert 2.3 meters to centimeters.", answers: ["230", "229", "231", "228"], correct: 0 },
        { q: "What is 7/8 - 3/8?", answers: ["4/8 or 1/2", "3/8", "5/8", "2/8"], correct: 0 },
        { q: "If 4x = 20, what is x?", answers: ["5", "4", "6", "3"], correct: 0 },
      ],
      expert: [
        { q: "What is the area of a triangle with base 10 and height 6?", answers: ["30", "29", "31", "28"], correct: 0 },
        { q: "A car travels 240 miles in 4 hours. What is its average speed?", answers: ["60 mph", "59 mph", "61 mph", "58 mph"], correct: 0 },
        { q: "What is 15% of 200?", answers: ["30", "29", "31", "28"], correct: 0 },
        { q: "What is the least common multiple of 6 and 8?", answers: ["24", "23", "25", "22"], correct: 0 },
      ]
    },
    '6': {
      easy: [
        { q: "What is 89 + 156?", answers: ["245", "244", "246", "243"], correct: 0 },
        { q: "What is 500 - 187?", answers: ["313", "312", "314", "311"], correct: 0 },
        { q: "What is 18 × 11?", answers: ["198", "197", "199", "196"], correct: 0 },
        { q: "What is 144 ÷ 12?", answers: ["12", "11", "13", "10"], correct: 0 },
      ],
      beginner: [
        { q: "What is 1,567 + 2,893?", answers: ["4,460", "4,459", "4,461", "4,458"], correct: 0 },
        { q: "What is 5,000 - 1,738?", answers: ["3,262", "3,261", "3,263", "3,260"], correct: 0 },
        { q: "What is 24 × 15?", answers: ["360", "359", "361", "358"], correct: 0 },
        { q: "What is 420 ÷ 20?", answers: ["21", "20", "22", "19"], correct: 0 },
      ],
      medium: [
        { q: "What is 4.8 + 7.6?", answers: ["12.4", "12.3", "12.5", "12.2"], correct: 0 },
        { q: "What is 15.7 - 8.9?", answers: ["6.8", "6.7", "6.9", "6.6"], correct: 0 },
        { q: "What is 2.5 × 3.6?", answers: ["9", "8.9", "9.1", "8.8"], correct: 0 },
        { q: "What is 5/6 + 1/6?", answers: ["6/6 or 1", "5/6", "7/6", "4/6"], correct: 0 },
      ],
      advanced: [
        { q: "What is the circumference of a circle with radius 7? (Use π ≈ 3.14)", answers: ["43.96", "43.95", "43.97", "43.94"], correct: 0 },
        { q: "Convert 3.5 kilometers to meters.", answers: ["3,500", "3,499", "3,501", "3,498"], correct: 0 },
        { q: "What is 25% of 160?", answers: ["40", "39", "41", "38"], correct: 0 },
        { q: "If 3y + 6 = 21, what is y?", answers: ["5", "4", "6", "3"], correct: 0 },
      ],
      expert: [
        { q: "What is the surface area of a cube with side length 4?", answers: ["96", "95", "97", "94"], correct: 0 },
        { q: "A recipe calls for 2/3 cup of flour. How much flour is needed for 1.5 times the recipe?", answers: ["1 cup", "2/3 cup", "1 1/3 cup", "1/2 cup"], correct: 0 },
        { q: "What is the greatest common factor of 48 and 64?", answers: ["16", "15", "17", "14"], correct: 0 },
        { q: "A train travels 180 km in 2.5 hours. What is its speed in km/h?", answers: ["72", "71", "73", "70"], correct: 0 },
      ]
    }
  };

  return templates[grade]?.[difficulty] || [];
};

// Create questions
const createQuestions = async (teachers, targetGrade = null, targetSubject = 'Math') => {
  const questions = [];
  const grades = targetGrade ? [targetGrade] : CONFIG.grades;
  const teacher1 = teachers.find(t => t.username === 'teacher1');

  try {
    for (const grade of grades) {
      for (const difficulty of CONFIG.difficulties) {
        const questionTemplates = getMathQuestions(grade, difficulty);
        
        for (let i = 0; i < CONFIG.questionsPerDifficulty; i++) {
          const template = questionTemplates[i % questionTemplates.length];
          if (!template) continue;

          const question = new Question({
            teacherId: teacher1._id,
            grade: grade,
            subject: targetSubject,
            questionText: template.q + ` (${difficulty} level)`,
            questionType: 'multiple-choice',
            difficulty: difficulty,
            answers: template.answers.map((answer, index) => ({
              text: answer,
              isCorrect: index === template.correct,
              points: getPointsForDifficulty(difficulty)
            })),
            basePoints: getPointsForDifficulty(difficulty),
            tags: [difficulty, targetSubject.toLowerCase(), `grade-${grade}`],
            generatedByAI: false,
            isActive: true
          });

          await question.save();
          questions.push(question);
        }
      }
    }

    console.log(`📝 Created ${questions.length} ${targetSubject} questions for grade(s): ${grades.join(', ')}`);
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

// Create sample assignments
const createAssignments = async (teachers, students, questions) => {
  const assignments = [];
  const teacher1 = teachers.find(t => t.username === 'teacher1');

  try {
    for (const grade of CONFIG.grades) {
      const gradeStudents = students.filter(s => s.profile.grade === grade);
      const gradeQuestions = questions.filter(q => q.grade === grade);

      if (gradeStudents.length === 0 || gradeQuestions.length === 0) continue;

      // Regular test assignment
      const regularQuestions = gradeQuestions
        .filter(q => ['easy', 'beginner', 'medium'].includes(q.difficulty))
        .slice(0, 10);

      const challengeQuestions = gradeQuestions
        .filter(q => q.difficulty === 'advanced')
        .slice(0, 10);

      const assignment = new Assignment({
        teacherId: teacher1._id,
        title: `Grade ${grade} Math Assessment`,
        description: `Comprehensive math test for grade ${grade} students covering multiple difficulty levels.`,
        type: 'test',
        regularQuestions: regularQuestions.map(q => q._id),
        challengeQuestions: challengeQuestions.map(q => q._id),
        questionIds: [...regularQuestions, ...challengeQuestions].map(q => q._id), // Legacy compatibility
        studentIds: gradeStudents.map(s => s._id),
        grade: grade,
        subject: 'Math',
        isActive: true,
        timeLimit: 45, // 45 minutes
        instructions: 'Answer all questions to the best of your ability. Challenge questions are optional but worth extra points!',
        passingScore: 70
      });

      await assignment.save();
      assignments.push(assignment);
    }

    console.log(`📋 Created ${assignments.length} sample assignments`);
    return assignments;
  } catch (error) {
    console.error('❌ Error creating assignments:', error.message);
    throw error;
  }
};

// Main setup function
const setupDatabase = async (options = {}) => {
  try {
    await connectDB();

    if (options.reset) {
      await clearDatabase();
    }

    console.log('🚀 Starting database setup...\n');

    // Create users
    const admin = await createAdmin();
    const teachers = await createTeachers();
    const students = await createStudents(teachers);

    // Create questions
    const questions = await createQuestions(
      teachers, 
      options.grade, 
      options.subject || 'Math'
    );

    // Create assignments
    const assignments = await createAssignments(teachers, students, questions);

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👨‍💼 Admin: 1 user`);
    console.log(`   👩‍🏫 Teachers: ${teachers.length} users`);
    console.log(`   👥 Students: ${students.length} users`);
    console.log(`   📝 Questions: ${questions.length} questions`);
    console.log(`   📋 Assignments: ${assignments.length} assignments`);

    console.log('\n🔑 Login Credentials:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   Teachers: username=teacher1/teacher2/teacher3, password=password123');
    console.log('   Students: username=student_[grade]_[number], password=student123');

    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Command line interface
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg === '--reset') {
      options.reset = true;
    } else if (arg.startsWith('--grade=')) {
      options.grade = arg.split('=')[1];
    } else if (arg.startsWith('--subject=')) {
      options.subject = arg.split('=')[1];
    } else if (arg === '--help') {
      console.log(`
Raindrop Education Game - Database Setup Script

Usage: node database-setup.js [options]

Options:
  --reset           Clear all existing data before creating new data
  --grade=5         Create data for specific grade (default: creates for grades 3-6)
  --subject=Math    Create questions for specific subject (default: Math)
  --help            Show this help message

Examples:
  node database-setup.js                    # Setup all data
  node database-setup.js --reset            # Clear and setup all data
  node database-setup.js --grade=5          # Setup only grade 5 data
  node database-setup.js --subject=Science  # Setup Science questions
      `);
      process.exit(0);
    }
  }

  return options;
};

// Run the script
if (require.main === module) {
  const options = parseArgs();
  setupDatabase(options);
}

module.exports = {
  setupDatabase,
  connectDB,
  clearDatabase,
  createAdmin,
  createTeachers,
  createStudents,
  createQuestions,
  createAssignments
};

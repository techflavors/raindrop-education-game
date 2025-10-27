const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Assignment = require('../models/Assignment');
const Question = require('../models/Question');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// STUDENT ROUTES - Must come before generic routes to avoid conflicts

// Get tests assigned to a student
router.get('/student-assigned', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const tests = await Test.find({
      assignedStudents: req.user._id,
      isActive: true
    })
    .populate('questions.questionId', 'questionText answers difficulty imageUrl')
    .populate('teacherId', 'profile.firstName profile.lastName')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Error fetching student tests:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Submit test answers
router.post('/submit', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const { testId, answers, timeSpent } = req.body;

    // Get the test
    const test = await Test.findById(testId)
      .populate('questions.questionId', 'questionText answers difficulty');

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Check if student is assigned to this test
    if (!test.assignedStudents.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not assigned to this test' });
    }

    // Check if student has already submitted
    const existingAttempt = await TestAttempt.findOne({
      studentId: req.user._id,
      testId: testId
    });

    if (existingAttempt) {
      return res.status(400).json({ success: false, message: 'Test already submitted' });
    }

    // Calculate score and raindrops
    let correctAnswers = 0;
    let totalQuestions = test.questions.length;
    let raindropsEarned = 0;

    const responses = test.questions.map(questionData => {
      const question = questionData.questionId;
      const studentAnswer = answers[question._id];
      const correctAnswer = question.answers.find(ans => ans.isCorrect);
      const isCorrect = studentAnswer === correctAnswer?.text;
      
      if (isCorrect) {
        correctAnswers++;
        // Award raindrops based on difficulty
        switch (question.difficulty) {
          case 'easy':
          case 'beginner':
            raindropsEarned += 1;
            break;
          case 'medium':
            raindropsEarned += 2;
            break;
          case 'advanced':
            raindropsEarned += 3;
            break;
          case 'expert':
            raindropsEarned += 5;
            break;
        }
      }

      return {
        questionId: question._id,
        selectedAnswer: studentAnswer || '', // Use empty string instead of null/undefined
        correctAnswer: correctAnswer?.text || '',
        isCorrect,
        difficulty: question.difficulty
      };
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // Create test attempt
    const testAttempt = new TestAttempt({
      studentId: req.user._id,
      testId: testId,
      responses,
      score,
      totalRaindrops: raindropsEarned, // Use totalRaindrops field name
      totalTimeSpent: timeSpent,
      submittedAt: new Date(),
      status: 'completed' // Mark as completed
    });

    await testAttempt.save();

    res.json({
      success: true,
      score,
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      totalQuestions,
      raindropsEarned,
      passed: score >= (test.passingScore || 70)
    });

  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// TEACHER/ADMIN ROUTES

// Random question selection algorithm with configurable counts
const selectRandomQuestions = async (teacherId, grade, subject, testConfig) => {
  try {
    const baseQuery = {
      teacherId,
      grade,
      subject,
      isActive: true
    };

    let selectedQuestions = [];
    const { type, regularQuestions = 5, advancedQuestions = 5 } = testConfig;

    if (type === 'mixed') {
      // Select regular questions (easy, beginner, medium)
      if (regularQuestions > 0) {
        const regularDifficulties = ['easy', 'beginner', 'medium'];
        const questionsPerDifficulty = Math.floor(regularQuestions / regularDifficulties.length);
        const remainder = regularQuestions % regularDifficulties.length;
        
        for (let i = 0; i < regularDifficulties.length; i++) {
          const difficulty = regularDifficulties[i];
          const count = questionsPerDifficulty + (i < remainder ? 1 : 0);
          
          if (count > 0) {
            const questions = await Question.find({
              ...baseQuery,
              difficulty
            }).limit(count * 3); // Get more for randomization
            
            const shuffled = questions.sort(() => 0.5 - Math.random());
            selectedQuestions.push(...shuffled.slice(0, count));
          }
        }
      }

      // Select advanced questions (advanced, expert)
      if (advancedQuestions > 0) {
        const advancedDifficulties = ['advanced', 'expert'];
        const questionsPerDifficulty = Math.floor(advancedQuestions / advancedDifficulties.length);
        const remainder = advancedQuestions % advancedDifficulties.length;
        
        for (let i = 0; i < advancedDifficulties.length; i++) {
          const difficulty = advancedDifficulties[i];
          const count = questionsPerDifficulty + (i < remainder ? 1 : 0);
          
          if (count > 0) {
            const questions = await Question.find({
              ...baseQuery,
              difficulty
            }).limit(count * 3);
            
            const shuffled = questions.sort(() => 0.5 - Math.random());
            selectedQuestions.push(...shuffled.slice(0, count));
          }
        }
      }
      
    } else if (type === 'regular-only') {
      // Only select regular questions
      const regularDifficulties = ['easy', 'beginner', 'medium'];
      const questionsPerDifficulty = Math.floor(regularQuestions / regularDifficulties.length);
      const remainder = regularQuestions % regularDifficulties.length;
      
      for (let i = 0; i < regularDifficulties.length; i++) {
        const difficulty = regularDifficulties[i];
        const count = questionsPerDifficulty + (i < remainder ? 1 : 0);
        
        if (count > 0) {
          const questions = await Question.find({
            ...baseQuery,
            difficulty
          }).limit(count * 3);
          
          const shuffled = questions.sort(() => 0.5 - Math.random());
          selectedQuestions.push(...shuffled.slice(0, count));
        }
      }
      
    } else if (type === 'advanced-only') {
      // Only select advanced questions
      const advancedDifficulties = ['advanced', 'expert'];
      const questionsPerDifficulty = Math.floor(advancedQuestions / advancedDifficulties.length);
      const remainder = advancedQuestions % advancedDifficulties.length;
      
      for (let i = 0; i < advancedDifficulties.length; i++) {
        const difficulty = advancedDifficulties[i];
        const count = questionsPerDifficulty + (i < remainder ? 1 : 0);
        
        if (count > 0) {
          const questions = await Question.find({
            ...baseQuery,
            difficulty
          }).limit(count * 3);
          
          const shuffled = questions.sort(() => 0.5 - Math.random());
          selectedQuestions.push(...shuffled.slice(0, count));
        }
      }
    }
    
    // Shuffle final order and return
    return selectedQuestions.sort(() => 0.5 - Math.random());
    
  } catch (error) {
    console.error('Error selecting questions:', error);
    throw error;
  }
};

// Get all tests for a teacher
router.get('/', auth, async (req, res) => {
  try {
    const tests = await Test.find({ teacherId: req.user._id })
      .populate('questions.questionId', 'questionText difficulty subject grade')
      .populate('assignedStudents', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tests',
      error: error.message
    });
  }
});

// Create new test with random question selection
router.post('/create', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      type, // 'mixed', 'regular-only', or 'advanced-only'
      grade,
      subject,
      assignedStudents,
      timeLimit,
      dueDate,
      instructions,
      passingScore,
      regularQuestions = 5,
      advancedQuestions = 5
    } = req.body;

    console.log('=== CREATE TEST REQUEST ===');
    console.log('Request body:', req.body);
    console.log('User:', { id: req.user._id, role: req.user.role });

    // Validate required fields
    if (!title || !type || !grade || !subject || !dueDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: title, type, grade, subject, dueDate' 
      });
    }

    // Create configuration for question selection - now supports both regular and advanced
    const testConfig = {
      type: 'mixed', // We always want mixed questions now
      regularQuestions: parseInt(regularQuestions),
      advancedQuestions: parseInt(advancedQuestions)
    };

    // Calculate total required questions
    const totalRequired = testConfig.regularQuestions + testConfig.advancedQuestions;

    // Select random questions based on configuration
    const selectedQuestions = await selectRandomQuestions(req.user._id, grade, subject, testConfig);
    
    if (selectedQuestions.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: `No questions available for ${grade} ${subject}. Please create questions first.` 
      });
    }

    if (selectedQuestions.length < totalRequired) {
      return res.status(400).json({ 
        success: false,
        message: `Insufficient questions available. Found ${selectedQuestions.length}, need ${totalRequired}.` 
      });
    }

    // Format questions for test
    const testQuestions = selectedQuestions.map((question, index) => ({
      questionId: question._id,
      order: index + 1
    }));

    // Create the test
    const test = new Test({
      teacherId: req.user._id,
      title,
      description,
      type,
      grade,
      subject,
      questions: testQuestions,
      assignedStudents: assignedStudents || [],
      timeLimit: timeLimit || (type === 'challenge' ? 20 : 30), // Challenge tests are shorter
      dueDate: new Date(dueDate),
      instructions,
      passingScore: passingScore || 70,
      challengeSettings: type === 'challenge' ? challengeSettings : undefined
    });

    await test.save();
    
    // Populate the test with question and student details
    const populatedTest = await Test.findById(test._id)
      .populate('questions.questionId', 'questionText difficulty subject grade basePoints')
      .populate('assignedStudents', 'username profile.firstName profile.lastName');

    const questionDistribution = await populatedTest.getQuestionDistribution();

    res.status(201).json({
      success: true,
      test: populatedTest,
      questionDistribution,
      message: 'Test created successfully!'
    });

  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get available questions for test creation preview
router.get('/questions/preview', auth, async (req, res) => {
  try {
    const { grade, subject, type, regularQuestions, advancedQuestions } = req.query;
    
    console.log('=== QUESTIONS PREVIEW REQUEST ===');
    console.log('Query params:', { grade, subject, type, regularQuestions, advancedQuestions });
    console.log('User:', { id: req.user._id, role: req.user.role });
    
    if (!grade || !subject) {
      return res.status(400).json({ 
        success: false,
        message: 'Grade and subject are required' 
      });
    }

    const baseQuery = {
      teacherId: req.user._id,
      grade,
      subject,
      isActive: true
    };

    // Count questions by difficulty levels
    const difficulties = ['easy', 'beginner', 'medium', 'advanced', 'expert'];
    let questionCounts = {};
    
    for (const difficulty of difficulties) {
      const count = await Question.countDocuments({
        ...baseQuery,
        difficulty
      });
      questionCounts[difficulty] = count;
    }

    // Calculate required questions based on test type
    const reqRegular = parseInt(regularQuestions) || 5;
    const reqAdvanced = parseInt(advancedQuestions) || 5;
    
    let canCreateTest = true;
    let issues = [];

    // Always check for both regular and advanced questions (mixed approach)
    const regularAvailable = questionCounts.easy + questionCounts.beginner + questionCounts.medium;
    const advancedAvailable = questionCounts.advanced + questionCounts.expert;
    
    if (regularAvailable < reqRegular) {
      canCreateTest = false;
      issues.push(`Need ${reqRegular} regular questions, but only ${regularAvailable} available`);
    }
    if (advancedAvailable < reqAdvanced) {
      canCreateTest = false;
      issues.push(`Need ${reqAdvanced} advanced questions, but only ${advancedAvailable} available`);
    }

    const totalQuestions = Object.values(questionCounts).reduce((sum, count) => sum + count, 0);
    
    res.json({
      success: true,
      questionCounts,
      totalQuestions,
      canCreateTest,
      issues,
      testConfig: {
        type: 'mixed', // Always mixed now
        regularQuestions: reqRegular,
        advancedQuestions: reqAdvanced,
        totalRequired: reqRegular + reqAdvanced
      },
      recommendation: canCreateTest ? 
        'Question bank has sufficient questions for your test configuration' : 
        'Insufficient questions available. Please reduce question counts or add more questions to your bank.'
    });

  } catch (error) {
    console.error('Error fetching question preview:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get students for assignment
router.get('/students/:grade', auth, async (req, res) => {
  try {
    const { grade } = req.params;
    
    console.log('=== STUDENTS REQUEST ===');
    console.log('Grade:', grade);
    console.log('User:', { id: req.user._id, role: req.user.role });

    // Find students in the specified grade
    const students = await User.find({
      role: 'student',
      'profile.grade': grade
    }).select('username profile.firstName profile.lastName profile.grade');

    res.json({
      success: true,
      students,
      count: students.length
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get teacher's tests (alias for main GET route)
router.get('/teacher-tests', auth, async (req, res) => {
  try {
    const tests = await Test.find({ teacherId: req.user._id })
      .populate('questions.questionId', 'questionText difficulty subject grade')
      .populate('assignedStudents', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Error fetching teacher tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher tests',
      error: error.message
    });
  }
});

// Get teacher dashboard stats
router.get('/teacher-stats', auth, async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // Get teacher's tests
    const tests = await Test.find({ teacherId });
    
    // Get total students across all grades the teacher is assigned to
    const assignedGrades = req.user.profile.assignedGrades || [];
    const totalStudents = await User.countDocuments({
      role: 'student',
      'profile.grade': { $in: assignedGrades }
    });
    
    // Calculate test stats
    const activeTests = tests.filter(test => test.status === 'active').length;
    const draftTests = tests.filter(test => test.status === 'draft').length;
    
    // Get completed test attempts for performance metrics
    const completedAttempts = await TestAttempt.countDocuments({
      testId: { $in: tests.map(test => test._id) },
      isCompleted: true
    });

    res.json({
      success: true,
      overview: {
        totalTests: tests.length,
        activeTests,
        draftTests,
        totalStudents,
        completedAttempts,
        assignedGrades: assignedGrades.length,
        assignedSubjects: req.user.profile.subjects?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher stats',
      error: error.message
    });
  }
});

// Get test details with questions for taking the test
router.get('/:testId', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId)
      .populate('questions.questionId', 'questionText questionType answers difficulty basePoints imageUrl')
      .populate('teacherId', 'profile.firstName profile.lastName');

    if (!test) {
      return res.status(404).json({ 
        success: false,
        message: 'Test not found' 
      });
    }

    // Check if user is authorized to view this test
    const isAssigned = test.assignedStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );
    const isTeacher = test.teacherId._id.toString() === req.user._id.toString();

    if (!isAssigned && !isTeacher && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to access this test' 
      });
    }

    // Check if test is still available
    if (!test.isAvailable() && req.user.role === 'student') {
      return res.status(400).json({ 
        success: false,
        message: 'Test is no longer available' 
      });
    }

    res.json({
      success: true,
      test
    });

  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Update test
router.put('/:testId', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    
    if (!test) {
      return res.status(404).json({ 
        success: false,
        message: 'Test not found' 
      });
    }

    // Check if user owns this test
    if (test.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this test' 
      });
    }

    const allowedUpdates = [
      'title', 'description', 'assignedStudents', 'timeLimit', 
      'dueDate', 'instructions', 'passingScore', 'isActive'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedTest = await Test.findByIdAndUpdate(
      req.params.testId,
      updates,
      { new: true, runValidators: true }
    ).populate('questions.questionId', 'questionText difficulty subject grade')
     .populate('assignedStudents', 'username profile.firstName profile.lastName');

    res.json({
      success: true,
      test: updatedTest,
      message: 'Test updated successfully'
    });

  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Delete test
router.delete('/:testId', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    
    if (!test) {
      return res.status(404).json({ 
        success: false,
        message: 'Test not found' 
      });
    }

    // Check if user owns this test
    if (test.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this test' 
      });
    }

    // Check if there are any test attempts
    const attemptCount = await TestAttempt.countDocuments({ testId: req.params.testId });
    
    if (attemptCount > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete test that has student attempts. Deactivate instead.' 
      });
    }

    await Test.findByIdAndDelete(req.params.testId);
    res.json({ 
      success: true,
      message: 'Test deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get test statistics for teacher
router.get('/:testId/stats', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    
    if (!test) {
      return res.status(404).json({ 
        success: false,
        message: 'Test not found' 
      });
    }

    if (test.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId })
      .populate('studentId', 'username profile.firstName profile.lastName');

    const stats = {
      totalAssigned: test.assignedStudents.length,
      totalAttempts: attempts.length,
      completed: attempts.filter(a => a.status === 'completed').length,
      inProgress: attempts.filter(a => a.status === 'in-progress').length,
      averageScore: 0,
      averageTime: 0,
      topPerformers: [],
      questionAnalysis: {}
    };

    const completedAttempts = attempts.filter(a => a.status === 'completed');
    
    if (completedAttempts.length > 0) {
      stats.averageScore = completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length;
      stats.averageTime = completedAttempts.reduce((sum, a) => sum + a.totalTimeSpent, 0) / completedAttempts.length;
      
      stats.topPerformers = completedAttempts
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(attempt => ({
          student: attempt.studentId,
          score: attempt.score,
          timeSpent: attempt.totalTimeSpent,
          raindrops: attempt.totalRaindrops
        }));
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching test stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Legacy assignment routes for backward compatibility
router.get('/assignments', auth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacherId: req.user._id })
      .populate('questionIds', 'questionText difficulty subject grade')
      .populate('studentIds', 'username profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Create new assignment (legacy)
router.post('/assignments', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      questionIds,
      studentIds,
      grade,
      subject,
      dueDate,
      timeLimit,
      instructions,
      passingScore
    } = req.body;

    const assignment = new Assignment({
      teacherId: req.user._id,
      title,
      description,
      questionIds,
      studentIds,
      grade,
      subject,
      dueDate,
      timeLimit,
      instructions,
      passingScore
    });

    await assignment.save();
    
    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('questionIds', 'questionText difficulty subject grade')
      .populate('studentIds', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      assignment: populatedAssignment,
      message: 'Assignment created successfully'
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Schedule a test (update start date and status)
router.put('/:testId/schedule', auth, async (req, res) => {
  try {
    const { testId } = req.params;
    const { startDate, dueDate, instructions, status } = req.body;

    const test = await Test.findOne({ _id: testId, teacherId: req.user._id });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    test.startDate = startDate ? new Date(startDate) : test.startDate;
    test.dueDate = dueDate ? new Date(dueDate) : test.dueDate;
    test.instructions = instructions || test.instructions;
    test.status = status || 'scheduled';

    await test.save();

    const populatedTest = await Test.findById(test._id)
      .populate('questions.questionId', 'questionText difficulty subject grade')
      .populate('assignedStudents', 'username profile.firstName profile.lastName');

    res.json({
      success: true,
      test: populatedTest,
      message: 'Test scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling test:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Duplicate a test
router.post('/:testId/duplicate', auth, async (req, res) => {
  try {
    const { testId } = req.params;
    
    const originalTest = await Test.findOne({ _id: testId, teacherId: req.user._id });
    if (!originalTest) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const duplicatedTest = new Test({
      teacherId: originalTest.teacherId,
      title: `${originalTest.title} (Copy)`,
      description: originalTest.description,
      type: originalTest.type,
      grade: originalTest.grade,
      subject: originalTest.subject,
      questions: originalTest.questions,
      assignedStudents: [], // Don't copy student assignments
      timeLimit: originalTest.timeLimit,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      instructions: originalTest.instructions,
      passingScore: originalTest.passingScore,
      challengeSettings: originalTest.challengeSettings,
      status: 'draft'
    });

    await duplicatedTest.save();

    const populatedTest = await Test.findById(duplicatedTest._id)
      .populate('questions.questionId', 'questionText difficulty subject grade')
      .populate('assignedStudents', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      test: populatedTest,
      message: 'Test duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating test:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Bulk actions for tests
router.post('/bulk-action', auth, async (req, res) => {
  try {
    const { action, testIds } = req.body;

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Test IDs are required' });
    }

    let result;
    switch (action) {
      case 'delete':
        result = await Test.deleteMany({ 
          _id: { $in: testIds }, 
          teacherId: req.user._id,
          status: { $in: ['draft', 'archived'] } // Only allow deletion of draft or archived tests
        });
        break;
      case 'archive':
        result = await Test.updateMany(
          { _id: { $in: testIds }, teacherId: req.user._id },
          { status: 'archived' }
        );
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    res.json({
      success: true,
      message: `Successfully ${action}d ${result.modifiedCount || result.deletedCount} tests`,
      affected: result.modifiedCount || result.deletedCount
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

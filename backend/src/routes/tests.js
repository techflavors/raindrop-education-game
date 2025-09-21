const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Question = require('../models/Question');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get all tests for a teacher
router.get('/', auth, async (req, res) => {
  try {
    const tests = await Assignment.find({ 
      teacherId: req.user._id,
      type: 'test'
    })
    .populate('regularQuestions', 'questionText subject grade difficulty')
    .populate('challengeQuestions', 'questionText subject grade difficulty')
    .populate('studentIds', 'username profile.firstName profile.lastName')
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

// Get questions for test creation (separated by difficulty)
router.get('/questions/:grade/:subject', auth, async (req, res) => {
  try {
    const { grade, subject } = req.params;
    
    console.log('=== QUESTIONS API CALLED ===');
    console.log('Request params:', { grade, subject });
    console.log('User:', { id: req.user._id, role: req.user.role, username: req.user.username });
    
    // Get regular questions (easy, beginner, medium, advanced)
    const regularQuestions = await Question.find({
      grade,
      subject,
      difficulty: { $in: ['easy', 'beginner', 'medium', 'advanced'] },
      isActive: { $ne: false }
    }).select('questionText difficulty answers').sort({ difficulty: 1, createdAt: -1 });

    // Get challenge questions (expert level)
    const challengeQuestions = await Question.find({
      grade,
      subject,
      difficulty: 'expert',
      isActive: { $ne: false }
    }).select('questionText difficulty answers').sort({ createdAt: -1 });

    console.log('Database query results:');
    console.log('- Regular questions found:', regularQuestions.length);
    console.log('- Challenge questions found:', challengeQuestions.length);
    
    if (regularQuestions.length > 0) {
      console.log('Sample regular question:', {
        id: regularQuestions[0]._id,
        text: regularQuestions[0].questionText,
        difficulty: regularQuestions[0].difficulty
      });
    }
    
    if (challengeQuestions.length > 0) {
      console.log('Sample challenge question:', {
        id: challengeQuestions[0]._id,
        text: challengeQuestions[0].questionText,
        difficulty: challengeQuestions[0].difficulty
      });
    }

    console.log('Sending response...');
    res.json({
      success: true,
      regularQuestions,
      challengeQuestions,
      regularCount: regularQuestions.length,
      challengeCount: challengeQuestions.length
    });
    console.log('=== RESPONSE SENT ===');
  } catch (error) {
    console.error('=== ERROR IN QUESTIONS API ===');
    console.error('Error fetching questions for test:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
});

// Create a new test
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      grade,
      subject,
      regularQuestions,
      challengeQuestions,
      studentIds,
      scheduledDate,
      startTime,
      duration,
      settings
    } = req.body;

    // Validation
    if (!title || !grade || !subject || !scheduledDate || !startTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!regularQuestions || regularQuestions.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Must select exactly 10 regular questions'
      });
    }

    if (!challengeQuestions || challengeQuestions.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Must select exactly 5 challenge questions'
      });
    }

    // Verify questions exist and belong to correct grade/subject
    const allQuestionIds = [...regularQuestions, ...challengeQuestions];
    const questions = await Question.find({
      _id: { $in: allQuestionIds },
      grade,
      subject
    });

    if (questions.length !== allQuestionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid questions selected'
      });
    }

    // Verify challenge questions are expert level
    const challengeQs = await Question.find({
      _id: { $in: challengeQuestions },
      difficulty: 'expert'
    });

    if (challengeQs.length !== challengeQuestions.length) {
      return res.status(400).json({
        success: false,
        message: 'Challenge questions must be expert level'
      });
    }

    const newTest = new Assignment({
      teacherId: req.user._id,
      title,
      description,
      type: 'test',
      regularQuestions,
      challengeQuestions,
      grade,
      subject,
      studentIds: studentIds || [],
      scheduledDate: new Date(scheduledDate),
      startTime,
      duration,
      settings: {
        allowChallenges: true,
        shuffleQuestions: settings?.shuffleQuestions || true,
        showResults: settings?.showResults || true,
        passingScore: settings?.passingScore || 70
      },
      status: 'draft'
    });

    await newTest.save();

    // Populate the response
    const populatedTest = await Assignment.findById(newTest._id)
      .populate('regularQuestions', 'questionText subject grade difficulty')
      .populate('challengeQuestions', 'questionText subject grade difficulty')
      .populate('studentIds', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      test: populatedTest
    });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test',
      error: error.message
    });
  }
});

// Update test
router.put('/:id', auth, async (req, res) => {
  try {
    const test = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id,
      type: 'test'
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Don't allow updates if test is active or completed
    if (['active', 'completed'].includes(test.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update active or completed test'
      });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        test[key] = updates[key];
      }
    });

    await test.save();

    const populatedTest = await Assignment.findById(test._id)
      .populate('regularQuestions', 'questionText subject grade difficulty')
      .populate('challengeQuestions', 'questionText subject grade difficulty')
      .populate('studentIds', 'username profile.firstName profile.lastName');

    res.json({
      success: true,
      message: 'Test updated successfully',
      test: populatedTest
    });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating test',
      error: error.message
    });
  }
});

// Schedule/Publish test
router.post('/:id/schedule', auth, async (req, res) => {
  try {
    const test = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id,
      type: 'test'
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    if (test.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Test is already scheduled'
      });
    }

    // Validate that test has required questions
    if (test.regularQuestions.length !== 10 || test.challengeQuestions.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Test must have exactly 10 regular and 5 challenge questions'
      });
    }

    test.status = 'scheduled';
    await test.save();

    res.json({
      success: true,
      message: 'Test scheduled successfully',
      test
    });
  } catch (error) {
    console.error('Error scheduling test:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling test',
      error: error.message
    });
  }
});

// Get students for assignment
router.get('/students/:grade', auth, async (req, res) => {
  try {
    const { grade } = req.params;
    
    const students = await User.find({
      role: 'student',
      'profile.grade': grade
    }).select('username profile.firstName profile.lastName profile.grade');

    res.json({
      success: true,
      students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
});

// Delete test
router.delete('/:id', auth, async (req, res) => {
  try {
    const test = await Assignment.findOne({
      _id: req.params.id,
      teacherId: req.user._id,
      type: 'test'
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Don't allow deletion if test is active
    if (test.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active test'
      });
    }

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting test',
      error: error.message
    });
  }
});

// Get test details for students
router.get('/:id/details', auth, async (req, res) => {
  try {
    const test = await Assignment.findById(req.params.id)
      .populate('regularQuestions')
      .populate('challengeQuestions')
      .populate('teacherId', 'username profile.firstName profile.lastName');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is authorized (teacher or assigned student)
    const isTeacher = test.teacherId._id.toString() === req.user._id.toString();
    const isAssignedStudent = test.studentIds.some(id => id.toString() === req.user._id.toString());

    if (!isTeacher && !isAssignedStudent) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this test'
      });
    }

    res.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test details',
      error: error.message
    });
  }
});

module.exports = router;

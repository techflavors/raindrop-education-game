const express = require('express');
const Question = require('../models/Question');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const questionGenerator = require('../services/questionGenerator');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const questionSchema = Joi.object({
  grade: Joi.string().valid('K', '1', '2', '3', '4', '5', '6', '7', '8').required(),
  subject: Joi.string().valid('Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE').required(),
  questionText: Joi.string().min(10).max(500).required(),
  questionType: Joi.string().valid('multiple-choice', 'true-false', 'fill-blank').default('multiple-choice'),
  difficulty: Joi.string().valid('beginner', 'advanced', 'expert').default('beginner'),
  answers: Joi.array().items(
    Joi.object({
      text: Joi.string().required(),
      isCorrect: Joi.boolean().required()
    })
  ).min(2).max(6).required(),
  tags: Joi.array().items(Joi.string()).default([]),
  imageUrl: Joi.string().uri().allow(null, '')
});

const generateSchema = Joi.object({
  grade: Joi.string().valid('K', '1', '2', '3', '4', '5', '6', '7', '8').required(),
  subject: Joi.string().valid('Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE').required(),
  difficulty: Joi.string().valid('beginner', 'advanced', 'expert').default('beginner'),
  count: Joi.number().integer().min(1).max(20).default(5)
});

// Generate questions using AI
router.post('/generate', auth, async (req, res) => {
  try {
    // Only teachers can generate questions
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can generate questions' });
    }

    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { grade, subject, difficulty, count } = value;

    // Check if teacher is assigned to this grade/subject
    const teacher = req.user; // Use req.user directly since middleware already loads the user
    if (!teacher.profile.assignedGrades?.includes(grade) || 
        !teacher.profile.subjects?.includes(subject)) {
      return res.status(403).json({ 
        message: 'You can only generate questions for your assigned grades and subjects' 
      });
    }

    // Generate questions using AI
    const generatedQuestions = await questionGenerator.generateQuestions(
      grade, subject, difficulty, count
    );

    // Save generated questions to database
    const savedQuestions = [];
    for (const questionData of generatedQuestions) {
      const question = new Question({
        ...questionData,
        teacherId: req.user._id,
        grade,
        subject
      });
      await question.save();
      savedQuestions.push(question);
    }

    res.json({
      message: `Generated ${savedQuestions.length} questions successfully`,
      questions: savedQuestions
    });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate questions', 
      error: error.message 
    });
  }
});

// Get all questions for a teacher
router.get('/my-questions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    const { grade, subject, difficulty, page = 1, limit = 20 } = req.query;
    
    const filter = { 
      teacherId: req.user._id,
      isActive: true
    };
    
    if (grade) filter.grade = grade;
    if (subject) filter.subject = subject;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Question.countDocuments(filter);

    res.json({
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalQuestions: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching questions', error: error.message });
  }
});

// Create a new question manually
router.post('/create', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create questions' });
    }

    const { error, value } = questionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if teacher is assigned to this grade/subject
    const teacher = req.user; // Use req.user directly
    if (!teacher.profile.assignedGrades?.includes(value.grade) || 
        !teacher.profile.subjects?.includes(value.subject)) {
      return res.status(403).json({ 
        message: 'You can only create questions for your assigned grades and subjects' 
      });
    }

    const question = new Question({
      ...value,
      teacherId: req.user._id,
      generatedByAI: false
    });

    await question.save();

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating question', error: error.message });
  }
});

// Update a question
router.put('/:questionId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can update questions' });
    }

    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if teacher owns this question
    if (question.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only update your own questions' });
    }

    const { error, value } = questionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    Object.assign(question, value);
    await question.save();

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating question', error: error.message });
  }
});

// Delete a question
router.delete('/:questionId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can delete questions' });
    }

    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if teacher owns this question
    if (question.teacherId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete your own questions' });
    }

    // Soft delete - mark as inactive
    question.isActive = false;
    await question.save();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting question', error: error.message });
  }
});

// Get question statistics for teacher
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    const stats = await Question.aggregate([
      { $match: { teacherId: req.user.userId, isActive: true } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          aiGenerated: { $sum: { $cond: ['$generatedByAI', 1, 0] } },
          manuallyCreated: { $sum: { $cond: ['$generatedByAI', 0, 1] } },
          byDifficulty: {
            $push: {
              difficulty: '$difficulty',
              subject: '$subject',
              grade: '$grade'
            }
          }
        }
      }
    ]);

    const difficultyStats = await Question.aggregate([
      { $match: { teacherId: req.user.userId, isActive: true } },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);

    const subjectStats = await Question.aggregate([
      { $match: { teacherId: req.user.userId, isActive: true } },
      {
        $group: {
          _id: { subject: '$subject', grade: '$grade' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overview: stats[0] || { totalQuestions: 0, aiGenerated: 0, manuallyCreated: 0 },
      byDifficulty: difficultyStats,
      bySubjectAndGrade: subjectStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// Check Ollama status
router.get('/ai-status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    const isRunning = await questionGenerator.isOllamaRunning();
    const models = await questionGenerator.getAvailableModels();

    res.json({
      ollamaRunning: isRunning,
      availableModels: models,
      status: isRunning ? 'AI question generation available' : 'AI service unavailable - using fallback questions'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking AI status', error: error.message });
  }
});

module.exports = router;

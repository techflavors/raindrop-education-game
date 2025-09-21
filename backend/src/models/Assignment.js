const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['test', 'homework', 'quiz', 'practice'],
    default: 'test'
  },
  // Regular questions (students must answer all 10)
  regularQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }],
  // Challenge questions (for student challenges, 5 questions)
  challengeQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  // Legacy field for backward compatibility
  questionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  studentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  grade: {
    type: String,
    required: true,
    enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  },
  subject: {
    type: String,
    required: true,
    enum: ['Math', 'Science', 'English', 'History', 'Geography', 'Art', 'Music', 'PE']
  },
  // Scheduling information
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // HH:MM format
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    default: 60
  },
  // Legacy field
  dueDate: {
    type: Date
  },
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed', 'archived'],
    default: 'draft'
  },
  settings: {
    allowChallenges: {
      type: Boolean,
      default: true
    },
    shuffleQuestions: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: Boolean,
      default: true
    },
    passingScore: {
      type: Number,
      default: 70 // percentage
    }
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'advanced', 'expert', 'mixed'],
    default: 'mixed'
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate total points before saving
assignmentSchema.pre('save', async function(next) {
  if (this.isModified('questionIds')) {
    try {
      const Question = mongoose.model('Question');
      const questions = await Question.find({ _id: { $in: this.questionIds } });
      this.totalPoints = questions.reduce((total, question) => total + question.basePoints, 0);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Indexes
assignmentSchema.index({ teacherId: 1, status: 1 });
assignmentSchema.index({ grade: 1, subject: 1 });
assignmentSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);

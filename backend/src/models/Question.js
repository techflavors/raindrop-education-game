const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  grade: {
    type: String,
    required: true,
    enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8']
  },
  subject: {
    type: String,
    required: true,
    enum: ['Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE']
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'fill-blank'],
    default: 'multiple-choice'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'advanced', 'expert'],
    default: 'beginner'
  },
  answers: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    points: {
      type: Number,
      default: function() {
        const pointMap = { beginner: 10, advanced: 25, expert: 50 };
        return pointMap[this.difficulty] || 10;
      }
    }
  }],
  basePoints: {
    type: Number,
    default: function() {
      const pointMap = { beginner: 10, advanced: 25, expert: 50 };
      return pointMap[this.difficulty] || 10;
    }
  },
  imageUrl: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  generatedByAI: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
questionSchema.index({ teacherId: 1, grade: 1, subject: 1 });
questionSchema.index({ difficulty: 1, subject: 1 });
questionSchema.index({ isActive: 1 });

// Validation for answers
questionSchema.pre('save', function(next) {
  if (this.questionType === 'multiple-choice' && this.answers.length < 2) {
    return next(new Error('Multiple choice questions must have at least 2 answers'));
  }
  
  if (this.questionType === 'true-false' && this.answers.length !== 2) {
    return next(new Error('True/false questions must have exactly 2 answers'));
  }
  
  // Ensure at least one correct answer
  const correctAnswers = this.answers.filter(answer => answer.isCorrect);
  if (correctAnswers.length === 0) {
    return next(new Error('Question must have at least one correct answer'));
  }
  
  next();
});

module.exports = mongoose.model('Question', questionSchema);

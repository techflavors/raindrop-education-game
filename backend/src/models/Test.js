const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
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
    enum: ['regular', 'challenge'],
    required: true
  },
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
  // For regular tests: 10 questions from all difficulty levels
  questions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    order: {
      type: Number,
      required: true
    }
  }],
  // Students assigned to this test
  assignedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Test settings
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  dueDate: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  passingScore: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  instructions: {
    type: String,
    default: 'Answer all questions to the best of your ability. Good luck!'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Challenge specific settings
  challengeSettings: {
    isChallenge: {
      type: Boolean,
      default: false
    },
    raindropsWager: {
      type: Number,
      default: 10
    },
    allowDecline: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
testSchema.index({ teacherId: 1, grade: 1, subject: 1 });
testSchema.index({ type: 1, isActive: 1 });
testSchema.index({ dueDate: 1 });

// Virtual for total points
testSchema.virtual('totalPoints').get(function() {
  return this.questions.length * 10; // Base calculation, can be adjusted
});

// Method to check if test is still available
testSchema.methods.isAvailable = function() {
  const now = new Date();
  return this.isActive && 
         now >= this.startDate && 
         now <= this.dueDate;
};

// Method to get question count by difficulty
testSchema.methods.getQuestionDistribution = async function() {
  await this.populate('questions.questionId');
  
  const distribution = {
    easy: 0,
    beginner: 0,
    medium: 0,
    advanced: 0,
    expert: 0
  };

  this.questions.forEach(q => {
    if (q.questionId && q.questionId.difficulty) {
      distribution[q.questionId.difficulty]++;
    }
  });

  return distribution;
};

module.exports = mongoose.model('Test', testSchema);

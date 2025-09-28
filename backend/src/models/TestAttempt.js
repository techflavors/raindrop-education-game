const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  // Student's responses to questions
  responses: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedAnswer: {
      type: String,
      required: false, // Allow empty answers for unanswered questions
      default: ''
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    pointsEarned: {
      type: Number,
      default: 0
    },
    raindropsEarned: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0
    },
    answeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Overall attempt results
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  totalRaindrops: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number, // in minutes
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned', 'expired'],
    default: 'in-progress'
  },
  // Challenge specific data
  challengeData: {
    isChallenge: {
      type: Boolean,
      default: false
    },
    opponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    challengeResult: {
      type: String,
      enum: ['won', 'lost', 'tie', 'pending']
    },
    raindropsWagered: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
testAttemptSchema.index({ studentId: 1, testId: 1 });
testAttemptSchema.index({ testId: 1, status: 1 });
testAttemptSchema.index({ status: 1, submittedAt: 1 });

// Compound index for preventing duplicate attempts
testAttemptSchema.index({ studentId: 1, testId: 1 }, { unique: true });

// Method to calculate final score
testAttemptSchema.methods.calculateScore = function() {
  if (this.responses.length === 0) return 0;
  
  const correctResponses = this.responses.filter(r => r.isCorrect).length;
  this.score = Math.round((correctResponses / this.responses.length) * 100);
  return this.score;
};

// Method to calculate total raindrops based on difficulty
testAttemptSchema.methods.calculateRaindrops = async function() {
  await this.populate('responses.questionId');
  
  let totalRaindrops = 0;
  
  this.responses.forEach(response => {
    if (response.isCorrect && response.questionId) {
      const difficulty = response.questionId.difficulty;
      const raindrops = {
        easy: 1,
        beginner: 2,
        medium: 3,
        advanced: 4,
        expert: 5
      }[difficulty] || 1;
      
      response.raindropsEarned = raindrops;
      totalRaindrops += raindrops;
    }
  });
  
  this.totalRaindrops = totalRaindrops;
  return totalRaindrops;
};

// Method to check if attempt is expired
testAttemptSchema.methods.isExpired = function() {
  if (!this.startedAt || this.status === 'completed') return false;
  
  // Get the test time limit (need to populate test)
  const timeLimit = this.testId.timeLimit || 30; // default 30 minutes
  const expirationTime = new Date(this.startedAt.getTime() + (timeLimit * 60 * 1000));
  
  return new Date() > expirationTime;
};

// Pre-save middleware to calculate final results
testAttemptSchema.pre('save', async function(next) {
  if (this.status === 'completed' && this.isModified('responses')) {
    this.calculateScore();
    await this.calculateRaindrops();
    
    // Calculate total time spent
    if (this.startedAt && this.submittedAt) {
      this.totalTimeSpent = Math.round((this.submittedAt - this.startedAt) / (1000 * 60)); // in minutes
    }
  }
  next();
});

module.exports = mongoose.model('TestAttempt', testAttemptSchema);

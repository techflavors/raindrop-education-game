const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  // Students involved in the challenge
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challenged: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Challenge details
  title: {
    type: String,
    default: function() {
      return `Battle Challenge - ${this.subject} ${this.grade}`;
    }
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
  
  // Questions for the challenge (advanced level)
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
  
  // Challenge status and timing
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'declined', 'expired'],
    default: 'pending'
  },
  
  timeLimit: {
    type: Number,
    default: 300, // 5 minutes in seconds
    min: 60,
    max: 1800
  },
  
  // Battle results
  challengerScore: {
    score: { type: Number, default: 0 },
    raindropsEarned: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    answers: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      selectedAnswer: String,
      isCorrect: Boolean,
      timeSpent: Number
    }]
  },
  
  challengedScore: {
    score: { type: Number, default: 0 },
    raindropsEarned: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    answers: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      selectedAnswer: String,
      isCorrect: Boolean,
      timeSpent: Number
    }]
  },
  
  // Winner determination
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  winCondition: {
    type: String,
    enum: ['score', 'time', 'tie'],
    default: null
  },
  
  // Challenge settings
  wagerRaindrops: {
    type: Number,
    default: 5,
    min: 1,
    max: 50
  },
  
  difficulty: {
    type: String,
    enum: ['advanced', 'expert'],
    default: 'advanced'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  acceptedAt: {
    type: Date,
    default: null
  },
  
  startedAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from creation
    }
  },
  
  // Challenge message
  message: {
    type: String,
    maxlength: 200,
    default: "I challenge you to a battle!"
  }
}, {
  timestamps: true
});

// Indexes for performance
challengeSchema.index({ challenger: 1, createdAt: -1 });
challengeSchema.index({ challenged: 1, status: 1 });
challengeSchema.index({ status: 1, expiresAt: 1 });
challengeSchema.index({ grade: 1, subject: 1 });

// Virtual for challenge duration
challengeSchema.virtual('duration').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000); // in seconds
  }
  return null;
});

// Method to check if challenge is expired
challengeSchema.methods.isExpired = function() {
  return this.status === 'pending' && new Date() > this.expiresAt;
};

// Method to determine winner
challengeSchema.methods.determineWinner = function() {
  if (this.status !== 'completed') return null;
  
  const challengerScore = this.challengerScore.score;
  const challengedScore = this.challengedScore.score;
  
  if (challengerScore > challengedScore) {
    this.winner = this.challenger;
    this.winCondition = 'score';
  } else if (challengedScore > challengerScore) {
    this.winner = this.challenged;
    this.winCondition = 'score';
  } else {
    // Tie-breaker: faster completion time wins
    const challengerTime = this.challengerScore.timeSpent;
    const challengedTime = this.challengedScore.timeSpent;
    
    if (challengerTime < challengedTime) {
      this.winner = this.challenger;
      this.winCondition = 'time';
    } else if (challengedTime < challengerTime) {
      this.winner = this.challenged;
      this.winCondition = 'time';
    } else {
      this.winner = null;
      this.winCondition = 'tie';
    }
  }
  
  return this.winner;
};

// Static method to get available challengers for a student
challengeSchema.statics.getAvailableChallengers = async function(studentId, grade, subject) {
  const User = mongoose.model('User');
  
  // Get students in same grade/subject who are not currently in a challenge with this student
  const existingChallenges = await this.find({
    $or: [
      { challenger: studentId, status: { $in: ['pending', 'accepted', 'in-progress'] } },
      { challenged: studentId, status: { $in: ['pending', 'accepted', 'in-progress'] } }
    ]
  }).select('challenger challenged');
  
  const excludeIds = existingChallenges.reduce((acc, challenge) => {
    if (challenge.challenger.toString() !== studentId.toString()) {
      acc.push(challenge.challenger);
    }
    if (challenge.challenged.toString() !== studentId.toString()) {
      acc.push(challenge.challenged);
    }
    return acc;
  }, [studentId]); // Always exclude self
  
  return await User.find({
    role: 'student',
    'profile.grade': grade,
    _id: { $nin: excludeIds }
  }).select('profile.firstName profile.lastName username');
};

// Static method to check if a student can access a difficulty level
challengeSchema.statics.getUnlockRequirements = function() {
  return {
    advanced: {
      raindropsRequired: 25,
      name: 'Advanced Challenges',
      description: 'Unlock advanced difficulty battles'
    },
    expert: {
      raindropsRequired: 75,
      name: 'Expert Challenges',
      description: 'Unlock expert difficulty battles with higher rewards'
    }
  };
};

// Static method to check if student can access difficulty
challengeSchema.statics.canAccessDifficulty = async function(studentId, difficulty) {
  const TestAttempt = mongoose.model('TestAttempt');
  
  // Get student's total raindrops
  const attempts = await TestAttempt.find({ studentId });
  const totalRaindrops = attempts.reduce((sum, attempt) => sum + (attempt.raindropsEarned || 0), 0);
  
  const requirements = this.getUnlockRequirements();
  
  if (difficulty === 'advanced') {
    return totalRaindrops >= requirements.advanced.raindropsRequired;
  } else if (difficulty === 'expert') {
    return totalRaindrops >= requirements.expert.raindropsRequired;
  }
  
  return false;
};

// Static method to get available difficulties for a student
challengeSchema.statics.getAvailableDifficulties = async function(studentId) {
  const TestAttempt = mongoose.model('TestAttempt');
  
  // Get student's total raindrops
  const attempts = await TestAttempt.find({ studentId });
  const totalRaindrops = attempts.reduce((sum, attempt) => sum + (attempt.raindropsEarned || 0), 0);
  
  const requirements = this.getUnlockRequirements();
  const available = [];
  
  // Advanced is always available (basic level)
  available.push({
    difficulty: 'advanced',
    isUnlocked: totalRaindrops >= requirements.advanced.raindropsRequired,
    raindropsRequired: requirements.advanced.raindropsRequired,
    name: requirements.advanced.name,
    description: requirements.advanced.description,
    currentRaindrops: totalRaindrops
  });
  
  // Expert requires more raindrops
  available.push({
    difficulty: 'expert',
    isUnlocked: totalRaindrops >= requirements.expert.raindropsRequired,
    raindropsRequired: requirements.expert.raindropsRequired,
    name: requirements.expert.name,
    description: requirements.expert.description,
    currentRaindrops: totalRaindrops
  });
  
  return available;
};

// Enhanced getAvailableChallengers with unlock logic
challengeSchema.statics.getAvailableChallengersWithUnlocks = async function(studentId, grade, subject) {
  const User = mongoose.model('User');
  const TestAttempt = mongoose.model('TestAttempt');
  
  // Get basic available challengers
  const challengers = await this.getAvailableChallengers(studentId, grade, subject);
  
  // Get unlock information for the requesting student
  const difficulties = await this.getAvailableDifficulties(studentId);
  
  // Add battle stats to each challenger
  const challengersWithStats = await Promise.all(challengers.map(async (challenger) => {
    // Get challenger's battle history
    const challengerBattles = await this.find({
      $or: [
        { challenger: challenger._id, status: 'completed' },
        { challenged: challenger._id, status: 'completed' }
      ]
    });
    
    // Calculate win rate
    const wins = challengerBattles.filter(battle => 
      battle.winner && battle.winner.toString() === challenger._id.toString()
    ).length;
    
    // Get total raindrops
    const attempts = await TestAttempt.find({ studentId: challenger._id });
    const totalRaindrops = attempts.reduce((sum, attempt) => sum + (attempt.raindropsEarned || 0), 0);
    
    return {
      ...challenger.toObject(),
      battleStats: {
        total: challengerBattles.length,
        wins: wins,
        winRate: challengerBattles.length > 0 ? Math.round((wins / challengerBattles.length) * 100) : 0
      },
      totalRaindrops
    };
  }));
  
  return {
    challengers: challengersWithStats,
    unlockInfo: difficulties
  };
};

module.exports = mongoose.model('Challenge', challengeSchema);
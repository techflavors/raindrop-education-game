const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
  // Reference to the challenge that started this battle
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  
  // Battle participants
  participants: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['challenger', 'challenged'],
      required: true
    },
    isConnected: {
      type: Boolean,
      default: false
    },
    socketId: {
      type: String,
      default: null
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Battle state
  status: {
    type: String,
    enum: ['waiting', 'ready', 'in-progress', 'completed', 'abandoned'],
    default: 'waiting'
  },
  
  currentQuestion: {
    questionIndex: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: null
    },
    timeLimit: {
      type: Number,
      default: 30 // seconds per question
    }
  },
  
  // Real-time answers tracking
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    questionIndex: {
      type: Number,
      required: true
    },
    challengerAnswer: {
      selectedAnswer: String,
      isCorrect: Boolean,
      submittedAt: Date,
      timeSpent: Number,
      points: { type: Number, default: 0 },
      raindrops: { type: Number, default: 0 }
    },
    challengedAnswer: {
      selectedAnswer: String,
      isCorrect: Boolean,
      submittedAt: Date,
      timeSpent: Number,
      points: { type: Number, default: 0 },
      raindrops: { type: Number, default: 0 }
    }
  }],
  
  // Live scores
  liveScores: {
    challenger: {
      totalScore: { type: Number, default: 0 },
      totalRaindrops: { type: Number, default: 0 },
      correctAnswers: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 }
    },
    challenged: {
      totalScore: { type: Number, default: 0 },
      totalRaindrops: { type: Number, default: 0 },
      correctAnswers: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 }
    }
  },
  
  // Battle settings
  settings: {
    totalQuestions: {
      type: Number,
      default: 5
    },
    timePerQuestion: {
      type: Number,
      default: 30 // seconds
    },
    difficulty: {
      type: String,
      enum: ['advanced', 'expert'],
      default: 'advanced'
    },
    autoAdvance: {
      type: Boolean,
      default: true
    }
  },
  
  // Timing
  scheduledStart: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 10000); // 10 seconds from creation
    }
  },
  
  actualStart: {
    type: Date,
    default: null
  },
  
  endedAt: {
    type: Date,
    default: null
  },
  
  // Battle results
  results: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    winReason: {
      type: String,
      enum: ['score', 'time', 'forfeit', 'disconnect', 'tie'],
      default: null
    },
    finalScores: {
      challenger: { type: Number, default: 0 },
      challenged: { type: Number, default: 0 }
    },
    battleDuration: {
      type: Number, // seconds
      default: 0
    }
  },
  
  // System tracking
  events: [{
    type: {
      type: String,
      enum: ['join', 'leave', 'answer', 'question_start', 'question_end', 'battle_start', 'battle_end', 'disconnect', 'reconnect'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    data: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
battleSchema.index({ challengeId: 1 });
battleSchema.index({ 'participants.studentId': 1, status: 1 });
battleSchema.index({ status: 1, scheduledStart: 1 });
battleSchema.index({ createdAt: -1 });

// Virtual for battle duration
battleSchema.virtual('duration').get(function() {
  if (this.actualStart && this.endedAt) {
    return Math.round((this.endedAt - this.actualStart) / 1000);
  }
  return 0;
});

// Method to check if all participants are connected
battleSchema.methods.allParticipantsConnected = function() {
  return this.participants.length === 2 && 
         this.participants.every(p => p.isConnected);
};

// Method to get participant by student ID
battleSchema.methods.getParticipant = function(studentId) {
  return this.participants.find(p => p.studentId.toString() === studentId.toString());
};

// Method to update participant connection status
battleSchema.methods.updateParticipantConnection = function(studentId, isConnected, socketId = null) {
  const participant = this.getParticipant(studentId);
  if (participant) {
    participant.isConnected = isConnected;
    if (socketId) participant.socketId = socketId;
    return true;
  }
  return false;
};

// Method to submit answer
battleSchema.methods.submitAnswer = function(studentId, questionId, questionIndex, selectedAnswer, timeSpent) {
  const Question = mongoose.model('Question');
  
  // Find or create answer entry
  let answerEntry = this.answers.find(a => a.questionIndex === questionIndex);
  if (!answerEntry) {
    answerEntry = {
      questionId,
      questionIndex,
      challengerAnswer: {},
      challengedAnswer: {}
    };
    this.answers.push(answerEntry);
  }
  
  const participant = this.getParticipant(studentId);
  if (!participant) return false;
  
  const role = participant.role;
  const answerField = role === 'challenger' ? 'challengerAnswer' : 'challengedAnswer';
  
  // Get question to check correctness
  return Question.findById(questionId).then(question => {
    if (!question) return false;
    
    const correctAnswer = question.answers.find(ans => ans.isCorrect);
    const isCorrect = selectedAnswer === correctAnswer?.text;
    
    // Calculate points and raindrops
    let points = 0;
    let raindrops = 0;
    if (isCorrect) {
      points = this.settings.difficulty === 'expert' ? 5 : 4; // Expert = 5, Advanced = 4
      raindrops = points;
      
      // Time bonus
      if (timeSpent < this.settings.timePerQuestion * 0.5) {
        points += 2;
        raindrops += 1;
      }
    }
    
    // Update answer
    answerEntry[answerField] = {
      selectedAnswer,
      isCorrect,
      submittedAt: new Date(),
      timeSpent,
      points,
      raindrops
    };
    
    // Update live scores
    const scoreField = role === 'challenger' ? 'challenger' : 'challenged';
    this.liveScores[scoreField].totalScore += points;
    this.liveScores[scoreField].totalRaindrops += raindrops;
    if (isCorrect) this.liveScores[scoreField].correctAnswers += 1;
    
    // Update average time
    const answeredQuestions = this.answers.filter(a => a[answerField].submittedAt).length;
    const totalTime = this.answers.reduce((sum, a) => {
      return sum + (a[answerField].timeSpent || 0);
    }, 0);
    this.liveScores[scoreField].averageTime = Math.round(totalTime / answeredQuestions);
    
    return true;
  });
};

// Method to advance to next question
battleSchema.methods.advanceQuestion = function() {
  this.currentQuestion.questionIndex += 1;
  this.currentQuestion.startedAt = new Date();
  
  // Check if battle is complete
  if (this.currentQuestion.questionIndex >= this.settings.totalQuestions) {
    this.status = 'completed';
    this.endedAt = new Date();
    this.results.battleDuration = this.duration;
    
    // Determine winner
    const challengerScore = this.liveScores.challenger.totalScore;
    const challengedScore = this.liveScores.challenged.totalScore;
    
    this.results.finalScores.challenger = challengerScore;
    this.results.finalScores.challenged = challengedScore;
    
    if (challengerScore > challengedScore) {
      this.results.winner = this.participants.find(p => p.role === 'challenger').studentId;
      this.results.winReason = 'score';
    } else if (challengedScore > challengerScore) {
      this.results.winner = this.participants.find(p => p.role === 'challenged').studentId;
      this.results.winReason = 'score';
    } else {
      // Tie-breaker: faster average time
      const challengerTime = this.liveScores.challenger.averageTime;
      const challengedTime = this.liveScores.challenged.averageTime;
      
      if (challengerTime < challengedTime) {
        this.results.winner = this.participants.find(p => p.role === 'challenger').studentId;
        this.results.winReason = 'time';
      } else if (challengedTime < challengerTime) {
        this.results.winner = this.participants.find(p => p.role === 'challenged').studentId;
        this.results.winReason = 'time';
      } else {
        this.results.winReason = 'tie';
      }
    }
  }
  
  return this.currentQuestion.questionIndex < this.settings.totalQuestions;
};

// Method to log events
battleSchema.methods.logEvent = function(type, userId = null, data = null) {
  this.events.push({
    type,
    userId,
    data,
    timestamp: new Date()
  });
};

module.exports = mongoose.model('Battle', battleSchema);
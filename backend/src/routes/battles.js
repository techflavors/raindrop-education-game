const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const Challenge = require('../models/Challenge');
const Question = require('../models/Question');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get battle details
router.get('/:battleId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const battle = await Battle.findById(req.params.battleId)
      .populate([
        { 
          path: 'challengeId',
          populate: {
            path: 'questions.questionId',
            select: 'questionText options difficulty imageUrl explanation'
          }
        },
        { path: 'participants.studentId', select: 'profile.firstName profile.lastName username' }
      ]);

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    // Check if user is a participant
    const isParticipant = battle.participants.some(p => p.studentId._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    res.json({
      success: true,
      battle
    });
  } catch (error) {
    console.error('Error fetching battle:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Start the battle (both participants ready)
router.post('/:battleId/start', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const battle = await Battle.findById(req.params.battleId);
    
    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    // Check if user is a participant
    const participant = battle.participants.find(p => p.studentId.toString() === req.user._id.toString());
    if (!participant) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    if (battle.status !== 'waiting') {
      return res.status(400).json({ success: false, message: 'Battle cannot be started' });
    }

    // Mark this participant as ready
    participant.isReady = true;

    // Check if both participants are ready
    const allReady = battle.participants.every(p => p.isReady);
    
    if (allReady) {
      battle.status = 'in-progress';
      battle.startedAt = new Date();
      
      // Add start event
      battle.events.push({
        type: 'battle_started',
        timestamp: new Date(),
        details: { message: 'Battle has begun!' }
      });
    }

    await battle.save();

    res.json({
      success: true,
      message: allReady ? 'Battle started!' : 'Waiting for other participant...',
      battle: {
        _id: battle._id,
        status: battle.status,
        startedAt: battle.startedAt,
        participants: battle.participants
      }
    });
  } catch (error) {
    console.error('Error starting battle:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Submit an answer during battle
router.post('/:battleId/submit-answer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const { questionOrder, selectedAnswer, timeSpent } = req.body;

    if (!questionOrder || !selectedAnswer || timeSpent === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'questionOrder, selectedAnswer, and timeSpent are required' 
      });
    }

    const battle = await Battle.findById(req.params.battleId)
      .populate('challengeId');

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    if (battle.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Battle is not in progress' });
    }

    // Check if user is a participant
    const participant = battle.participants.find(p => p.studentId.toString() === req.user._id.toString());
    if (!participant) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    // Find the question
    const questionData = battle.challengeId.questions.find(q => q.order === questionOrder);
    if (!questionData) {
      return res.status(400).json({ success: false, message: 'Invalid question order' });
    }

    const question = await Question.findById(questionData.questionId);
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question not found' });
    }

    // Check if already answered
    const existingAnswer = participant.answers.find(a => a.questionOrder === questionOrder);
    if (existingAnswer) {
      return res.status(400).json({ success: false, message: 'Question already answered' });
    }

    // Calculate score
    const isCorrect = selectedAnswer === question.correctAnswer;
    let points = 0;
    let raindrops = 0;

    if (isCorrect) {
      // Base points by difficulty
      const basePoints = question.difficulty === 'expert' ? 100 : 
                        question.difficulty === 'advanced' ? 80 : 60;
      
      // Time bonus (faster = more points)
      const timeBonus = Math.max(0, (30 - timeSpent) * 2); // 2 points per second saved
      points = basePoints + timeBonus;
      
      // Raindrops based on difficulty and speed
      if (question.difficulty === 'expert') {
        raindrops = timeSpent <= 10 ? 5 : timeSpent <= 20 ? 4 : 3;
      } else if (question.difficulty === 'advanced') {
        raindrops = timeSpent <= 10 ? 4 : timeSpent <= 20 ? 3 : 2;
      } else {
        raindrops = timeSpent <= 10 ? 3 : timeSpent <= 20 ? 2 : 1;
      }
    }

    // Add answer
    participant.answers.push({
      questionOrder,
      selectedAnswer,
      isCorrect,
      timeSpent,
      points,
      raindrops,
      answeredAt: new Date()
    });

    // Update totals
    participant.totalScore += points;
    participant.totalRaindrops += raindrops;

    // Add event
    battle.events.push({
      type: 'answer_submitted',
      studentId: req.user._id,
      timestamp: new Date(),
      details: {
        questionOrder,
        isCorrect,
        points,
        raindrops,
        timeSpent
      }
    });

    // Check if battle is complete
    const totalQuestions = battle.challengeId.questions.length;
    const allParticipantsFinished = battle.participants.every(p => p.answers.length === totalQuestions);

    if (allParticipantsFinished) {
      battle.status = 'completed';
      battle.completedAt = new Date();

      // Determine winner
      const [participant1, participant2] = battle.participants;
      let winnerId = null;

      if (participant1.totalScore > participant2.totalScore) {
        winnerId = participant1.studentId;
      } else if (participant2.totalScore > participant1.totalScore) {
        winnerId = participant2.studentId;
      }
      // If tied, no winner

      battle.winner = winnerId;

      // Update challenge
      const challenge = await Challenge.findById(battle.challengeId._id);
      if (challenge) {
        challenge.status = 'completed';
        challenge.completedAt = new Date();
        challenge.winner = winnerId;
        
        // Calculate final scores for the challenge
        challenge.finalScores = {
          challenger: {
            score: challenge.challenger.toString() === participant1.studentId.toString() ? 
                   participant1.totalScore : participant2.totalScore,
            raindrops: challenge.challenger.toString() === participant1.studentId.toString() ? 
                      participant1.totalRaindrops : participant2.totalRaindrops
          },
          challenged: {
            score: challenge.challenged.toString() === participant1.studentId.toString() ? 
                   participant1.totalScore : participant2.totalScore,
            raindrops: challenge.challenged.toString() === participant1.studentId.toString() ? 
                      participant1.totalRaindrops : participant2.totalRaindrops
          }
        };

        await challenge.save();
      }

      // Add completion event
      battle.events.push({
        type: 'battle_completed',
        timestamp: new Date(),
        details: {
          winner: winnerId,
          finalScores: battle.participants.map(p => ({
            studentId: p.studentId,
            score: p.totalScore,
            raindrops: p.totalRaindrops
          }))
        }
      });
    }

    await battle.save();

    // Get opponent's progress
    const opponent = battle.participants.find(p => p.studentId.toString() !== req.user._id.toString());
    const opponentProgress = {
      answersCompleted: opponent.answers.length,
      totalScore: opponent.totalScore,
      totalRaindrops: opponent.totalRaindrops
    };

    res.json({
      success: true,
      result: {
        isCorrect,
        points,
        raindrops,
        explanation: question.explanation
      },
      battle: {
        status: battle.status,
        myProgress: {
          answersCompleted: participant.answers.length,
          totalScore: participant.totalScore,
          totalRaindrops: participant.totalRaindrops
        },
        opponentProgress,
        isComplete: battle.status === 'completed',
        winner: battle.winner
      }
    });
  } catch (error) {
    console.error('Error submitting battle answer:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get live battle status
router.get('/:battleId/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const battle = await Battle.findById(req.params.battleId)
      .populate({ path: 'participants.studentId', select: 'profile.firstName profile.lastName username' });

    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    // Check if user is a participant
    const participant = battle.participants.find(p => p.studentId._id.toString() === req.user._id.toString());
    if (!participant) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    const opponent = battle.participants.find(p => p.studentId._id.toString() !== req.user._id.toString());

    res.json({
      success: true,
      status: {
        battleStatus: battle.status,
        startedAt: battle.startedAt,
        completedAt: battle.completedAt,
        winner: battle.winner,
        myProgress: {
          answersCompleted: participant.answers.length,
          totalScore: participant.totalScore,
          totalRaindrops: participant.totalRaindrops,
          isReady: participant.isReady
        },
        opponentProgress: {
          name: `${opponent.studentId.profile.firstName} ${opponent.studentId.profile.lastName}`,
          answersCompleted: opponent.answers.length,
          totalScore: opponent.totalScore,
          totalRaindrops: opponent.totalRaindrops,
          isReady: opponent.isReady
        },
        totalQuestions: battle.settings.totalQuestions
      }
    });
  } catch (error) {
    console.error('Error fetching battle status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Forfeit battle
router.post('/:battleId/forfeit', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const battle = await Battle.findById(req.params.battleId);
    
    if (!battle) {
      return res.status(404).json({ success: false, message: 'Battle not found' });
    }

    if (!['waiting', 'in-progress'].includes(battle.status)) {
      return res.status(400).json({ success: false, message: 'Battle cannot be forfeited' });
    }

    // Check if user is a participant
    const participant = battle.participants.find(p => p.studentId.toString() === req.user._id.toString());
    if (!participant) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this battle' });
    }

    const opponent = battle.participants.find(p => p.studentId.toString() !== req.user._id.toString());

    // Mark battle as forfeited
    battle.status = 'completed';
    battle.completedAt = new Date();
    battle.winner = opponent.studentId; // Opponent wins by forfeit
    battle.forfeited = true;
    battle.forfeiter = req.user._id;

    // Add forfeit event
    battle.events.push({
      type: 'battle_forfeited',
      studentId: req.user._id,
      timestamp: new Date(),
      details: { reason: 'Player forfeited' }
    });

    await battle.save();

    // Update challenge
    const challenge = await Challenge.findById(battle.challengeId);
    if (challenge) {
      challenge.status = 'completed';
      challenge.completedAt = new Date();
      challenge.winner = opponent.studentId;
      await challenge.save();
    }

    res.json({
      success: true,
      message: 'Battle forfeited. Your opponent wins.',
      winner: opponent.studentId
    });
  } catch (error) {
    console.error('Error forfeiting battle:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
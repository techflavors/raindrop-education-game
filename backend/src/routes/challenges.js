const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Battle = require('../models/Battle');
const Question = require('../models/Question');
const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const { auth } = require('../middleware/auth');

// Get challenge unlock requirements and current student status
router.get('/unlock-status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const difficulties = await Challenge.getAvailableDifficulties(req.user._id);
    const requirements = Challenge.getUnlockRequirements();

    res.json({
      success: true,
      difficulties,
      requirements
    });
  } catch (error) {
    console.error('Error fetching unlock status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get available students to challenge with unlock information
router.get('/available-challengers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const currentStudent = await User.findById(req.user._id);
    const grade = currentStudent.profile.grade;
    const { subject = 'Math' } = req.query;

    const challengerData = await Challenge.getAvailableChallengersWithUnlocks(req.user._id, grade, subject);

    res.json({
      success: true,
      challengers: challengerData.challengers,
      unlockInfo: challengerData.unlockInfo,
      count: challengerData.challengers.length
    });
  } catch (error) {
    console.error('Error fetching available challengers:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Send a challenge to another student
router.post('/send', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const { challengedStudentId, subject, difficulty = 'advanced', wagerRaindrops = 5, message } = req.body;

    if (!challengedStudentId || !subject) {
      return res.status(400).json({ success: false, message: 'challengedStudentId and subject are required' });
    }

    // Validation
    const challenger = await User.findById(req.user._id);
    const challenged = await User.findById(challengedStudentId);

    if (!challenged || challenged.role !== 'student') {
      return res.status(400).json({ success: false, message: 'Invalid challenged student' });
    }

    if (challenger.profile.grade !== challenged.profile.grade) {
      return res.status(400).json({ success: false, message: 'Can only challenge students in the same grade' });
    }

    // Check if challenger can access this difficulty level
    const canAccess = await Challenge.canAccessDifficulty(req.user._id, difficulty);
    if (!canAccess) {
      const requirements = Challenge.getUnlockRequirements();
      const required = requirements[difficulty];
      return res.status(400).json({ 
        success: false, 
        message: `${required.name} requires ${required.raindropsRequired} raindrops to unlock.`,
        unlockInfo: required
      });
    }

    // Check if challenger has enough raindrops to wager
    const challengerAttempts = await TestAttempt.find({ studentId: req.user._id });
    const challengerRaindrops = challengerAttempts.reduce((sum, attempt) => sum + (attempt.raindropsEarned || 0), 0);

    if (challengerRaindrops < wagerRaindrops) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient raindrops. You have ${challengerRaindrops}, need ${wagerRaindrops}` 
      });
    }

    // Check for existing pending challenges
    const existingChallenge = await Challenge.findOne({
      $or: [
        { challenger: req.user._id, challenged: challengedStudentId, status: { $in: ['pending', 'accepted', 'in-progress'] } },
        { challenger: challengedStudentId, challenged: req.user._id, status: { $in: ['pending', 'accepted', 'in-progress'] } }
      ]
    });

    if (existingChallenge) {
      return res.status(400).json({ success: false, message: 'Challenge already exists between these students' });
    }

    // Get random advanced/expert questions for the challenge
    const questions = await Question.find({
      grade: challenger.profile.grade,
      subject,
      difficulty: { $in: difficulty === 'expert' ? ['expert'] : ['advanced', 'expert'] },
      isActive: true
    }).limit(5);

    if (questions.length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: `Not enough ${difficulty} questions available for ${subject} in grade ${challenger.profile.grade}` 
      });
    }

    // Shuffle and select questions
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random()).slice(0, 5);
    
    const challenge = new Challenge({
      challenger: req.user._id,
      challenged: challengedStudentId,
      grade: challenger.profile.grade,
      subject,
      questions: shuffledQuestions.map((q, index) => ({
        questionId: q._id,
        order: index + 1
      })),
      difficulty,
      wagerRaindrops,
      message: message || "I challenge you to a battle!",
      timeLimit: 300 // 5 minutes
    });

    await challenge.save();

    // Populate the challenge for response
    await challenge.populate([
      { path: 'challenger', select: 'profile.firstName profile.lastName username' },
      { path: 'challenged', select: 'profile.firstName profile.lastName username' },
      { path: 'questions.questionId', select: 'questionText difficulty imageUrl' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Challenge sent successfully!',
      challenge
    });
  } catch (error) {
    console.error('Error sending challenge:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get pending challenges (sent and received)
router.get('/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const sentChallenges = await Challenge.find({
      challenger: req.user._id,
      status: 'pending'
    }).populate([
      { path: 'challenged', select: 'profile.firstName profile.lastName username' },
      { path: 'questions.questionId', select: 'questionText difficulty' }
    ]).sort({ createdAt: -1 });

    const receivedChallenges = await Challenge.find({
      challenged: req.user._id,
      status: 'pending'
    }).populate([
      { path: 'challenger', select: 'profile.firstName profile.lastName username' },
      { path: 'questions.questionId', select: 'questionText difficulty' }
    ]).sort({ createdAt: -1 });

    res.json({
      success: true,
      sent: sentChallenges,
      received: receivedChallenges,
      total: sentChallenges.length + receivedChallenges.length
    });
  } catch (error) {
    console.error('Error fetching pending challenges:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Accept a challenge
router.post('/:challengeId/accept', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const challenge = await Challenge.findById(req.params.challengeId);
    
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (challenge.challenged.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not the challenged student' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Challenge is no longer pending' });
    }

    if (challenge.isExpired()) {
      challenge.status = 'expired';
      await challenge.save();
      return res.status(400).json({ success: false, message: 'Challenge has expired' });
    }

    // Check if challenged student has enough raindrops
    const challengedAttempts = await TestAttempt.find({ studentId: req.user._id });
    const challengedRaindrops = challengedAttempts.reduce((sum, attempt) => sum + (attempt.raindropsEarned || 0), 0);

    if (challengedRaindrops < challenge.wagerRaindrops) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient raindrops. You have ${challengedRaindrops}, need ${challenge.wagerRaindrops}` 
      });
    }

    // Accept the challenge
    challenge.status = 'accepted';
    challenge.acceptedAt = new Date();
    await challenge.save();

    // Create a battle session
    const battle = new Battle({
      challengeId: challenge._id,
      participants: [
        {
          studentId: challenge.challenger,
          role: 'challenger'
        },
        {
          studentId: challenge.challenged,
          role: 'challenged'
        }
      ],
      settings: {
        totalQuestions: challenge.questions.length,
        timePerQuestion: 30,
        difficulty: challenge.difficulty
      }
    });

    await battle.save();

    await challenge.populate([
      { path: 'challenger', select: 'profile.firstName profile.lastName username' },
      { path: 'challenged', select: 'profile.firstName profile.lastName username' }
    ]);

    res.json({
      success: true,
      message: 'Challenge accepted! Battle will begin shortly.',
      challenge,
      battleId: battle._id
    });
  } catch (error) {
    console.error('Error accepting challenge:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Decline a challenge
router.post('/:challengeId/decline', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const challenge = await Challenge.findById(req.params.challengeId);
    
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (challenge.challenged.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not the challenged student' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Challenge is no longer pending' });
    }

    challenge.status = 'declined';
    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge declined.'
    });
  } catch (error) {
    console.error('Error declining challenge:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get challenge history
router.get('/history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const challenges = await Challenge.find({
      $or: [
        { challenger: req.user._id },
        { challenged: req.user._id }
      ],
      status: { $in: ['completed', 'declined', 'expired'] }
    })
    .populate([
      { path: 'challenger', select: 'profile.firstName profile.lastName username' },
      { path: 'challenged', select: 'profile.firstName profile.lastName username' },
      { path: 'winner', select: 'profile.firstName profile.lastName username' }
    ])
    .sort({ completedAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Challenge.countDocuments({
      $or: [
        { challenger: req.user._id },
        { challenged: req.user._id }
      ],
      status: { $in: ['completed', 'declined', 'expired'] }
    });

    // Calculate stats
    const stats = {
      totalChallenges: total,
      wins: challenges.filter(c => c.winner && c.winner._id.toString() === req.user._id.toString()).length,
      losses: challenges.filter(c => c.winner && c.winner._id.toString() !== req.user._id.toString()).length,
      ties: challenges.filter(c => c.status === 'completed' && !c.winner).length,
      declined: challenges.filter(c => c.status === 'declined').length
    };

    res.json({
      success: true,
      challenges,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching challenge history:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Cancel a sent challenge (only if pending)
router.delete('/:challengeId/cancel', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const challenge = await Challenge.findById(req.params.challengeId);
    
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (challenge.challenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not the challenger' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending challenges' });
    }

    await Challenge.findByIdAndDelete(req.params.challengeId);

    res.json({
      success: true,
      message: 'Challenge cancelled successfully.'
    });
  } catch (error) {
    console.error('Error cancelling challenge:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
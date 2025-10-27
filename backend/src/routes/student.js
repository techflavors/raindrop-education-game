const express = require('express');
const router = express.Router();
const TestAttempt = require('../models/TestAttempt');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get student progress and stats
router.get('/progress', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    // Get all completed test attempts for this student
    const attempts = await TestAttempt.find({ 
      studentId: req.user._id,
      status: 'completed'
    })
      .populate('testId', 'title subject grade')
      .sort({ submittedAt: -1 });

    // Calculate total raindrops
    const totalRaindrops = attempts.reduce((sum, attempt) => sum + (attempt.totalRaindrops || 0), 0);

    // Calculate current level (50 raindrops per level)
    const currentLevel = Math.floor(totalRaindrops / 50) + 1;

    // Calculate cups filled (100 raindrops per cup)
    const cupsFilled = Math.floor(totalRaindrops / 100);

    // Calculate average score
    const averageScore = attempts.length > 0 
      ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
      : 0;

    // Count tests passed
    const testsPassed = attempts.filter(attempt => attempt.score >= 70).length;

    res.json({
      success: true,
      totalRaindrops,
      currentLevel,
      cupsFilled,
      cupProgress: totalRaindrops % 100,
      averageScore,
      totalTests: attempts.length,
      testsPassed,
      recentAttempts: attempts.slice(0, 5) // Last 5 attempts
    });

  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get student's test history
router.get('/test-history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    const attempts = await TestAttempt.find({ studentId: req.user._id })
      .populate('testId', 'title subject grade teacherId')
      .populate({
        path: 'testId',
        populate: {
          path: 'teacherId',
          select: 'profile.firstName profile.lastName'
        }
      })
      .sort({ completedAt: -1 });

    res.json({
      success: true,
      attempts,
      count: attempts.length
    });

  } catch (error) {
    console.error('Error fetching test history:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get leaderboard for student's grade
router.get('/leaderboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }

    // Get current student's grade
    const currentStudent = await User.findById(req.user._id);
    const studentGrade = currentStudent.profile.grade;

    // Get all students in the same grade
    const studentsInGrade = await User.find({
      role: 'student',
      'profile.grade': studentGrade
    }).select('profile.firstName profile.lastName username');

    // Get test attempts for all students in grade
    const leaderboardData = await Promise.all(
      studentsInGrade.map(async (student) => {
        const attempts = await TestAttempt.find({ 
          studentId: student._id,
          status: 'completed'
        });
        const totalRaindrops = attempts.reduce((sum, attempt) => sum + (attempt.totalRaindrops || 0), 0);
        const averageScore = attempts.length > 0 
          ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
          : 0;

        return {
          studentId: student._id,
          name: `${student.profile.firstName} ${student.profile.lastName}`,
          username: student.username,
          totalRaindrops,
          averageScore,
          testsCompleted: attempts.length,
          level: Math.floor(totalRaindrops / 50) + 1,
          isCurrentUser: student._id.toString() === req.user._id.toString()
        };
      })
    );

    // Sort by total raindrops (descending)
    leaderboardData.sort((a, b) => b.totalRaindrops - a.totalRaindrops);

    // Add rank
    leaderboardData.forEach((student, index) => {
      student.rank = index + 1;
    });

    res.json({
      success: true,
      leaderboard: leaderboardData,
      currentUserRank: leaderboardData.find(student => student.isCurrentUser)?.rank || 0
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

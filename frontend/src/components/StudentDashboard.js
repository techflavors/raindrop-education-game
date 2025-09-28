import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TestAttemptNew from './TestAttemptNew';
import '../styles/StudentDashboard.css';

const StudentDashboard = ({ user, onLogout }) => {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' or 'test'
  const [assignedTests, setAssignedTests] = useState([]);
  const [studentProgress, setStudentProgress] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);



  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch assigned tests
      const testsResponse = await fetch('http://localhost:3000/api/tests/student-assigned', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const testsData = await testsResponse.json();
      
      // Fetch student progress
      const progressResponse = await fetch('http://localhost:3000/api/student/progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const progressData = await progressResponse.json();
      
      // Fetch leaderboard
      const leaderboardResponse = await fetch('http://localhost:3000/api/student/leaderboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const leaderboardData = await leaderboardResponse.json();

      if (testsData.success) setAssignedTests(testsData.tests);
      if (progressData.success) {
        setStudentProgress(progressData);
      }
      if (leaderboardData.success) setLeaderboard(leaderboardData.leaderboard);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching student data:', error);
      setLoading(false);
    }
  };

  const startTest = (test) => {
    setCurrentTest(test);
    setCurrentScreen('test');
  };

  const handleTestComplete = (result) => {
    setCurrentScreen('home');
    setCurrentTest(null);
    fetchStudentData(); // Refresh data
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('home');
    setCurrentTest(null);
  };

  const getCupProgress = () => {
    return studentProgress ? (studentProgress.cupProgress / 100) * 100 : 0;
  };

  if (loading) {
    return (
      <motion.div 
        className="student-dashboard loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="loading-spinner">🌧️</div>
        <p>Loading your raindrop adventure...</p>
      </motion.div>
    );
  }

  return (
    <div className="student-dashboard">
      <AnimatePresence mode="wait">
        {currentScreen === 'home' ? (
          <motion.div
            key="home"
            className="home-screen"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="dashboard-header">
              <motion.h1 
                className="welcome-title"
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Welcome back, {user.profile.firstName}! 🌟
              </motion.h1>
              <button className="logout-btn" onClick={onLogout}>
                Logout 👋
              </button>
            </div>

            {/* Progress Section */}
            <motion.div 
              className="progress-section"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="cup-container">
                <div className="water-cup">
                  <motion.div 
                    className="water-level"
                    initial={{ height: 0 }}
                    animate={{ height: `${getCupProgress()}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                  <div className="cup-label">
                    💧 {studentProgress?.totalRaindrops || 0} Raindrops
                  </div>
                </div>
                <div className="progress-stats">
                  <div className="stat-item">
                    <span className="stat-icon">🏆</span>
                    <span>Level {studentProgress?.currentLevel || 1}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">📊</span>
                    <span>Avg Score: {studentProgress?.averageScore || 0}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">✅</span>
                    <span>Tests Passed: {studentProgress?.testsPassed || 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Leaderboard Section */}
            <motion.div 
              className="leaderboard-section"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3>🏅 Class Leaderboard</h3>
              <div className="leaderboard-list">
                {leaderboard.slice(0, 5).map((student, index) => (
                  <div 
                    key={student.studentId} 
                    className={`leaderboard-item ${student.isCurrentUser ? 'current-user' : ''}`}
                  >
                    <span className="rank">#{student.rank}</span>
                    <span className="name">{student.isCurrentUser ? 'You' : student.name}</span>
                    <span className="raindrops">💧 {student.totalRaindrops}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tests Section */}
            <motion.div 
              className="tests-section"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h3>📚 Your Assignments</h3>
              <div className="tests-grid">
                {assignedTests.map((test, index) => (
                  <motion.div
                    key={test._id}
                    className="test-card"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => startTest(test)}
                  >
                    <div className="test-header">
                      <h4>{test.title}</h4>
                      <span className="test-subject">{test.subject}</span>
                    </div>
                    <div className="test-info">
                      <div className="test-meta">
                        <span>📝 {test.questions.length} questions</span>
                        <span>⏱️ {test.timeLimit || 30} min</span>
                      </div>
                      <div className="test-teacher">
                        By: {test.teacherId?.profile.firstName} {test.teacherId?.profile.lastName}
                      </div>
                    </div>
                    <div className="start-button">
                      🚀 Start Test
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <TestAttemptNew
            test={currentTest}
            user={user}
            onComplete={handleTestComplete}
            onBack={handleBackToDashboard}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboard;
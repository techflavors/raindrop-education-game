import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BattleArena from './BattleArena';
import './ChallengeCenter.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Safe helper to parse stored user; protects against missing or malformed data
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to parse stored user:', err);
    return null;
  }
};

const ChallengeCenter = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [availableChallengers, setAvailableChallengers] = useState([]);
  const [unlockInfo, setUnlockInfo] = useState([]);
  const [pendingChallenges, setPendingChallenges] = useState({ sent: [], received: [] });
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [activeBattle, setActiveBattle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [challengeForm, setChallengeForm] = useState({
    subject: 'Math',
    difficulty: 'advanced',
    wagerRaindrops: 5,
    message: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadPendingChallenges, 5000); // Check for new challenges every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadAvailableChallengers(),
      loadPendingChallenges(),
      loadChallengeHistory()
    ]);
  };

  const loadAvailableChallengers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/challenges/available-challengers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load challengers');
      
      const data = await response.json();
      setAvailableChallengers(data.challengers || []);
      setUnlockInfo(data.unlockInfo || []);
    } catch (error) {
      console.error('Error loading challengers:', error);
    }
  };

  const loadPendingChallenges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/challenges/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load pending challenges');
      
      const data = await response.json();
      setPendingChallenges(data);
    } catch (error) {
      console.error('Error loading pending challenges:', error);
    }
  };

  const loadChallengeHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/challenges/history?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load challenge history');
      
      const data = await response.json();
      setChallengeHistory(data.challenges || []);
    } catch (error) {
      console.error('Error loading challenge history:', error);
    }
  };

  const sendChallenge = async () => {
    if (!selectedStudent) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/challenges/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          challengedStudentId: selectedStudent._id,
          subject: challengeForm.subject,
          difficulty: challengeForm.difficulty,
          wagerRaindrops: challengeForm.wagerRaindrops,
          message: challengeForm.message || 'I challenge you to a battle!'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send challenge');
      }
      
      setSelectedStudent(null);
      setChallengeForm({
        subject: 'Math',
        difficulty: 'advanced',
        wagerRaindrops: 5,
        message: ''
      });
      
      await loadPendingChallenges();
      setActiveTab('pending');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const acceptChallenge = async (challengeId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept challenge');
      }
      
      const data = await response.json();
      setActiveBattle(data.battleId);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const declineChallenge = async (challengeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/challenges/${challengeId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to decline challenge');
      
      await loadPendingChallenges();
    } catch (error) {
      setError(error.message);
    }
  };

  const cancelChallenge = async (challengeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/challenges/${challengeId}/cancel`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to cancel challenge');
      
      await loadPendingChallenges();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleBattleComplete = (winner) => {
    setActiveBattle(null);
    loadData(); // Refresh all data
    setActiveTab('history');
  };

  if (activeBattle) {
    return <BattleArena battleId={activeBattle} onBattleComplete={handleBattleComplete} />;
  }

  return (
    <div className="challenge-center">
      <div className="challenge-header">
        <h1>🌧️ Challenge Center</h1>
        <p>Battle other students and collect raindrops!</p>
      </div>

      {error && (
        <motion.div 
          className="error-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {error}
          <button onClick={() => setError('')}>×</button>
        </motion.div>
      )}

      <div className="challenge-tabs">
        <button 
          className={`tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Students ({availableChallengers.length})
        </button>
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingChallenges.sent.length + pendingChallenges.received.length})
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History ({challengeHistory.length})
        </button>
      </div>

      <div className="challenge-content">
        <AnimatePresence mode="wait">
          {activeTab === 'browse' && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="browse-tab"
            >
              <div className="browse-header">
                <h3>Available Students to Challenge</h3>
                <p>Find students in your grade to battle against!</p>
                
                {/* Unlock Status Display */}
                <div className="unlock-status">
                  <h4>Challenge Difficulty Unlocks</h4>
                  <div className="unlock-grid">
                    {unlockInfo.map(difficultyInfo => (
                      <div 
                        key={difficultyInfo.difficulty} 
                        className={`unlock-item ${difficultyInfo.isUnlocked ? 'unlocked' : 'locked'}`}
                      >
                        <div className="unlock-icon">
                          {difficultyInfo.isUnlocked ? '🔓' : '🔒'}
                        </div>
                        <div className="unlock-details">
                          <span className="unlock-name">{difficultyInfo.name}</span>
                          <span className="unlock-requirement">
                            {difficultyInfo.isUnlocked 
                              ? 'Unlocked!' 
                              : `${difficultyInfo.raindropsRequired - difficultyInfo.currentRaindrops} more raindrops needed`
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {availableChallengers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h4>No students available</h4>
                  <p>There are no other students in your grade online right now.</p>
                </div>
              ) : (
                <div className="students-grid">
                  {availableChallengers.map(student => (
                    <motion.div
                      key={student._id}
                      className="student-card"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="student-info">
                        <h4>{student.profile.firstName} {student.profile.lastName}</h4>
                        <div className="student-stats">
                          <span className="grade">Grade {student.profile.grade}</span>
                          <span className="raindrops">{student.totalRaindrops || 0} 💧</span>
                        </div>
                        <div className="student-performance">
                          <span>Wins: {student.battleStats?.wins || 0}</span>
                          <span>Battles: {student.battleStats?.total || 0}</span>
                        </div>
                      </div>
                      <button 
                        className="challenge-btn"
                        onClick={() => setSelectedStudent(student)}
                      >
                        Challenge
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="pending-tab"
            >
              <div className="pending-section">
                <h3>Received Challenges ({pendingChallenges.received.length})</h3>
                {pendingChallenges.received.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📬</div>
                    <p>No pending challenge invitations</p>
                  </div>
                ) : (
                  <div className="challenges-list">
                    {pendingChallenges.received.map(challenge => (
                      <motion.div
                        key={challenge._id}
                        className="challenge-card received"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="challenge-info">
                          <div className="challenger-name">
                            {challenge.challenger.profile.firstName} {challenge.challenger.profile.lastName}
                          </div>
                          <div className="challenge-details">
                            <span className="subject">{challenge.subject}</span>
                            <span className="difficulty">{challenge.difficulty}</span>
                            <span className="wager">{challenge.wagerRaindrops} 💧</span>
                          </div>
                          <div className="challenge-message">
                            "{challenge.message}"
                          </div>
                          <div className="challenge-time">
                            {new Date(challenge.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="challenge-actions">
                          <button 
                            className="accept-btn"
                            onClick={() => acceptChallenge(challenge._id)}
                            disabled={loading}
                          >
                            Accept
                          </button>
                          <button 
                            className="decline-btn"
                            onClick={() => declineChallenge(challenge._id)}
                            disabled={loading}
                          >
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pending-section">
                <h3>Sent Challenges ({pendingChallenges.sent.length})</h3>
                {pendingChallenges.sent.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📤</div>
                    <p>No sent challenges pending</p>
                  </div>
                ) : (
                  <div className="challenges-list">
                    {pendingChallenges.sent.map(challenge => (
                      <motion.div
                        key={challenge._id}
                        className="challenge-card sent"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="challenge-info">
                          <div className="challenger-name">
                            To: {challenge.challenged.profile.firstName} {challenge.challenged.profile.lastName}
                          </div>
                          <div className="challenge-details">
                            <span className="subject">{challenge.subject}</span>
                            <span className="difficulty">{challenge.difficulty}</span>
                            <span className="wager">{challenge.wagerRaindrops} 💧</span>
                          </div>
                          <div className="challenge-message">
                            "{challenge.message}"
                          </div>
                          <div className="challenge-time">
                            Sent: {new Date(challenge.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="challenge-actions">
                          <button 
                            className="cancel-btn"
                            onClick={() => cancelChallenge(challenge._id)}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="history-tab"
            >
              <div className="history-header">
                <h3>Battle History</h3>
                <p>Review your past battles and track your progress</p>
              </div>

              {challengeHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📜</div>
                  <h4>No battle history yet</h4>
                  <p>Complete some battles to see your history here!</p>
                </div>
              ) : (
                <div className="history-list">
                  {challengeHistory.map(challenge => {
                    const user = getStoredUser();
                    const isChallenger = user ? challenge.challenger._id === user._id : false;
                    const opponent = isChallenger ? challenge.challenged : challenge.challenger;
                    const isWinner = user ? challenge.winner?._id === user._id : false;
                    
                    return (
                      <motion.div
                        key={challenge._id}
                        className={`history-card ${challenge.status} ${isWinner ? 'won' : challenge.winner ? 'lost' : 'tied'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="history-result">
                          {challenge.status === 'completed' ? (
                            <div className={`result-badge ${isWinner ? 'won' : challenge.winner ? 'lost' : 'tied'}`}>
                              {isWinner ? '🏆 Won' : challenge.winner ? '😔 Lost' : '🤝 Tied'}
                            </div>
                          ) : (
                            <div className="result-badge declined">
                              {challenge.status === 'declined' ? '❌ Declined' : '⏰ Expired'}
                            </div>
                          )}
                        </div>
                        
                        <div className="history-info">
                          <div className="opponent-name">
                            vs {opponent.profile.firstName} {opponent.profile.lastName}
                          </div>
                          <div className="battle-details">
                            <span className="subject">{challenge.subject}</span>
                            <span className="difficulty">{challenge.difficulty}</span>
                            <span className="wager">{challenge.wagerRaindrops} 💧</span>
                          </div>
                          
                          {challenge.finalScores && (
                            <div className="final-scores">
                              <div className="score">
                                You: {isChallenger ? challenge.finalScores.challenger.score : challenge.finalScores.challenged.score} pts
                              </div>
                              <div className="score">
                                {opponent.profile.firstName}: {isChallenger ? challenge.finalScores.challenged.score : challenge.finalScores.challenger.score} pts
                              </div>
                            </div>
                          )}
                          
                          <div className="battle-time">
                            {new Date(challenge.completedAt || challenge.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Challenge Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            className="challenge-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              className="challenge-modal"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Challenge {selectedStudent.profile.firstName}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedStudent(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-content">
                <div className="form-group">
                  <label>Subject</label>
                  <select
                    value={challengeForm.subject}
                    onChange={(e) => setChallengeForm({...challengeForm, subject: e.target.value})}
                  >
                    <option value="Math">Math</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="History">History</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Difficulty</label>
                  <select
                    value={challengeForm.difficulty}
                    onChange={(e) => setChallengeForm({...challengeForm, difficulty: e.target.value})}
                  >
                    {unlockInfo.map(difficultyInfo => (
                      <option 
                        key={difficultyInfo.difficulty} 
                        value={difficultyInfo.difficulty}
                        disabled={!difficultyInfo.isUnlocked}
                      >
                        {difficultyInfo.name} 
                        {!difficultyInfo.isUnlocked && ` (Requires ${difficultyInfo.raindropsRequired} 💧)`}
                        {difficultyInfo.isUnlocked && ' ✓'}
                      </option>
                    ))}
                  </select>
                  {unlockInfo.find(d => d.difficulty === challengeForm.difficulty) && 
                   !unlockInfo.find(d => d.difficulty === challengeForm.difficulty).isUnlocked && (
                    <div className="unlock-warning">
                      <span className="warning-icon">🔒</span>
                      <span>
                        You need {unlockInfo.find(d => d.difficulty === challengeForm.difficulty).raindropsRequired} raindrops 
                        to unlock {unlockInfo.find(d => d.difficulty === challengeForm.difficulty).name}.
                        You currently have {unlockInfo.find(d => d.difficulty === challengeForm.difficulty).currentRaindrops} raindrops.
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Wager (Raindrops)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={challengeForm.wagerRaindrops}
                    onChange={(e) => setChallengeForm({...challengeForm, wagerRaindrops: parseInt(e.target.value)})}
                  />
                </div>

                <div className="form-group">
                  <label>Challenge Message (Optional)</label>
                  <textarea
                    placeholder="Send a message with your challenge..."
                    value={challengeForm.message}
                    onChange={(e) => setChallengeForm({...challengeForm, message: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setSelectedStudent(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="send-challenge-btn"
                    onClick={sendChallenge}
                    disabled={loading || !unlockInfo.find(d => d.difficulty === challengeForm.difficulty)?.isUnlocked}
                  >
                    {loading ? 'Sending...' : 'Send Challenge'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChallengeCenter;
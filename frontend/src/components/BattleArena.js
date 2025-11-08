import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BattleArena.css';

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

const BattleArena = ({ battleId, onBattleComplete }) => {
  const [battle, setBattle] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAnswering, setIsAnswering] = useState(false);
  const [battleStatus, setBattleStatus] = useState('waiting');
  const [myProgress, setMyProgress] = useState({ answersCompleted: 0, totalScore: 0, totalRaindrops: 0 });
  const [opponentProgress, setOpponentProgress] = useState({ answersCompleted: 0, totalScore: 0, totalRaindrops: 0 });
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const timerRef = useRef(null);
  const questionStartTime = useRef(Date.now());
  const statusPollRef = useRef(null);

  useEffect(() => {
    if (battleId) {
      fetchBattleDetails();
      startStatusPolling();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [battleId]);

  useEffect(() => {
    if (battleStatus === 'in-progress' && timeLeft > 0 && !showResult) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [battleStatus, timeLeft, showResult]);

  const fetchBattleDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/battles/${battleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch battle details');
      
      const data = await response.json();
      setBattle(data.battle);
      setBattleStatus(data.battle.status);
      
      // Set current question based on progress
      const storedUser = getStoredUser();
      const myAnswersCount = storedUser
        ? data.battle.participants.find(p => p.studentId._id === storedUser._id)?.answers?.length || 0
        : 0;

      setCurrentQuestionIndex(myAnswersCount);
      setLoading(false);
    } catch (error) {
      setError('Failed to load battle: ' + error.message);
      setLoading(false);
    }
  };

  const startStatusPolling = () => {
    statusPollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/battles/${battleId}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const status = data.status;
        
        setBattleStatus(status.battleStatus);
        setMyProgress(status.myProgress);
        setOpponentProgress(status.opponentProgress);
        
        if (status.battleStatus === 'completed') {
          if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
          }
          onBattleComplete?.(status.winner);
        }
      } catch (error) {
        console.error('Error polling battle status:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleReady = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/battles/${battleId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to ready up');
      
      const data = await response.json();
      setIsReady(true);
      
      if (data.battle?.status === 'in-progress') {
        setBattleStatus('in-progress');
        questionStartTime.current = Date.now();
        setTimeLeft(30);
      }
    } catch (error) {
      setError('Failed to ready up: ' + error.message);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    if (isAnswering || showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null || isAnswering) return;
    
    setIsAnswering(true);
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/battles/${battleId}/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          questionOrder: currentQuestionIndex + 1,
          selectedAnswer: selectedAnswer,
          timeSpent: Math.min(timeSpent, 30)
        })
      });
      
      if (!response.ok) throw new Error('Failed to submit answer');
      
      const data = await response.json();
      setLastResult(data.result);
      setMyProgress(data.battle.myProgress);
      setOpponentProgress(data.battle.opponentProgress);
      setBattleStatus(data.battle.status);
      
      // Show result for 3 seconds
      setShowResult(true);
      setTimeout(() => {
        setShowResult(false);
        setSelectedAnswer(null);
        setCurrentQuestionIndex(prev => prev + 1);
        questionStartTime.current = Date.now();
        setTimeLeft(30);
        setIsAnswering(false);
        
        if (data.battle.isComplete) {
          onBattleComplete?.(data.battle.winner);
        }
      }, 3000);
      
    } catch (error) {
      setError('Failed to submit answer: ' + error.message);
      setIsAnswering(false);
    }
  };

  const handleAutoSubmit = () => {
    if (selectedAnswer !== null) {
      handleSubmitAnswer();
    } else {
      // Auto-submit with no answer
      setSelectedAnswer(-1); // Invalid answer
      setTimeout(() => handleSubmitAnswer(), 100);
    }
  };

  const handleForfeit = async () => {
    if (!window.confirm('Are you sure you want to forfeit this battle?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/battles/${battleId}/forfeit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to forfeit');
      
      const data = await response.json();
      onBattleComplete?.(data.winner);
    } catch (error) {
      setError('Failed to forfeit: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="battle-arena loading">
        <div className="loading-spinner">
          <div className="raindrop-spinner"></div>
          <p>Loading battle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="battle-arena error">
        <div className="error-message">
          <h3>Battle Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="battle-arena error">
        <div className="error-message">
          <h3>Battle Not Found</h3>
          <p>This battle doesn't exist or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = battle.challengeId?.questions?.[currentQuestionIndex];
  const user = getStoredUser();
  const opponent = user ? battle.participants.find(p => p.studentId._id !== user._id) : battle.participants[0];
  const totalQuestions = battle.challengeId?.questions?.length || 0;

  return (
    <div className="battle-arena">
      {/* Battle Header */}
      <div className="battle-header">
        <div className="battle-title">
          <h2>🌧️ Raindrop Battle</h2>
          <div className="battle-info">
            <span className="difficulty">{battle.challengeId?.difficulty}</span>
            <span className="subject">{battle.challengeId?.subject}</span>
          </div>
        </div>
        
        <div className="battle-status">
          <div className="status-indicator">
            Status: <span className={`status ${battleStatus}`}>{battleStatus}</span>
          </div>
          <button className="forfeit-btn" onClick={handleForfeit}>
            Forfeit
          </button>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="battle-progress">
        <div className="player-progress me">
          <div className="player-info">
            <span className="name">You</span>
            <div className="stats">
              <span className="score">{myProgress.totalScore} pts</span>
              <span className="raindrops">{myProgress.totalRaindrops} 💧</span>
            </div>
          </div>
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(myProgress.answersCompleted / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
            <span className="progress-text">
              {myProgress.answersCompleted}/{totalQuestions}
            </span>
          </div>
        </div>

        <div className="vs-divider">VS</div>

        <div className="player-progress opponent">
          <div className="player-info">
            <span className="name">
              {opponent?.studentId?.profile?.firstName} {opponent?.studentId?.profile?.lastName}
            </span>
            <div className="stats">
              <span className="score">{opponentProgress.totalScore} pts</span>
              <span className="raindrops">{opponentProgress.totalRaindrops} 💧</span>
            </div>
          </div>
          <div className="progress-bar">
            <motion.div 
              className="progress-fill opponent"
              initial={{ width: 0 }}
              animate={{ width: `${(opponentProgress.answersCompleted / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
            <span className="progress-text">
              {opponentProgress.answersCompleted}/{totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Battle Content */}
      <div className="battle-content">
        {battleStatus === 'waiting' && (
          <div className="waiting-room">
            <h3>Waiting for Battle to Begin</h3>
            <p>Get ready to face {opponent?.studentId?.profile?.firstName}!</p>
            <div className="ready-status">
              <div className="player-ready">
                <span>You: {isReady ? '✅ Ready' : '⏳ Not Ready'}</span>
              </div>
              <div className="player-ready">
                <span>
                  {opponent?.studentId?.profile?.firstName}: {opponentProgress.isReady ? '✅ Ready' : '⏳ Not Ready'}
                </span>
              </div>
            </div>
            {!isReady && (
              <button className="ready-btn" onClick={handleReady}>
                I'm Ready!
              </button>
            )}
          </div>
        )}

        {battleStatus === 'in-progress' && currentQuestion && !showResult && (
          <div className="question-area">
            <div className="question-header">
              <div className="question-number">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </div>
              <div className="timer">
                <motion.div 
                  className="timer-fill"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 30) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
                <span className="timer-text">{timeLeft}s</span>
              </div>
            </div>

            <div className="question-content">
              <h3 className="question-text">{currentQuestion.questionId.questionText}</h3>
              
              {currentQuestion.questionId.imageUrl && (
                <img 
                  src={currentQuestion.questionId.imageUrl} 
                  alt="Question" 
                  className="question-image"
                />
              )}

              <div className="answer-options">
                {currentQuestion.questionId.options.map((option, index) => (
                  <motion.button
                    key={index}
                    className={`answer-option ${selectedAnswer === index ? 'selected' : ''}`}
                    onClick={() => handleAnswerSelect(index)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isAnswering}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    <span className="option-text">{option}</span>
                  </motion.button>
                ))}
              </div>

              <button 
                className="submit-btn"
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null || isAnswering}
              >
                {isAnswering ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        )}

        {showResult && lastResult && (
          <motion.div 
            className="result-display"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className={`result-icon ${lastResult.isCorrect ? 'correct' : 'incorrect'}`}>
              {lastResult.isCorrect ? '✅' : '❌'}
            </div>
            <h3>{lastResult.isCorrect ? 'Correct!' : 'Incorrect'}</h3>
            <div className="result-details">
              <div className="points-earned">+{lastResult.points} points</div>
              <div className="raindrops-earned">+{lastResult.raindrops} 💧</div>
            </div>
            {lastResult.explanation && (
              <div className="explanation">
                <strong>Explanation:</strong> {lastResult.explanation}
              </div>
            )}
          </motion.div>
        )}

        {battleStatus === 'completed' && (
          <div className="battle-complete">
            <h3>Battle Complete!</h3>
            <div className="final-scores">
              <div className="final-score">
                <h4>Your Score</h4>
                <div className="score-details">
                  <span className="points">{myProgress.totalScore} points</span>
                  <span className="raindrops">{myProgress.totalRaindrops} raindrops</span>
                </div>
              </div>
              <div className="final-score">
                <h4>Opponent's Score</h4>
                <div className="score-details">
                  <span className="points">{opponentProgress.totalScore} points</span>
                  <span className="raindrops">{opponentProgress.totalRaindrops} raindrops</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleArena;
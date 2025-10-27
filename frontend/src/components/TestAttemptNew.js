import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RaindropCup from './RaindropCup';
import '../styles/TestAttemptNew.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const TestAttempt = ({ test, user, onComplete, onBack, onNavigateToChallenges }) => {
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(test?.timeLimit ? test.timeLimit * 60 : 1800);
  const [raindropsCollected, setRaindropsCollected] = useState(0);
  const [fallingDrops, setFallingDrops] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0);

  // Compute derived values
  const currentQuestion = test?.questions?.[currentQuestionIndex]?.questionId;

  // ALL useCallback AND useEffect HOOKS MUST BE BEFORE CONDITIONAL RETURNS
  const submitTest = useCallback(async () => {
    if (!test) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Ensure all questions have an answer (use empty string for unanswered)
      const completeAnswers = {};
      test.questions.forEach(questionData => {
        const questionId = questionData.questionId._id;
        completeAnswers[questionId] = answers[questionId] || '';
      });
      
      console.log('=== TEST SUBMISSION ===');
      console.log('Test ID:', test._id);
      console.log('Test Title:', test.title);
      console.log('Total Questions:', test.questions.length);
      console.log('Time Spent:', (test.timeLimit * 60) - timeLeft, 'seconds');
      console.log('Complete Answers Object:', completeAnswers);
      
      // Log each question with its answer
      console.log('--- Question-Answer Mapping ---');
      test.questions.forEach((questionData, index) => {
        const questionId = questionData.questionId._id;
        const questionText = questionData.questionId.text || questionData.questionId.question || 'Question text not available';
        const studentAnswer = completeAnswers[questionId];
        const correctAnswer = questionData.questionId.answers.find(ans => ans.isCorrect)?.text;
        
        console.log(`Q${index + 1}: ${questionText}`);
        console.log(`  Question ID: ${questionId}`);
        console.log(`  Student Answer: "${studentAnswer}"`);
        console.log(`  Correct Answer: "${correctAnswer}"`);
        console.log(`  Status: ${studentAnswer === correctAnswer ? 'CORRECT ✓' : 'INCORRECT ✗'}`);
        console.log('  Full Question Object:', questionData.questionId);
        console.log('---');
      });
      console.log('=======================');
      
      const response = await fetch(`${API_URL}/tests/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testId: test._id,
          answers: completeAnswers,
          timeSpent: (test.timeLimit * 60) - timeLeft
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Submission result:', result);
        onComplete(result);
      } else {
        console.error('HTTP Status:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('Server error response:', errorData);
          alert('Error submitting test: ' + (errorData.message || 'Unknown error'));
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          const textError = await response.text();
          console.error('Raw error response:', textError);
          alert('Error submitting test. Check console for details.');
        }
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Error submitting test. Please try again.');
    }
  }, [test, answers, timeLeft, onComplete]);

  // Initialize falling raindrops for current question
  useEffect(() => {
    if (!test || !currentQuestion || !currentQuestion.answers) return;
    
    // Log current question and answers for debugging
    console.log('=== CURRENT QUESTION ===');
    console.log('Question ID:', currentQuestion._id);
    console.log('Question Text:', currentQuestion.text);
    console.log('Question Type:', currentQuestion.type);
    console.log('Difficulty:', currentQuestion.difficulty);
    console.log('Answers:');
    currentQuestion.answers.forEach((answer, index) => {
      console.log(`  ${index + 1}. ${answer.text} ${answer.isCorrect ? '(CORRECT)' : ''}`);
    });
    console.log('========================');
    
    // Create array of available positions and shuffle them for randomization
    const availablePositions = [];
    for (let i = 0; i < 4; i++) {
      availablePositions.push(i);
    }
    // Fisher-Yates shuffle for truly random positions each question
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }
    
    const drops = currentQuestion.answers.map((answer, index) => {
      // RANDOM DISTRIBUTION: Use shuffled positions instead of sequential zones
      const screenWidth = 90; // Use 90% of screen width
      const minMargin = 5; // Margin from edges
      
      // Use shuffled position instead of index-based position
      const positionIndex = availablePositions[index];
      const zoneWidth = screenWidth / 4; // Always 4 zones for consistency
      const zoneStart = minMargin + (zoneWidth * positionIndex);
      const zoneEnd = zoneStart + zoneWidth;
      
      // Random position within the assigned zone
      const randomX = zoneStart + Math.random() * (zoneEnd - zoneStart);
      
      // Color variations for visual distinction
      const colors = [
        ['#4A90E2', '#7BB3F0'], // Blue
        ['#2ECC71', '#58D68D'], // Green  
        ['#E74C3C', '#F1948A'], // Red
        ['#9B59B6', '#BB8FCE'], // Purple
        ['#F39C12', '#F7DC6F'], // Orange
        ['#1ABC9C', '#7DCEA0']  // Teal
      ];
      
      return {
        id: `${currentQuestionIndex}-${index}`,
        text: answer.text,
        x: randomX, // Randomized position using shuffled zones
        y: -100 - Math.random() * 100, // Start closer to screen for immediate visibility
        speed: 0.8 + Math.random() * 0.4, // Slower speed (0.8-1.2) to give more time to read
        answered: false,
        rotation: Math.random() * 360,
        delay: Math.random() * 300, // Slightly longer delay (0-300ms) for better spacing
        colorIndex: index % colors.length, // Assign color based on index
        stopped: false, // Track if raindrop has stopped at bottom
        wasClickedWhileFalling: false // Track timing bonus eligibility
      };
    });
    
    // Sort by delay to create staggered appearance
    drops.sort((a, b) => a.delay - b.delay);
    setFallingDrops(drops);
  }, [currentQuestionIndex, currentQuestion, test]);

  // Animate falling drops
  useEffect(() => {
    if (!test) return;
    
    const animationTimer = setInterval(() => {
      setFallingDrops(prev => 
        prev.map(drop => {
          // Start falling immediately with minimal delay
          const currentTime = Date.now();
          const shouldFall = currentTime - (drop.startTime || currentTime) > (drop.delay || 0);
          
          if (!shouldFall) {
            return {
              ...drop,
              startTime: drop.startTime || currentTime
            };
          }
          
          // Calculate bottom stopping position - stop at the very bottom of canvas
          const canvasHeight = window.innerHeight * 0.7; // 70vh canvas height
          const bottomPosition = canvasHeight - 100; // Stop near bottom edge with small margin
          
          const newY = drop.y + drop.speed;
          const hasReachedBottom = newY >= bottomPosition;
          
          return {
            ...drop,
            y: hasReachedBottom ? bottomPosition : newY,
            rotation: hasReachedBottom ? 0 : drop.rotation + 1.5, // Stop rotation when at bottom for readability
            stopped: hasReachedBottom,
            startTime: drop.startTime || currentTime
          };
        })
        // Don't filter out drops - let them stay at bottom
      );
    }, 40); // Slightly faster animation loop (40ms instead of 50ms)

    return () => clearInterval(animationTimer);
  }, [test]);

  // Timer countdown
  useEffect(() => {
    if (!test) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitTest, test]);



  const handleDropClick = (selectedAnswer) => {
    const questionId = currentQuestion._id;
    const correctAnswer = currentQuestion.answers.find(ans => ans.isCorrect);
    const isCorrect = selectedAnswer === correctAnswer?.text;
    
    // Find the clicked drop to check timing
    const clickedDrop = fallingDrops.find(drop => drop.text === selectedAnswer);
    const wasClickedWhileFalling = clickedDrop && !clickedDrop.stopped;

    // Log answer selection for debugging
    console.log('=== ANSWER SELECTED ===');
    console.log('Question:', currentQuestion.text);
    console.log('Selected Answer:', selectedAnswer);
    console.log('Correct Answer:', correctAnswer?.text);
    console.log('Is Correct:', isCorrect);
    console.log('Was Clicked While Falling:', wasClickedWhileFalling);
    console.log('=======================');

    // Update answers
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedAnswer
    }));

    // Mark drop as answered and track timing
    setFallingDrops(prev => 
      prev.map(drop => 
        drop.text === selectedAnswer 
          ? { ...drop, answered: true, wasClickedWhileFalling }
          : drop
      )
    );

    // Show feedback
    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);

    if (isCorrect) {
      const basePoints = getDifficultyPoints(currentQuestion.difficulty);
      let totalPoints = basePoints;
      let bonus = 0;
      
      // Extra credits for clicking while falling
      if (wasClickedWhileFalling) {
        bonus = Math.ceil(basePoints * 0.5); // 50% bonus for timing
        totalPoints += bonus;
        setBonusPoints(bonus);
      } else {
        setBonusPoints(0);
      }
      
      setRaindropsCollected(prev => prev + totalPoints);
    } else {
      setBonusPoints(0);
    }

    // Auto-proceed after feedback
    setTimeout(() => {
      setShowFeedback(false);
      if (currentQuestionIndex < test.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // Mark test as completed instead of auto-submitting
        setTestCompleted(true);
      }
    }, isCorrect ? 2000 : 1000);
  };

  const getDifficultyPoints = (difficulty) => {
    const pointMap = {
      'easy': 1, 'beginner': 1,
      'medium': 2,
      'advanced': 3, 'expert': 5
    };
    return pointMap[difficulty] || 1;
  };

  const skipQuestion = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setTestCompleted(true);
    }
  };

  const finishTest = () => {
    submitTest();
  };

  const goToDashboard = () => {
    onBack();
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevQuestionId = test.questions[currentQuestionIndex - 1]?.questionId._id;
      const prevCorrectAnswer = test.questions[currentQuestionIndex - 1]?.questionId.answers.find(ans => ans.isCorrect);
      const wasAnsweredCorrectly = answers[prevQuestionId] === prevCorrectAnswer?.text;
      
      // Can only go back if previous question was not answered correctly
      if (!wasAnsweredCorrectly) {
        setCurrentQuestionIndex(prev => prev - 1);
      }
    }
  };

  const canGoPrevious = () => {
    if (currentQuestionIndex === 0) return false;
    const prevQuestionId = test.questions[currentQuestionIndex - 1]?.questionId._id;
    const prevCorrectAnswer = test.questions[currentQuestionIndex - 1]?.questionId.answers.find(ans => ans.isCorrect);
    const wasAnsweredCorrectly = answers[prevQuestionId] === prevCorrectAnswer?.text;
    return !wasAnsweredCorrectly;
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    return ((currentQuestionIndex + 1) / test.questions.length) * 100;
  };

  // Show completion screen when test is finished
  if (testCompleted) {
    const timeRemaining = timeLeft;
    const hasTimeRemaining = timeRemaining > 0;
    
    return (
      <div className="test-completion-screen">
        <div className="completion-content">
          <div className="completion-header">
            <h1>🎉 Test Completed! 🎉</h1>
            <div className="final-score">
              <div className="raindrops-earned">
                <span className="raindrop-icon">💧</span>
                <span className="score-number">{raindropsCollected}</span>
                <span className="score-label">Raindrops Collected</span>
              </div>
            </div>
          </div>
          
          <div className="completion-stats">
            <div className="stat-item">
              <div className="stat-number">{test.questions.length}</div>
              <div className="stat-label">Questions Answered</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{Math.floor(((test.timeLimit * 60) - timeLeft) / 60)}</div>
              <div className="stat-label">Minutes Taken</div>
            </div>
            {hasTimeRemaining && (
              <div className="stat-item highlight">
                <div className="stat-number">{Math.floor(timeRemaining / 60)}</div>
                <div className="stat-label">Minutes Remaining</div>
              </div>
            )}
          </div>
          
          {hasTimeRemaining && (
            <motion.div 
              className="challenge-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="challenge-message">
                <span className="trophy-icon">🏆</span>
                <h2>Great job finishing early!</h2>
                <p>Ready to challenge other students with harder questions?</p>
              </div>
            </motion.div>
          )}
          
          <div className="completion-actions">
            {hasTimeRemaining && onNavigateToChallenges && (
              <button className="challenge-others-btn" onClick={onNavigateToChallenges}>
                <span className="btn-icon">⚔️</span>
                <span>Challenge Others</span>
              </button>
            )}
            <button className="finish-btn" onClick={finishTest}>
              Submit & View Results
            </button>
            <button className="dashboard-btn" onClick={goToDashboard}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion || !currentQuestion.answers) {
    return (
      <div className="test-attempt-error">
        <h2>Loading question...</h2>
        <button onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="test-attempt-game">
      {/* ROW 1: Progress bar and Timer (10%) */}
      <motion.div 
        className="row-1-progress-timer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="question-progress">
          <div className="progress-text">
            Question {currentQuestionIndex + 1} of {test.questions.length}
          </div>
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              animate={{ width: `${getProgress()}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        <div className={`timer ${timeLeft < 300 ? 'warning' : ''}`}>
          <span className="timer-icon">⏰</span>
          <span className="timer-text">{formatTime(timeLeft)}</span>
        </div>
      </motion.div>

      {/* ROW 2: Show Question (20%) */}
      <motion.div 
        className="row-2-question"
        key={currentQuestionIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="question-content">
          <h2 className="question-text">{currentQuestion.questionText}</h2>
          {currentQuestion.imageUrl && (
            <img 
              src={currentQuestion.imageUrl} 
              alt="Question" 
              className="question-image"
            />
          )}
        </div>
      </motion.div>

      {/* ROW 3: Cup (10%) and Canvas with falling raindrops (50%) - 60% total */}
      <div className="row-3-game-area">
        {/* Left side: Raindrop Cup */}
        <div className="cup-sidebar">
          <RaindropCup 
            totalRaindrops={raindropsCollected} 
            showDetails={false}
            size="small"
          />
        </div>

        {/* Right side: Answer Canvas */}
        <div className="raindrop-canvas">
          {/* Falling raindrops with answers */}
          <AnimatePresence>
            {fallingDrops.map((drop) => (
              <div
                key={drop.id}
                className={`falling-raindrop ${drop.answered ? 'answered' : ''} ${drop.stopped ? 'stopped-at-bottom' : ''}`}
                onClick={() => !drop.answered && handleDropClick(drop.text)}
                style={{
                  position: 'absolute',
                  left: `${drop.x}%`,
                  top: `${drop.y}px`,
                  transform: `translate(-50%, -50%) rotate(${drop.rotation}deg)`,
                  pointerEvents: drop.answered ? 'none' : 'auto',
                  transition: drop.stopped ? 'transform 0.5s ease, opacity 0.3s ease' : 'opacity 0.3s ease',
                  opacity: drop.answered ? 0.3 : 1,
                  cursor: drop.answered ? 'not-allowed' : (drop.stopped ? 'pointer' : 'pointer'),
                  zIndex: drop.stopped ? 15 : 10
                }}
              >
                <div 
                  className="raindrop-content"
                  style={{
                    background: (() => {
                      if (drop.answered) return 'linear-gradient(45deg, #95A5A6, #7F8C8D)';
                      
                      const colors = [
                        'linear-gradient(45deg, #4A90E2, #7BB3F0)', // Blue
                        'linear-gradient(45deg, #2ECC71, #58D68D)', // Green
                        'linear-gradient(45deg, #E74C3C, #F1948A)', // Red
                        'linear-gradient(45deg, #9B59B6, #BB8FCE)', // Purple
                        'linear-gradient(45deg, #F39C12, #F7DC6F)', // Orange
                        'linear-gradient(45deg, #1ABC9C, #7DCEA0)'  // Teal
                      ];
                      
                      return colors[drop.colorIndex || 0];
                    })()
                  }}
                >
                  <span className="drop-icon">💧</span>
                  <span className="drop-text">{drop.text}</span>
                </div>
              </div>
            ))}
          </AnimatePresence>

          {/* Feedback overlay */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                className={`feedback-overlay ${lastAnswerCorrect ? 'correct' : 'incorrect'}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <div className="feedback-content">
                  {lastAnswerCorrect ? (
                    <>
                      <div className="feedback-icon">🎉</div>
                      <div className="feedback-text">
                        {bonusPoints > 0 ? 'Perfect Timing!' : 'Excellent!'}
                      </div>
                      <div className="points-earned">
                        +{getDifficultyPoints(currentQuestion.difficulty)} raindrops
                        {bonusPoints > 0 && (
                          <div className="bonus-points">+{bonusPoints} bonus!</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="feedback-icon">💪</div>
                      <div className="feedback-text">Keep trying!</div>
                      <div className="correct-answer">
                        Correct: {currentQuestion.answers.find(ans => ans.isCorrect)?.text}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ROW 4: Navigation buttons (10%) */}
      <div className="row-4-navigation">
        <button 
          className="nav-btn prev-btn"
          onClick={previousQuestion}
          disabled={!canGoPrevious()}
        >
          ⬅️ Previous
        </button>
        
        <button 
          className="nav-btn skip-btn"
          onClick={skipQuestion}
        >
          ⏭️ Skip
        </button>
        
        <button 
          className="nav-btn back-btn"
          onClick={onBack}
        >
          🏠 Dashboard
        </button>
      </div>
    </div>
  );
};

export default TestAttempt;
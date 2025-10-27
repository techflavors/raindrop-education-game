import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './RaindropCup.css';

const RaindropCup = ({ totalRaindrops = 0, showDetails = true, size = 'large' }) => {
  const [animatedRaindrops, setAnimatedRaindrops] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [fallingDrops, setFallingDrops] = useState([]);

  // Cup levels and unlock requirements
  const cupLevels = [
    { level: 0, name: 'Beginner', requiredRaindrops: 0, color: '#87CEEB', unlocks: 'Basic challenges' },
    { level: 1, name: 'Novice', requiredRaindrops: 25, color: '#4682B4', unlocks: 'Advanced challenges' },
    { level: 2, name: 'Apprentice', requiredRaindrops: 75, color: '#1E90FF', unlocks: 'Expert challenges' },
    { level: 3, name: 'Expert', requiredRaindrops: 150, color: '#0066CC', unlocks: 'Master challenges' },
    { level: 4, name: 'Master', requiredRaindrops: 300, color: '#003F7F', unlocks: 'Elite challenges' },
    { level: 5, name: 'Grandmaster', requiredRaindrops: 500, color: '#002B59', unlocks: 'Legendary status' }
  ];

  useEffect(() => {
    // Animate raindrop count
    let start = animatedRaindrops;
    let end = totalRaindrops;
    let duration = 1000; // 1 second
    let startTime = Date.now();

    const animate = () => {
      let now = Date.now();
      let elapsed = now - startTime;
      let progress = Math.min(elapsed / duration, 1);
      
      let current = Math.floor(start + (end - start) * progress);
      setAnimatedRaindrops(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    if (start !== end) {
      animate();
    }
  }, [totalRaindrops]);

  useEffect(() => {
    // Determine current level
    let newLevel = 0;
    for (let i = cupLevels.length - 1; i >= 0; i--) {
      if (totalRaindrops >= cupLevels[i].requiredRaindrops) {
        newLevel = i;
        break;
      }
    }

    if (newLevel > currentLevel) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    setCurrentLevel(newLevel);
  }, [totalRaindrops, currentLevel]);

  useEffect(() => {
    // Add falling raindrops animation when raindrops increase
    if (totalRaindrops > animatedRaindrops) {
      const newDrops = [];
      const dropCount = Math.min(5, totalRaindrops - animatedRaindrops);
      
      for (let i = 0; i < dropCount; i++) {
        newDrops.push({
          id: Date.now() + i,
          x: Math.random() * 80 + 10, // 10% to 90% of container width
          delay: i * 100
        });
      }
      
      setFallingDrops(prev => [...prev, ...newDrops]);
      
      // Remove drops after animation
      setTimeout(() => {
        setFallingDrops(prev => prev.filter(drop => !newDrops.includes(drop)));
      }, 2000);
    }
  }, [totalRaindrops, animatedRaindrops]);

  const getCurrentLevelInfo = () => cupLevels[currentLevel];
  const getNextLevelInfo = () => cupLevels[Math.min(currentLevel + 1, cupLevels.length - 1)];
  
  const currentLevelInfo = getCurrentLevelInfo();
  const nextLevelInfo = getNextLevelInfo();
  
  const isMaxLevel = currentLevel === cupLevels.length - 1;
  const raindropsInCurrentLevel = totalRaindrops - currentLevelInfo.requiredRaindrops;
  const raindropsNeededForNext = isMaxLevel ? 0 : nextLevelInfo.requiredRaindrops - currentLevelInfo.requiredRaindrops;
  const progressPercentage = isMaxLevel ? 100 : (raindropsInCurrentLevel / raindropsNeededForNext) * 100;

  const cupHeight = size === 'large' ? 200 : size === 'medium' ? 150 : 100;
  const cupWidth = size === 'large' ? 120 : size === 'medium' ? 90 : 60;
  const fillHeight = (progressPercentage / 100) * (cupHeight * 0.8); // 80% of cup height

  return (
    <div className={`raindrop-cup ${size}`}>
      {/* Falling Raindrops Animation */}
      <AnimatePresence>
        {fallingDrops.map(drop => (
          <motion.div
            key={drop.id}
            className="falling-drop"
            style={{ left: `${drop.x}%` }}
            initial={{ y: -20, opacity: 1, scale: 0.5 }}
            animate={{ y: cupHeight + 50, opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.5, 
              delay: drop.delay / 1000,
              ease: "easeIn"
            }}
          >
            💧
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Cup Visualization */}
      <div className="cup-container">
        <svg 
          width={cupWidth} 
          height={cupHeight} 
          viewBox={`0 0 ${cupWidth} ${cupHeight}`}
          className="cup-svg"
        >
          {/* Cup outline */}
          <path
            d={`M ${cupWidth * 0.15} ${cupHeight * 0.1} 
                L ${cupWidth * 0.85} ${cupHeight * 0.1}
                L ${cupWidth * 0.8} ${cupHeight * 0.9}
                Q ${cupWidth * 0.8} ${cupHeight * 0.95} ${cupWidth * 0.75} ${cupHeight * 0.95}
                L ${cupWidth * 0.25} ${cupHeight * 0.95}
                Q ${cupWidth * 0.2} ${cupHeight * 0.95} ${cupWidth * 0.2} ${cupHeight * 0.9}
                Z`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="2"
            className="cup-outline"
          />
          
          {/* Water fill */}
          <motion.path
            d={`M ${cupWidth * 0.2} ${cupHeight * 0.9 - fillHeight * 0.8}
                L ${cupWidth * 0.8} ${cupHeight * 0.9 - fillHeight * 0.8}
                L ${cupWidth * 0.8} ${cupHeight * 0.9}
                Q ${cupWidth * 0.8} ${cupHeight * 0.95} ${cupWidth * 0.75} ${cupHeight * 0.95}
                L ${cupWidth * 0.25} ${cupHeight * 0.95}
                Q ${cupWidth * 0.2} ${cupHeight * 0.95} ${cupWidth * 0.2} ${cupHeight * 0.9}
                Z`}
            fill={currentLevelInfo.color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.5 }}
            className="cup-fill"
          />
          
          {/* Water surface animation */}
          {fillHeight > 0 && (
            <motion.ellipse
              cx={cupWidth / 2}
              cy={cupHeight * 0.9 - fillHeight * 0.8}
              rx={cupWidth * 0.3}
              ry="3"
              fill={currentLevelInfo.color}
              animate={{ 
                opacity: [0.6, 1, 0.6],
                ry: [2, 4, 2]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
          
          {/* Cup handle */}
          <path
            d={`M ${cupWidth * 0.85} ${cupHeight * 0.3}
                Q ${cupWidth * 0.95} ${cupHeight * 0.3} ${cupWidth * 0.95} ${cupHeight * 0.5}
                Q ${cupWidth * 0.95} ${cupHeight * 0.7} ${cupWidth * 0.85} ${cupHeight * 0.7}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="3"
            className="cup-handle"
          />
        </svg>

        {/* Level indicator */}
        <div className="level-indicator">
          <span className={`level-badge level-${currentLevel}`}>
            {currentLevelInfo.name}
          </span>
        </div>

        {/* Raindrop counter */}
        <div className="raindrop-counter">
          <motion.span 
            className="raindrop-count"
            key={animatedRaindrops}
            initial={{ scale: 1.2, color: '#00bfff' }}
            animate={{ scale: 1, color: '#4A90E2' }}
            transition={{ duration: 0.3 }}
          >
            💧 {animatedRaindrops}
          </motion.span>
        </div>
      </div>

      {/* Detailed Progress Info */}
      {showDetails && (
        <div className="cup-details">
          <div className="progress-info">
            <div className="progress-bar-container">
              <div className="progress-labels">
                <span className="current-progress">
                  {raindropsInCurrentLevel}/{isMaxLevel ? '∞' : raindropsNeededForNext}
                </span>
                {!isMaxLevel && (
                  <span className="next-level">
                    Next: {nextLevelInfo.name}
                  </span>
                )}
              </div>
              <div className="progress-bar">
                <motion.div 
                  className="progress-fill"
                  style={{ backgroundColor: currentLevelInfo.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              {!isMaxLevel && (
                <div className="raindrops-needed">
                  {nextLevelInfo.requiredRaindrops - totalRaindrops} more raindrops to level up!
                </div>
              )}
            </div>
          </div>

          <div className="unlock-info">
            <h4>Current Unlock:</h4>
            <p>{currentLevelInfo.unlocks}</p>
            {!isMaxLevel && (
              <>
                <h4>Next Unlock:</h4>
                <p>{nextLevelInfo.unlocks}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            className="level-up-notification"
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            transition={{ duration: 0.5, ease: "backOut" }}
          >
            <div className="level-up-content">
              <div className="level-up-icon">🎉</div>
              <div className="level-up-text">
                <h3>Level Up!</h3>
                <p>You've reached {currentLevelInfo.name}!</p>
                <p className="unlock-text">{currentLevelInfo.unlocks} unlocked!</p>
              </div>
            </div>
            <motion.div
              className="level-up-sparkles"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              ✨
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Milestones */}
      {showDetails && (
        <div className="achievement-milestones">
          <h4>Progress Milestones</h4>
          <div className="milestones-list">
            {cupLevels.map((level, index) => (
              <div 
                key={level.level}
                className={`milestone ${totalRaindrops >= level.requiredRaindrops ? 'achieved' : 'locked'}`}
              >
                <div className="milestone-icon">
                  {totalRaindrops >= level.requiredRaindrops ? '🏆' : '🔒'}
                </div>
                <div className="milestone-info">
                  <span className="milestone-name">{level.name}</span>
                  <span className="milestone-requirement">{level.requiredRaindrops} raindrops</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RaindropCup;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import './App.css';

// Import components
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="app-container"
        >
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/teacher/dashboard" element={<Dashboard />} />
            <Route path="/student/dashboard" element={<Dashboard />} />
          </Routes>
        </motion.div>
      </div>
    </Router>
  );
}

// Welcome page component
function WelcomePage() {
  return (
    <motion.div
      className="welcome-page"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="welcome-header">
        <motion.h1
          className="game-title"
          animate={{ 
            scale: [1, 1.05, 1],
            color: ['#2196F3', '#00BCD4', '#2196F3']
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          🌧️ Raindrop Battle
        </motion.h1>
        <motion.p
          className="game-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Educational Game for K-8 Students
        </motion.p>
      </div>

      <motion.div
        className="welcome-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <div className="game-features">
          <div className="feature">
            <span className="feature-icon">💧</span>
            <h3>Collect Raindrops</h3>
            <p>Answer questions correctly to fill your water cup!</p>
          </div>
          <div className="feature">
            <span className="feature-icon">⚔️</span>
            <h3>Battle Friends</h3>
            <p>Challenge classmates in exciting knowledge battles!</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🏆</span>
            <h3>Earn Achievements</h3>
            <p>Unlock badges and climb the leaderboard!</p>
          </div>
        </div>

        <motion.div
          className="cta-section"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            className="start-button"
            onClick={() => window.location.href = '/login'}
          >
            🌈 Start Rainbow
          </button>
        </motion.div>

        <div className="api-status">
          <APIStatus />
        </div>
      </motion.div>
    </motion.div>
  );
}

// API Status component to test backend connection
function APIStatus() {
  const [status, setStatus] = React.useState('checking');
  const [apiData, setApiData] = React.useState(null);

  React.useEffect(() => {
    fetch('http://localhost:3000/')
      .then(response => response.json())
      .then(data => {
        setApiData(data);
        setStatus('connected');
      })
      .catch(error => {
        console.error('API Error:', error);
        setStatus('disconnected');
      });
  }, []);

  return (
    <motion.div
      className={`api-status ${status}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
    >
      <div className="status-indicator">
        {status === 'checking' && '🔄 Checking API...'}
        {status === 'connected' && '✅ Backend Connected'}
        {status === 'disconnected' && '❌ Backend Disconnected'}
      </div>
      {apiData && (
        <div className="api-info">
          <small>{apiData.message} (v{apiData.version})</small>
        </div>
      )}
    </motion.div>
  );
}

export default App;

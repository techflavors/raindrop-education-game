import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import './App.css';

// Import components
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

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
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/teacher/dashboard" element={<Dashboard />} />
            <Route path="/student/dashboard" element={<Dashboard />} />
          </Routes>
        </motion.div>
      </div>
    </Router>
  );
}

// Welcome Page component
function WelcomePage() {
  return (
    <motion.div
      className="welcome-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="welcome-header">
        <motion.h1
          className="game-title"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        >
          🌧️ Raindrop Learning Game
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
            <span className="feature-icon">🏆</span>
            <h3>Earn Achievements</h3>
            <p>Complete tests and unlock special rewards!</p>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <h3>Track Progress</h3>
            <p>See your learning journey and celebrate improvements!</p>
          </div>
        </div>

        <motion.div
          className="cta-section"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="button-group">
            <button
              className="start-button"
              onClick={() => window.location.href = '/login'}
            >
              🎓 Let's Start Learning!
            </button>
          </div>
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
    const checkAPI = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/health');
        const data = await response.json();
        setApiData(data);
        setStatus('connected');
      } catch (error) {
        setStatus('disconnected');
      }
    };

    checkAPI();
  }, []);

  return (
    <motion.div 
      className="api-status-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.8 }}
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
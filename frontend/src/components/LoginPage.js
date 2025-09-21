import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function LoginPage() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      
      if (response.data.token) {
        // Store token and user info
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setSuccess(`Welcome ${response.data.user.profile.firstName}!`);
        
        // Redirect based on role
        setTimeout(() => {
          if (response.data.user.role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else if (response.data.user.role === 'teacher') {
            window.location.href = '/teacher/dashboard';
          } else {
            window.location.href = '/student/dashboard';
          }
        }, 1500);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="login-page"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="login-container"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="login-header">
          <h2>🌧️ Login to Raindrop Battle</h2>
          <p>Enter your credentials to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">👤 Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">🔒 Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              required
              className="form-input"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="login-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? '🔄 Logging in...' : '✨ Start Learning!'}
          </motion.button>
        </form>

        {/* Status Messages */}
        {error && (
          <motion.div 
            className="message error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            ❌ {error}
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            className="message success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            ✅ {success}
          </motion.div>
        )}

        <button 
          onClick={() => window.location.href = '/'}
          className="back-btn"
        >
          ← Back to Home
        </button>
      </motion.div>
    </motion.div>
  );
}

export default LoginPage;

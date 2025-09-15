import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user); // Extract user from response
        
        // Don't redirect - let Dashboard component handle all roles
        console.log('User authenticated:', userData.user.role, userData.user.username);
      } else {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  if (loading) {
    return (
      <motion.div
        className="loading-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="loading-spinner">🌧️</div>
        <p>Loading your dashboard...</p>
      </motion.div>
    );
  }

  if (!user || !user.profile) {
    return (
      <motion.div
        className="loading-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="loading-spinner">🌧️</div>
        <p>Loading your dashboard...</p>
      </motion.div>
    );
  }

  // Render different dashboards based on role
  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboard user={user} onLogout={handleLogout} />;
  }

  // Student dashboard (basic for now)
  return (
    <motion.div
      className="student-dashboard"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dashboard-header">
        <h2>🎮 Student Dashboard</h2>
        <p>Welcome, {user.profile.firstName}!</p>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>
      
      <div className="student-content">
        <h3>🚧 Coming Soon!</h3>
        <p>Student dashboard with raindrops, cups, and game features is under development.</p>
        
        <div className="student-info">
          <div className="info-card">
            <h4>Your Profile</h4>
            <p><strong>Name:</strong> {user.profile.firstName} {user.profile.lastName}</p>
            <p><strong>Grade:</strong> {user.profile.grade || 'Not assigned'}</p>
            <p><strong>Username:</strong> {user.username}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;

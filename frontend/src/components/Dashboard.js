import React from 'react';
import { motion } from 'framer-motion';

function Dashboard() {
  return (
    <motion.div
      className="dashboard"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2>🎮 Game Dashboard</h2>
      <p>Coming soon! Student dashboard with cup progress and game features.</p>
      <button onClick={() => window.location.href = '/'}>
        ← Back to Home
      </button>
    </motion.div>
  );
}

export default Dashboard;

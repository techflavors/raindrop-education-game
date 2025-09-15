import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const TeacherDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({});
  const [aiStatus, setAiStatus] = useState({ ollamaRunning: false });
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    grade: '',
    subject: '',
    difficulty: 'beginner',
    count: 5
  });
  const [createForm, setCreateForm] = useState({
    grade: '',
    subject: '',
    questionText: '',
    difficulty: 'beginner',
    questionType: 'multiple-choice',
    answers: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [questionsRes, statsRes, aiStatusRes] = await Promise.all([
        axios.get('http://localhost:3000/api/questions/my-questions', { headers }),
        axios.get('http://localhost:3000/api/questions/stats', { headers }),
        axios.get('http://localhost:3000/api/questions/ai-status', { headers })
      ]);

      setQuestions(questionsRes.data.questions);
      setStats(statsRes.data);
      setAiStatus(aiStatusRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleGenerateQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3000/api/questions/generate',
        generateForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Successfully generated ${response.data.questions.length} questions!`);
      setShowGenerateModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Error generating questions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3000/api/questions/create',
        createForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Question created successfully!');
      setShowCreateModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating question');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:3000/api/questions/${questionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Question deleted successfully!');
      fetchData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting question');
    }
  };

  const renderOverview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="teacher-overview"
    >
      <div className="overview-header">
        <h2>👩‍🏫 Welcome back, {user.profile.firstName}!</h2>
        <p>Manage your questions and create engaging content for your students</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <span className="stat-number">{stats.overview?.totalQuestions || 0}</span>
            <span className="stat-label">Total Questions</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🤖</div>
          <div className="stat-info">
            <span className="stat-number">{stats.overview?.aiGenerated || 0}</span>
            <span className="stat-label">AI Generated</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✍️</div>
          <div className="stat-info">
            <span className="stat-number">{stats.overview?.manuallyCreated || 0}</span>
            <span className="stat-label">Manual Created</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">{aiStatus.ollamaRunning ? '🟢' : '🔴'}</div>
          <div className="stat-info">
            <span className="stat-number">{aiStatus.ollamaRunning ? 'Online' : 'Offline'}</span>
            <span className="stat-label">AI Service</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={() => setShowGenerateModal(true)}
          >
            🤖 Generate Questions with AI
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => setShowCreateModal(true)}
          >
            ✍️ Create Question Manually
          </button>
          <button 
            className="action-btn tertiary"
            onClick={() => setActiveTab('questions')}
          >
            📋 View All Questions
          </button>
        </div>
      </div>

      {/* Teaching Assignment Info */}
      <div className="assignment-info">
        <h3>Your Teaching Assignment</h3>
        <div className="assignment-details">
          <div className="assignment-item">
            <span className="label">Grades:</span>
            <span className="value">{user.profile.assignedGrades?.join(', ') || 'None assigned'}</span>
          </div>
          <div className="assignment-item">
            <span className="label">Subjects:</span>
            <span className="value">{user.profile.subjects?.join(', ') || 'None assigned'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderQuestions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="questions-management"
    >
      <div className="questions-header">
        <h2>📚 Question Bank</h2>
        <div className="header-actions">
          <button 
            className="btn primary"
            onClick={() => setShowGenerateModal(true)}
          >
            🤖 Generate with AI
          </button>
          <button 
            className="btn secondary"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Create Manual
          </button>
        </div>
      </div>

      <div className="questions-list">
        {questions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No questions yet</h3>
            <p>Start by generating questions with AI or creating them manually</p>
          </div>
        ) : (
          questions.map((question) => (
            <div key={question._id} className="question-card">
              <div className="question-header">
                <div className="question-meta">
                  <span className={`difficulty-badge ${question.difficulty}`}>
                    {question.difficulty}
                  </span>
                  <span className="subject-badge">{question.subject}</span>
                  <span className="grade-badge">Grade {question.grade}</span>
                  {question.generatedByAI && <span className="ai-badge">🤖 AI</span>}
                </div>
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteQuestion(question._id)}
                >
                  🗑️
                </button>
              </div>
              <div className="question-content">
                <h4>{question.questionText}</h4>
                <div className="answers-preview">
                  {question.answers.map((answer, index) => (
                    <div 
                      key={index} 
                      className={`answer-option ${answer.isCorrect ? 'correct' : ''}`}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                      <span className="option-text">{answer.text}</span>
                      {answer.isCorrect && <span className="correct-indicator">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'questions':
        return renderQuestions();
      default:
        return renderOverview();
    }
  };

  return (
    <motion.div
      className="teacher-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🍎 Teacher Dashboard</h1>
          <p>Welcome back, {user.profile.firstName}!</p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>

      {/* Navigation */}
      <div className="tab-navigation">
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'questions', label: '📚 Questions', icon: '📚' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon} {tab.label.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      {/* Generate Questions Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 Generate Questions with AI</h3>
              <button className="close-btn" onClick={() => setShowGenerateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGenerateQuestions}>
              <div className="form-group">
                <label>Grade:</label>
                <select 
                  value={generateForm.grade}
                  onChange={(e) => setGenerateForm({...generateForm, grade: e.target.value})}
                  required
                >
                  <option value="">Select Grade</option>
                  {user.profile.assignedGrades?.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject:</label>
                <select 
                  value={generateForm.subject}
                  onChange={(e) => setGenerateForm({...generateForm, subject: e.target.value})}
                  required
                >
                  <option value="">Select Subject</option>
                  {user.profile.subjects?.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Difficulty:</label>
                <select 
                  value={generateForm.difficulty}
                  onChange={(e) => setGenerateForm({...generateForm, difficulty: e.target.value})}
                >
                  <option value="beginner">Beginner</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div className="form-group">
                <label>Number of Questions:</label>
                <input 
                  type="number"
                  min="1"
                  max="20"
                  value={generateForm.count}
                  onChange={(e) => setGenerateForm({...generateForm, count: parseInt(e.target.value)})}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Questions'}
                </button>
                <button type="button" className="btn secondary" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TeacherDashboard;

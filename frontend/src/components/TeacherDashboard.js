import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import TestManagement from './TestManagement';
import TestCreation from './TestCreation';

const TeacherDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [stats, setStats] = useState({});
  const [aiStatus, setAiStatus] = useState({ ollamaRunning: false });
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Test-related state
  const [showTestCreation, setShowTestCreation] = useState(false);
  
  const [filters, setFilters] = useState({
    grade: '',
    subject: '',
    difficulty: '',
    source: '' // 'ai' or 'manual'
  });
  const [showQuestions, setShowQuestions] = useState(false);
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
    if (user && user.profile) {
      fetchData();
    }
  }, [user]);

  // Filter questions based on search and filters
  useEffect(() => {
    let filtered = questions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply other filters
    if (filters.grade) {
      filtered = filtered.filter(q => q.grade === filters.grade);
    }
    if (filters.subject) {
      filtered = filtered.filter(q => q.subject === filters.subject);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters.source) {
      const isAI = filters.source === 'ai';
      filtered = filtered.filter(q => q.generatedByAI === isAI);
    }

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, filters]);

  // Add null check for user AFTER hooks
  if (!user || !user.profile) {
    return (
      <motion.div
        className="loading-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="loading-spinner">🍎</div>
        <p>Loading teacher dashboard...</p>
      </motion.div>
    );
  }

  // Notification system
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [questionsRes, statsRes, aiStatusRes] = await Promise.all([
        axios.get('http://localhost:3000/api/questions/my-questions?limit=1000', { headers }),
        axios.get('http://localhost:3000/api/questions/stats', { headers }),
        axios.get('http://localhost:3000/api/questions/ai-status', { headers })
      ]);

      setQuestions(questionsRes.data.questions);
      setStats(statsRes.data);
      setAiStatus(aiStatusRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Failed to load dashboard data', 'error');
    }
  };

  const handleGenerateQuestions = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep('Initializing AI...');

    try {
      const token = localStorage.getItem('token');
      
      // Simulate progress steps
      setGenerationProgress(20);
      setGenerationStep('Connecting to AI model...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setGenerationProgress(40);
      setGenerationStep(`Analyzing ${generateForm.subject} curriculum for Grade ${generateForm.grade}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGenerationProgress(60);
      setGenerationStep('Crafting educational questions...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setGenerationProgress(80);
      setGenerationStep('Reviewing question quality...');
      
      const response = await axios.post(
        'http://localhost:3000/api/questions/generate',
        generateForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGenerationProgress(100);
      setGenerationStep('Questions generated successfully!');
      await new Promise(resolve => setTimeout(resolve, 500));

      showNotification(`🎉 Successfully generated ${response.data.questions.length} high-quality questions!`, 'success');
      setShowGenerateModal(false);
      fetchData(); // Refresh data
      
      // Reset form and progress
      setGenerateForm({
        grade: '',
        subject: '',
        difficulty: 'beginner',
        count: 5
      });
      setGenerationProgress(0);
      setGenerationStep('');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error generating questions';
      showNotification(`❌ ${errorMsg}`, 'error');
      setGenerationProgress(0);
      setGenerationStep('');
    } finally {
      setIsGenerating(false);
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

      showNotification('✨ Question created successfully!', 'success');
      setShowCreateModal(false);
      fetchData(); // Refresh data
      
      // Reset form
      setCreateForm({
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
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error creating question';
      showNotification(`❌ ${errorMsg}`, 'error');
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

      showNotification('🗑️ Question deleted successfully!', 'success');
      fetchData(); // Refresh data
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error deleting question';
      showNotification(`❌ ${errorMsg}`, 'error');
    }
  };

  const handleQuickGenerate = async (grade, subject) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3000/api/questions/generate',
        { grade, subject, difficulty: 'beginner', count: 3 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification(`🚀 Quick-generated 3 ${subject} questions for Grade ${grade}!`, 'success');
      fetchData();
    } catch (error) {
      showNotification('❌ Quick generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewQuestion = (question) => {
    setPreviewQuestion(question);
    setShowPreviewModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion({
      ...question,
      answers: question.answers.map(a => ({ ...a })) // Deep copy answers
    });
    setShowEditModal(true);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3000/api/questions/${editingQuestion._id}`,
        {
          questionText: editingQuestion.questionText,
          difficulty: editingQuestion.difficulty,
          answers: editingQuestion.answers
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification('✨ Question updated successfully!', 'success');
      setShowEditModal(false);
      setEditingQuestion(null);
      fetchData(); // Refresh data
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error updating question';
      showNotification(`❌ ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAnswerChange = (answerIndex, field, value) => {
    const updatedAnswers = [...editingQuestion.answers];
    if (field === 'isCorrect') {
      // Ensure only one correct answer
      updatedAnswers.forEach((answer, index) => {
        answer.isCorrect = index === answerIndex ? value : false;
      });
    } else {
      updatedAnswers[answerIndex][field] = value;
    }
    setEditingQuestion({
      ...editingQuestion,
      answers: updatedAnswers
    });
  };

  // Test-related functions
  const handleTestCreated = (newTest) => {
    showNotification(`🎉 Test "${newTest.title}" created successfully!`, 'success');
    setShowTestCreation(false);
    setActiveTab('tests'); // Switch to tests tab to show the new test
  };

  const handleCreateTest = () => {
    setShowTestCreation(true);
  };

  const handleBackToTests = () => {
    setShowTestCreation(false);
  };

  const clearFilters = () => {
    setFilters({
      grade: '',
      subject: '',
      difficulty: '',
      source: ''
    });
    setSearchTerm('');
    setShowQuestions(false);
  };

  const handleViewQuestions = () => {
    if (filters.grade && filters.subject) {
      setShowQuestions(true);
    }
  };

  const handleBackToFilters = () => {
    setShowQuestions(false);
  };

  const renderOverview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="teacher-overview"
    >
      <div className="overview-header">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="welcome-badge"
        >
          <div className="teacher-avatar">
            {user.profile.firstName.charAt(0)}{user.profile.lastName.charAt(0)}
          </div>
          <div className="welcome-text">
            <h2>Welcome back, {user.profile.firstName}! 👩‍🏫</h2>
            <p>Ready to inspire minds and create amazing content for your students</p>
          </div>
        </motion.div>
        <div className="current-time">
          📅 {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <motion.div 
        className="stats-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div 
          className="stat-card highlight"
          whileHover={{ scale: 1.05, rotateY: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon pulse">📚</div>
          <div className="stat-info">
            <span className="stat-number">{stats.overview?.totalQuestions || 0}</span>
            <span className="stat-label">Total Questions</span>
            <div className="stat-progress">
              <div className="progress-bar" style={{width: `${Math.min((stats.overview?.totalQuestions || 0) * 10, 100)}%`}}></div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="stat-card ai-card"
          whileHover={{ scale: 1.05, rotateY: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon ai-icon">🤖</div>
          <div className="stat-info">
            <span className="stat-number">{stats.overview?.aiGenerated || 0}</span>
            <span className="stat-label">AI Generated</span>
            <div className="ai-badge">{aiStatus.ollamaRunning ? '🚀 Ready' : '⚠️ Offline'}</div>
          </div>
        </motion.div>
        
        <motion.div 
          className="stat-card manual-card"
          whileHover={{ scale: 1.05, rotateY: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon">✍️</div>
          <div className="stat-info">
            <span className="stat-number">{stats.overview?.manuallyCreated || 0}</span>
            <span className="stat-label">Manually Created</span>
            <div className="creativity-meter">
              <span>🎨 {stats.overview?.manuallyCreated > 5 ? 'Creative Pro!' : 'Getting Started'}</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className={`stat-card status-card ${aiStatus.ollamaRunning ? 'online' : 'offline'}`}
          whileHover={{ scale: 1.05, rotateY: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="stat-icon status-indicator">
            {aiStatus.ollamaRunning ? '🟢' : '🔴'}
          </div>
          <div className="stat-info">
            <span className="stat-number">{aiStatus.ollamaRunning ? 'Online' : 'Offline'}</span>
            <span className="stat-label">AI Service Status</span>
            <div className="status-details">
              {aiStatus.ollamaRunning ? '⚡ Ready for magic!' : '💤 Install Ollama to activate'}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Enhanced Quick Actions */}
      <motion.div 
        className="quick-actions"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <motion.button 
            className="action-btn primary ai-btn"
            onClick={() => setShowGenerateModal(true)}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(79, 172, 254, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            disabled={!aiStatus.ollamaRunning}
          >
            <span className="btn-icon">🤖</span>
            <div className="btn-content">
              <span className="btn-title">Generate with AI</span>
              <span className="btn-subtitle">{aiStatus.ollamaRunning ? 'AI Ready!' : 'AI Offline'}</span>
            </div>
            {!aiStatus.ollamaRunning && <span className="disabled-overlay">⚠️</span>}
          </motion.button>
          
          <motion.button 
            className="action-btn secondary manual-btn"
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(250, 112, 154, 0.3)" }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="btn-icon">✍️</span>
            <div className="btn-content">
              <span className="btn-title">Create Manually</span>
              <span className="btn-subtitle">Your creativity unleashed</span>
            </div>
          </motion.button>
          
          <motion.button 
            className="action-btn tertiary view-btn"
            onClick={() => setActiveTab('questions')}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(255, 255, 255, 0.2)" }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="btn-icon">📋</span>
            <div className="btn-content">
              <span className="btn-title">Question Bank</span>
              <span className="btn-subtitle">{questions.length} questions ready</span>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Quick Generate Section */}
      {aiStatus.ollamaRunning && user.profile.assignedGrades && user.profile.subjects && (
        <motion.div 
          className="quick-generate-section"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h3>🚀 Quick Generate</h3>
          <p>Generate questions instantly for your assigned subjects</p>
          <div className="quick-generate-grid">
            {user.profile.assignedGrades.slice(0, 3).map(grade => 
              user.profile.subjects.slice(0, 2).map(subject => (
                <motion.button
                  key={`${grade}-${subject}`}
                  className="quick-generate-btn"
                  onClick={() => handleQuickGenerate(grade, subject)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  <div className="quick-gen-content">
                    <span className="grade-indicator">Grade {grade}</span>
                    <span className="subject-indicator">{subject}</span>
                    <span className="action-text">Generate 3 Questions</span>
                  </div>
                  {loading ? <span className="loading-spinner">⏳</span> : <span className="generate-icon">⚡</span>}
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Enhanced Teaching Assignment */}
      <motion.div 
        className="assignment-info enhanced"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3>🎯 Your Teaching Mission</h3>
        <div className="assignment-details">
          <div className="assignment-item grades-item">
            <span className="label">📊 Assigned Grades:</span>
            <div className="value grades-badges">
              {user.profile.assignedGrades?.map(grade => (
                <span key={grade} className="grade-badge">Grade {grade}</span>
              )) || <span className="not-assigned">None assigned yet</span>}
            </div>
          </div>
          <div className="assignment-item subjects-item">
            <span className="label">📚 Teaching Subjects:</span>
            <div className="value subjects-badges">
              {user.profile.subjects?.map(subject => (
                <span key={subject} className="subject-badge">{subject}</span>
              )) || <span className="not-assigned">None assigned yet</span>}
            </div>
          </div>
          <div className="assignment-item impact-item">
            <span className="label">🌟 Your Impact:</span>
            <div className="value impact-stats">
              <span className="impact-number">{(user.profile.assignedGrades?.length || 0) * (user.profile.subjects?.length || 0)}</span>
              <span className="impact-text">subject-grade combinations to inspire!</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderQuestions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="questions-management enhanced"
    >
      <motion.div 
        className="questions-header enhanced"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="header-left">
          <h2>📚 Your Question Bank</h2>
          <p>Manage and organize your educational content</p>
        </div>
        <div className="header-actions enhanced">
          <motion.button 
            className="btn primary enhanced"
            onClick={() => setShowGenerateModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!aiStatus.ollamaRunning}
          >
            <span className="btn-icon">🤖</span>
            <span>AI Generate</span>
            {!aiStatus.ollamaRunning && <span className="status-dot offline"></span>}
          </motion.button>
          <motion.button 
            className="btn secondary enhanced"
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="btn-icon">✍️</span>
            <span>Create Manual</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div 
        className="search-filter-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search questions by text or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div className="filter-section">
          <select 
            value={filters.grade} 
            onChange={(e) => setFilters({...filters, grade: e.target.value})}
            className="filter-select required"
            required
          >
            <option value="">Select Grade *</option>
            {user.profile.assignedGrades?.map(grade => (
              <option key={grade} value={grade}>Grade {grade}</option>
            ))}
          </select>
          
          <select 
            value={filters.subject} 
            onChange={(e) => setFilters({...filters, subject: e.target.value})}
            className="filter-select required"
            required
          >
            <option value="">Select Subject *</option>
            {user.profile.subjects?.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          
          <select 
            value={filters.difficulty} 
            onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
            className="filter-select"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="beginner">Beginner</option>
            <option value="medium">Medium</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
          
          <select 
            value={filters.source} 
            onChange={(e) => setFilters({...filters, source: e.target.value})}
            className="filter-select"
          >
            <option value="">All Sources</option>
            <option value="ai">AI Generated</option>
            <option value="manual">Manual Created</option>
          </select>
          
          <button 
            className="view-questions-btn"
            onClick={handleViewQuestions}
            disabled={!filters.grade || !filters.subject}
          >
            📋 View Questions
          </button>
          
          {(searchTerm || Object.values(filters).some(f => f)) && (
            <button 
              className="clear-filters-btn"
              onClick={clearFilters}
            >
              <span>🧹</span>
              Clear All
            </button>
          )}
        </div>
      </motion.div>

      {!showQuestions ? (
        <motion.div 
          className="select-filters-message"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="message-content">
            <h3>📚 Select Grade and Subject</h3>
            <p>Please select a grade and subject from the filters above, then click "View Questions" to see your question bank.</p>
            <div className="filter-reminder">
              <span className={`filter-status ${filters.grade ? 'selected' : 'pending'}`}>
                Grade: {filters.grade ? `Grade ${filters.grade}` : 'Not selected'}
              </span>
              <span className={`filter-status ${filters.subject ? 'selected' : 'pending'}`}>
                Subject: {filters.subject || 'Not selected'}
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div 
            className="questions-header-info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="selected-filters">
              <h3>📋 Questions for Grade {filters.grade} - {filters.subject}</h3>
              <button className="back-to-filters-btn" onClick={handleBackToFilters}>
                ← Back to Filter Selection
              </button>
            </div>
          </motion.div>

          <motion.div 
            className="questions-stats-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
        <div className="stats-item">
          <span className="stats-number">{filteredQuestions.length}</span>
          <span className="stats-label">
            {searchTerm || Object.values(filters).some(f => f) ? 'Filtered Questions' : 'Total Questions'}
          </span>
        </div>
        <div className="stats-item">
          <span className="stats-number">{filteredQuestions.filter(q => q.generatedByAI).length}</span>
          <span className="stats-label">AI Generated</span>
        </div>
        <div className="stats-item">
          <span className="stats-number">{filteredQuestions.filter(q => !q.generatedByAI).length}</span>
          <span className="stats-label">Manual Created</span>
        </div>
        <div className="stats-item">
          <span className="stats-number">{[...new Set(filteredQuestions.map(q => q.subject))].length}</span>
          <span className="stats-label">Subjects Covered</span>
        </div>
      </motion.div>

      <motion.div 
        className="questions-list enhanced"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {filteredQuestions.length === 0 ? (
          <motion.div 
            className="empty-state enhanced"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="empty-illustration">
              <div className="empty-icon floating">
                {searchTerm || Object.values(filters).some(f => f) ? '�' : '�📝'}
              </div>
              <div className="empty-particles">
                <span className="particle">✨</span>
                <span className="particle">💡</span>
                <span className="particle">🎯</span>
              </div>
            </div>
            <h3>
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'No questions match your search' 
                : 'Your Question Bank Awaits'
              }
            </h3>
            <p>
              {searchTerm || Object.values(filters).some(f => f)
                ? 'Try adjusting your search terms or filters'
                : 'Transform education with AI-powered questions or craft your own masterpieces'
              }
            </p>
            {!(searchTerm || Object.values(filters).some(f => f)) && (
              <div className="empty-actions">
                <button 
                  className="cta-btn primary"
                  onClick={() => setShowGenerateModal(true)}
                  disabled={!aiStatus.ollamaRunning}
                >
                  🤖 Start with AI Magic
                </button>
                <button 
                  className="cta-btn secondary"
                  onClick={() => setShowCreateModal(true)}
                >
                  ✍️ Create Your First Question
                </button>
              </div>
            )}
            {(searchTerm || Object.values(filters).some(f => f)) && (
              <button className="cta-btn secondary" onClick={clearFilters}>
                🧹 Clear Search & Filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className="questions-table-container">
            <table className="questions-table">
              <thead>
                <tr>
                  <th className="question-col">Question</th>
                  <th className="difficulty-col">Difficulty</th>
                  <th className="source-col">Source</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((question, index) => (
                  <motion.tr 
                    key={question._id} 
                    className="question-row"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ backgroundColor: "#f8f9fa" }}
                  >
                    <td className="question-col">
                      <div className="question-text">
                        {question.questionText.length > 100 
                          ? `${question.questionText.substring(0, 100)}...` 
                          : question.questionText
                        }
                      </div>
                    </td>
                    <td className="difficulty-col">
                      <span className={`difficulty-badge ${question.difficulty}`}>
                        <span className="badge-icon">
                          {question.difficulty === 'easy' ? '🟢' : 
                           question.difficulty === 'beginner' ? '🌱' : 
                           question.difficulty === 'medium' ? '�' :
                           question.difficulty === 'advanced' ? '🎯' : '🏆'}
                        </span>
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="source-col">
                      {question.generatedByAI ? (
                        <span className="ai-badge">
                          <span className="badge-icon">🤖</span>
                          AI Generated
                        </span>
                      ) : (
                        <span className="manual-badge">
                          <span className="badge-icon">✍️</span>
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="actions-col">
                      <div className="action-buttons">
                        <motion.button 
                          className="action-btn view-btn"
                          onClick={() => handlePreviewQuestion(question)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="View Details"
                        >
                          👁️
                        </motion.button>
                        <motion.button 
                          className="action-btn edit-btn"
                          onClick={() => handleEditQuestion(question)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Edit Question"
                        >
                          ✏️
                        </motion.button>
                        <motion.button 
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteQuestion(question._id)}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete Question"
                        >
                          🗑️
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      </>
      )}
    </motion.div>
  );

  const renderTests = () => {
    if (showTestCreation) {
      return (
        <TestCreation 
          user={user}
          onBack={handleBackToTests}
          onTestCreated={handleTestCreated}
        />
      );
    }
    
    return (
      <TestManagement 
        user={user}
        onCreateTest={handleCreateTest}
      />
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'questions':
        return renderQuestions();
      case 'tests':
        return renderTests();
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
      {/* Enhanced Header */}
      <motion.div 
        className="dashboard-header enhanced"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <span className="dashboard-icon">🍎</span>
              <div className="title-group">
                <h1>Teacher Portal</h1>
                <span className="subtitle">Shape minds, create futures</span>
              </div>
            </div>
            <div className="teacher-info">
              <div className="teacher-avatar-small">
                {user.profile.firstName.charAt(0)}{user.profile.lastName.charAt(0)}
              </div>
              <div className="teacher-details-header">
                <span className="teacher-name">{user.profile.firstName} {user.profile.lastName}</span>
                <span className="teacher-role">Educator & Innovator</span>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="header-stats-mini">
              <div className="mini-stat">
                <span className="mini-number">{stats.overview?.totalQuestions || 0}</span>
                <span className="mini-label">Questions</span>
              </div>
              <div className="mini-stat">
                <span className="mini-number">{user.profile.assignedGrades?.length || 0}</span>
                <span className="mini-label">Grades</span>
              </div>
            </div>
            <motion.button 
              onClick={onLogout} 
              className="logout-btn enhanced"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Navigation */}
      <motion.div 
        className="tab-navigation enhanced"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: '📊', desc: 'Your teaching hub' },
          { id: 'questions', label: 'Question Bank', icon: '📚', desc: 'Manage questions' },
          { id: 'tests', label: 'Test Management', icon: '📋', desc: 'Create & schedule tests' }
        ].map((tab, index) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn enhanced ${activeTab === tab.id ? 'active' : ''}`}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <span className="tab-icon">{tab.icon}</span>
            <div className="tab-content-text">
              <span className="tab-title">{tab.label}</span>
              <span className="tab-desc">{tab.desc}</span>
            </div>
            {activeTab === tab.id && (
              <motion.div 
                className="active-indicator"
                layoutId="activeTab"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </motion.div>

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
                  {(user.profile.assignedGrades && user.profile.assignedGrades.length > 0) ? 
                    user.profile.assignedGrades.map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    )) : 
                    <option disabled>No grades assigned</option>
                  }
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
                  {(user.profile.subjects && user.profile.subjects.length > 0) ? 
                    user.profile.subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    )) : 
                    <option disabled>No subjects assigned</option>
                  }
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

      {/* Notification System */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`notification ${notification.type}`}
            initial={{ opacity: 0, y: -100, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.3 }}
            transition={{ duration: 0.4, type: "spring" }}
          >
            <div className="notification-content">
              <span className="notification-message">{notification.message}</span>
              <button 
                className="notification-close"
                onClick={() => setNotification(null)}
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && previewQuestion && (
          <motion.div 
            className="modal-overlay preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div 
              className="modal-content preview-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header preview-header">
                <h3>📝 Question Preview</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowPreviewModal(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="preview-body">
                <div className="preview-meta">
                  <span className={`difficulty-badge ${previewQuestion.difficulty} enhanced`}>
                    {previewQuestion.difficulty}
                  </span>
                  <span className="subject-badge enhanced">
                    {previewQuestion.subject}
                  </span>
                  <span className="grade-badge enhanced">
                    Grade {previewQuestion.grade}
                  </span>
                  {previewQuestion.generatedByAI && (
                    <span className="ai-badge enhanced">
                      🤖 AI Generated
                    </span>
                  )}
                </div>
                
                <div className="preview-question">
                  <h4>{previewQuestion.questionText}</h4>
                </div>
                
                <div className="preview-answers">
                  {previewQuestion.answers.map((answer, index) => (
                    <motion.div
                      key={index}
                      className={`preview-answer ${answer.isCorrect ? 'correct' : ''}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="answer-letter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="answer-text">{answer.text}</span>
                      {answer.isCorrect && (
                        <span className="correct-badge">✓ Correct</span>
                      )}
                    </motion.div>
                  ))}
                </div>
                
                <div className="preview-footer">
                  <div className="creation-details">
                    <span>Created: {new Date(previewQuestion.createdAt).toLocaleDateString()}</span>
                    {previewQuestion.usageCount > 0 && (
                      <span>Used {previewQuestion.usageCount} times</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingQuestion && (
          <motion.div 
            className="modal-overlay edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div 
              className="modal-content edit-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header edit-header">
                <h3>✏️ Edit Question</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="edit-body">
                <div className="edit-form">
                  <div className="form-group">
                    <label>Question Text</label>
                    <textarea
                      value={editingQuestion.questionText}
                      onChange={(e) => setEditingQuestion(prev => ({
                        ...prev,
                        questionText: e.target.value
                      }))}
                      className="question-input"
                      rows="3"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Subject</label>
                      <select
                        value={editingQuestion.subject}
                        onChange={(e) => setEditingQuestion(prev => ({
                          ...prev,
                          subject: e.target.value
                        }))}
                        className="form-select"
                      >
                        <option value="Math">Math</option>
                        <option value="Science">Science</option>
                        <option value="English">English</option>
                        <option value="History">History</option>
                        <option value="Geography">Geography</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Grade</label>
                      <select
                        value={editingQuestion.grade}
                        onChange={(e) => setEditingQuestion(prev => ({
                          ...prev,
                          grade: parseInt(e.target.value)
                        }))}
                        className="form-select"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Difficulty</label>
                      <select
                        value={editingQuestion.difficulty}
                        onChange={(e) => setEditingQuestion(prev => ({
                          ...prev,
                          difficulty: e.target.value
                        }))}
                        className="form-select"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="answers-section">
                    <label>Answer Options</label>
                    {editingQuestion.answers.map((answer, index) => (
                      <motion.div
                        key={index}
                        className="answer-edit-row"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <span className="answer-letter">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <input
                          type="text"
                          value={answer.text}
                          onChange={(e) => handleEditAnswerChange(index, 'text', e.target.value)}
                          className="answer-input"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        <label className="correct-checkbox">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={answer.isCorrect}
                            onChange={() => handleEditAnswerChange(index, 'isCorrect', true)}
                          />
                          <span className="checkmark">✓</span>
                        </label>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                <div className="edit-footer">
                  <button 
                    className="btn-cancel"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-save"
                    onClick={handleUpdateQuestion}
                  >
                    💾 Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TeacherDashboard;

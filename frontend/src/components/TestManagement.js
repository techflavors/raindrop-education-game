import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TestManagement = ({ user, onCreateTest }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data.tests);
      } else {
        setError('Failed to fetch tests');
      }
    } catch (error) {
      setError('Error fetching tests');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTest = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tests/${testId}/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchTests(); // Refresh the tests list
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to schedule test');
      }
    } catch (error) {
      setError('Error scheduling test');
      console.error('Error:', error);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchTests(); // Refresh the tests list
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete test');
      }
    } catch (error) {
      setError('Error deleting test');
      console.error('Error:', error);
    }
  };

  // Check if teacher has assigned grades and subjects
  const hasAssignments = user?.profile?.assignedGrades?.length > 0 && user?.profile?.subjects?.length > 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return '📝';
      case 'scheduled': return '⏰';
      case 'active': return '🚀';
      case 'completed': return '✅';
      case 'archived': return '📁';
      default: return '📄';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'scheduled': return 'status-scheduled';
      case 'active': return 'status-active';
      case 'completed': return 'status-completed';
      case 'archived': return 'status-archived';
      default: return 'status-default';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const isTestUpcoming = (test) => {
    const testDateTime = new Date(`${test.scheduledDate.split('T')[0]}T${test.startTime}`);
    const now = new Date();
    return testDateTime > now;
  };

  const renderTestCard = (test) => (
    <motion.div
      key={test._id}
      className="test-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: "0 15px 40px rgba(0, 0, 0, 0.2)" }}
      layout
    >
      <div className="test-card-header">
        <div className="test-title">
          <h3>{test.title}</h3>
          <div className="test-meta">
            <span className="subject-grade">
              📖 {test.subject} • 🎓 Grade {test.grade}
            </span>
          </div>
        </div>
        <div className={`test-status ${getStatusColor(test.status)}`}>
          {getStatusIcon(test.status)} {test.status}
        </div>
      </div>

      <div className="test-card-body">
        {test.description && (
          <p className="test-description">{test.description}</p>
        )}
        
        <div className="test-details-grid">
          <div className="detail-item">
            <span className="detail-label">📅 Scheduled:</span>
            <span className="detail-value">
              {new Date(test.scheduledDate).toLocaleDateString()}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">⏰ Time:</span>
            <span className="detail-value">{test.startTime}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">⏱️ Duration:</span>
            <span className="detail-value">{test.duration} min</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">👥 Students:</span>
            <span className="detail-value">{test.studentIds.length}</span>
          </div>
        </div>

        <div className="questions-summary">
          <div className="question-count">
            <span className="regular-count">
              📚 {test.regularQuestions.length} Regular
            </span>
            <span className="challenge-count">
              🚀 {test.challengeQuestions.length} Challenge
            </span>
          </div>
        </div>
      </div>

      <div className="test-card-actions">
        <button
          className="btn-view"
          onClick={() => {
            setSelectedTest(test);
            setShowDetails(true);
          }}
        >
          👁️ View Details
        </button>
        
        {test.status === 'draft' && (
          <>
            <button
              className="btn-schedule"
              onClick={() => handleScheduleTest(test._id)}
            >
              📅 Schedule
            </button>
            <button
              className="btn-delete"
              onClick={() => handleDeleteTest(test._id)}
            >
              🗑️ Delete
            </button>
          </>
        )}
        
        {test.status === 'scheduled' && isTestUpcoming(test) && (
          <button
            className="btn-edit"
            onClick={() => {
              // TODO: Add edit functionality
              console.log('Edit test:', test._id);
            }}
          >
            ✏️ Edit
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderTestDetails = () => (
    <AnimatePresence>
      {showDetails && selectedTest && (
        <motion.div
          className="modal-overlay test-details-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowDetails(false)}
        >
          <motion.div
            className="modal-content test-details-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>📋 {selectedTest.title}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowDetails(false)}
              >
                ✕
              </button>
            </div>

            <div className="test-details-body">
              <div className="details-section">
                <h4>📖 Test Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Subject:</strong> {selectedTest.subject}
                  </div>
                  <div className="info-item">
                    <strong>Grade:</strong> {selectedTest.grade}
                  </div>
                  <div className="info-item">
                    <strong>Status:</strong> 
                    <span className={`status-badge ${getStatusColor(selectedTest.status)}`}>
                      {getStatusIcon(selectedTest.status)} {selectedTest.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <strong>Duration:</strong> {selectedTest.duration} minutes
                  </div>
                </div>
                {selectedTest.description && (
                  <div className="description">
                    <strong>Description:</strong>
                    <p>{selectedTest.description}</p>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h4>📅 Schedule</h4>
                <div className="schedule-info">
                  <div className="schedule-item">
                    <strong>Date:</strong> {new Date(selectedTest.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="schedule-item">
                    <strong>Time:</strong> {selectedTest.startTime}
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h4>📚 Regular Questions ({selectedTest.regularQuestions.length})</h4>
                <div className="questions-list">
                  {selectedTest.regularQuestions.slice(0, 3).map((question, index) => (
                    <div key={question._id} className="question-preview">
                      <span className="question-number">Q{index + 1}:</span>
                      <span className="question-text">{question.questionText}</span>
                      <span className={`difficulty-badge ${question.difficulty}`}>
                        {question.difficulty}
                      </span>
                    </div>
                  ))}
                  {selectedTest.regularQuestions.length > 3 && (
                    <div className="more-questions">
                      + {selectedTest.regularQuestions.length - 3} more questions
                    </div>
                  )}
                </div>
              </div>

              <div className="details-section">
                <h4>🚀 Challenge Questions ({selectedTest.challengeQuestions.length})</h4>
                <div className="questions-list">
                  {selectedTest.challengeQuestions.slice(0, 3).map((question, index) => (
                    <div key={question._id} className="question-preview challenge">
                      <span className="question-number">C{index + 1}:</span>
                      <span className="question-text">{question.questionText}</span>
                      <span className={`difficulty-badge ${question.difficulty}`}>
                        {question.difficulty}
                      </span>
                    </div>
                  ))}
                  {selectedTest.challengeQuestions.length > 3 && (
                    <div className="more-questions">
                      + {selectedTest.challengeQuestions.length - 3} more questions
                    </div>
                  )}
                </div>
              </div>

              <div className="details-section">
                <h4>👥 Assigned Students ({selectedTest.studentIds.length})</h4>
                <div className="students-list">
                  {selectedTest.studentIds.length === 0 ? (
                    <p>No students assigned yet</p>
                  ) : (
                    selectedTest.studentIds.map(student => (
                      <div key={student._id} className="student-item">
                        <div className="student-avatar">
                          {student.profile?.firstName?.[0]}{student.profile?.lastName?.[0]}
                        </div>
                        <span className="student-name">
                          {student.profile?.firstName} {student.profile?.lastName}
                        </span>
                        <span className="student-username">@{student.username}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading tests...</p>
      </div>
    );
  }

  return (
    <div className="test-management">
      <div className="test-management-header">
        <div className="header-content">
          <h2>📋 Test Management</h2>
          <p>Create, schedule, and manage your tests</p>
        </div>
        <button 
          className={`btn-create-test ${!hasAssignments ? 'disabled' : ''}`}
          onClick={hasAssignments ? onCreateTest : null}
          disabled={!hasAssignments}
          title={!hasAssignments ? 'Please contact admin to assign grades and subjects' : 'Create a new test'}
        >
          ➕ Create New Test
        </button>
      </div>

      {error && (
        <motion.div 
          className="error-message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {!hasAssignments && (
        <motion.div 
          className="warning-message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '1rem',
            borderRadius: '8px',
            margin: '1rem 0',
            textAlign: 'center'
          }}
        >
          ⚠️ You need to have grades and subjects assigned by an administrator before you can create tests.
          <br />
          <small>Please contact your administrator to assign you to specific grades and subjects.</small>
        </motion.div>
      )}

      <div className="tests-content">
        {tests.length === 0 ? (
          <motion.div 
            className="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="empty-icon">📝</div>
            <h3>No Tests Created Yet</h3>
            <p>Create your first test to get started</p>
            <button className="btn-primary" onClick={onCreateTest}>
              Create Your First Test
            </button>
          </motion.div>
        ) : (
          <div className="tests-grid">
            {tests.map(renderTestCard)}
          </div>
        )}
      </div>

      {renderTestDetails()}
    </div>
  );
};

export default TestManagement;

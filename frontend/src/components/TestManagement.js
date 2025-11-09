import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const TestManagement = ({ user, onCreateTest }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testAnalytics, setTestAnalytics] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedQuestionType, setSelectedQuestionType] = useState('regular');
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Check if teacher has assigned grades and subjects - moved to top
  const hasAssignments = (user?.profile?.assignedGrades?.length > 0) && 
                        (user?.profile?.subjects?.length > 0);

  useEffect(() => {
    fetchTests();
  }, []);

  // Monitor hasAssignments changes
  useEffect(() => {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 TestManagement render - hasAssignments:`, hasAssignments);
    console.log(`[${new Date().toLocaleTimeString()}] 📊 User assignments data:`, {
      user: !!user,
      profile: !!user?.profile,
      assignedGrades: user?.profile?.assignedGrades,
      subjects: user?.profile?.subjects,
      gradesLength: user?.profile?.assignedGrades?.length || 0,
      subjectsLength: user?.profile?.subjects?.length || 0
    });
  }, [hasAssignments, user]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tests/teacher-tests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
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

  const handleScheduleTest = async (testId, scheduleData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tests/${testId}/schedule`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        fetchTests(); // Refresh the tests list
        setShowScheduleModal(false);
        setError('');
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
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tests/${testId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Successfully deleted
        await fetchTests(); // Refresh the tests list
        setError('');
        console.log('Test deleted successfully:', data.message);
      } else {
        // Handle specific error messages from backend
        const errorMessage = data.message || 'Failed to delete test';
        setError(errorMessage);
        console.error('Delete failed:', errorMessage);
        
        // Show user-friendly error message
        if (errorMessage.includes('student attempts')) {
          alert('Cannot delete this test because students have already attempted it. You can deactivate it instead.');
        } else if (errorMessage.includes('Not authorized')) {
          alert('You are not authorized to delete this test.');
        } else {
          alert(`Failed to delete test: ${errorMessage}`);
        }
      }
    } catch (error) {
      setError('Network error occurred while deleting test');
      console.error('Network error:', error);
      alert('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTest = async (testId, updatedData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        fetchTests(); // Refresh the tests list
        setShowEditModal(false);
        setEditingTest(null);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update test');
      }
    } catch (error) {
      setError('Error updating test');
      console.error('Error:', error);
    }
  };

  const fetchTestAnalytics = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tests/${testId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestAnalytics(data);
        setShowAnalytics(true);
      } else {
        setError('Failed to fetch test analytics');
      }
    } catch (error) {
      setError('Error fetching analytics');
      console.error('Error:', error);
    }
  };

  const handleDuplicateTest = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tests/${testId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchTests(); // Refresh the tests list
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to duplicate test');
      }
    } catch (error) {
      setError('Error duplicating test');
      console.error('Error:', error);
    }
  };



  // Helper functions for tabbed interface
  const getQuestionsByType = () => {
    if (!selectedTest?.questions) return [];
    return selectedTest.questions.map(q => q.questionId || q);
  };

  const getFilteredQuestions = () => {
    const questions = getQuestionsByType();
    if (selectedQuestionType === 'all') return questions;
    if (selectedQuestionType === 'regular') {
      return questions.filter(q => ['easy', 'beginner', 'medium'].includes(q.difficulty));
    }
    if (selectedQuestionType === 'advanced') {
      return questions.filter(q => ['advanced', 'expert'].includes(q.difficulty));
    }
    return questions;
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to remove this question from the test?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/tests/${selectedTest._id}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update the selected test to remove the question
        setSelectedTest(prev => ({
          ...prev,
          questions: prev.questions.filter(q => {
            const qId = q.questionId?._id || q._id;
            return qId !== questionId;
          })
        }));
        
        // Also update the main tests list
        setTests(prev => prev.map(test => 
          test._id === selectedTest._id 
            ? {
                ...test,
                questions: test.questions.filter(q => {
                  const qId = q.questionId?._id || q._id;
                  return qId !== questionId;
                })
              }
            : test
        ));
        
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to remove question');
      }
    } catch (error) {
      setError('Error removing question');
      console.error('Error:', error);
    }
  };



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



  const isTestUpcoming = (test) => {
    if (!test.scheduledDate || !test.startTime) return false;
    const testDateTime = new Date(`${test.scheduledDate.split('T')[0]}T${test.startTime}`);
    const now = new Date();
    return testDateTime > now;
  };

  const getFilteredAndSortedTests = () => {
    let filteredTests = tests;

    // Apply status filter
    if (filterStatus !== 'all') {
      filteredTests = filteredTests.filter(test => test.status === filterStatus);
    }

    // Sort tests
    filteredTests.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'createdAt':
          valueA = new Date(a.createdAt);
          valueB = new Date(b.createdAt);
          break;
        case 'dueDate':
          valueA = new Date(a.dueDate);
          valueB = new Date(b.dueDate);
          break;
        case 'studentCount':
          valueA = a.assignedStudents?.length || 0;
          valueB = b.assignedStudents?.length || 0;
          break;
        default:
          valueA = a.createdAt;
          valueB = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return filteredTests;
  };

  const getTestStatusFromDates = (test) => {
    const now = new Date();
    const dueDate = new Date(test.dueDate);
    const startDate = new Date(test.startDate || test.createdAt);

    if (test.status === 'draft') return 'draft';
    if (test.status === 'archived') return 'archived';
    
    if (now < startDate) return 'scheduled';
    if (now >= startDate && now <= dueDate) return 'active';
    if (now > dueDate) return 'completed';
    
    return test.status || 'draft';
  };

  const renderTestCard = (test) => {
    const actualStatus = getTestStatusFromDates(test);
    
    return (
      <motion.div
        key={test._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, boxShadow: "0 15px 40px rgba(0, 0, 0, 0.2)" }}
        layout
        style={{
          backgroundColor: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '16px',
          padding: '24px',
          margin: '16px 0',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 8px 0',
              lineHeight: '1.3'
            }}>
              {test.title}
            </h3>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: '500'
              }}>
                📖 {test.subject} • 🎓 Grade {test.grade}
              </span>
              <span style={{
                fontSize: '14px',
                color: test.type === 'challenge' ? '#dc2626' : '#059669',
                backgroundColor: test.type === 'challenge' ? '#fef2f2' : '#f0fdf4',
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: '600'
              }}>
                {test.type === 'challenge' ? '⚡ Challenge' : '📚 Regular'}
              </span>
            </div>
          </div>
          <div style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: getStatusColor(actualStatus) === 'active' ? '#dcfce7' : 
                           getStatusColor(actualStatus) === 'draft' ? '#fef3c7' : 
                           getStatusColor(actualStatus) === 'completed' ? '#e0e7ff' : '#f3f4f6',
            color: getStatusColor(actualStatus) === 'active' ? '#166534' : 
                   getStatusColor(actualStatus) === 'draft' ? '#a16207' : 
                   getStatusColor(actualStatus) === 'completed' ? '#4338ca' : '#6b7280'
          }}>
            {getStatusIcon(actualStatus)} {actualStatus}
          </div>
        </div>

        <div>
          {test.description && (
            <p style={{
              fontSize: '15px',
              color: '#6b7280',
              margin: '0 0 20px 0',
              lineHeight: '1.5'
            }}>{test.description}</p>
          )}
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>📅 Due Date:</span>
              <span style={{ fontSize: '15px', color: '#1f2937', fontWeight: '600' }}>
                {new Date(test.dueDate).toLocaleDateString()}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>⏱️ Duration:</span>
              <span style={{ fontSize: '15px', color: '#1f2937', fontWeight: '600' }}>{test.timeLimit || 30} min</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>👥 Students:</span>
              <span style={{ fontSize: '15px', color: '#1f2937', fontWeight: '600' }}>{test.assignedStudents?.length || 0}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>� Pass Rate:</span>
              <span style={{ fontSize: '15px', color: '#1f2937', fontWeight: '600' }}>{test.passingScore || 70}%</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                fontSize: '15px',
                color: '#374151',
                fontWeight: '600'
              }}>
                📚 {test.questions?.length || 0} Questions
              </span>
              {test.type === 'challenge' && (
                <span style={{
                  fontSize: '12px',
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>⚡ Advanced Level</span>
              )}
            </div>
          </div>

          {/* Progress indicator for active tests */}
          {actualStatus === 'active' && (
            <div className="test-progress">
              <div className="progress-label">Test Progress</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((test.attempts?.length || 0) / (test.assignedStudents?.length || 1)) * 100}%` }}
                ></div>
              </div>
              <span className="progress-text">
                {test.attempts?.length || 0} / {test.assignedStudents?.length || 0} completed
              </span>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => {
              setSelectedTest(test);
              setShowDetails(true);
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            👁️ View Details
          </button>
          
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${test.title}"? This action cannot be undone.`)) {
                handleDeleteTest(test._id);
              }
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🗑️ Delete
          </button>
          
          {actualStatus === 'draft' && (
            <>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setEditingTest(test);
                  setShowScheduleModal(true);
                }}
              >
                📅 Schedule
              </button>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setEditingTest(test);
                  setShowEditModal(true);
                }}
              >
                ✏️ Edit
              </button>
            </>
          )}
          
          {(actualStatus === 'scheduled' && isTestUpcoming(test)) && (
            <button
              className="btn-edit"
              onClick={() => {
                setEditingTest(test);
                setShowEditModal(true);
              }}
            >
              ✏️ Edit
            </button>
          )}

          {(actualStatus === 'completed' || actualStatus === 'active') && (
            <button
              className="btn-analytics"
              onClick={() => fetchTestAnalytics(test._id)}
            >
              📊 Analytics
            </button>
          )}

          <div className="more-actions">
            <button className="btn-more">⋮</button>
            <div className="actions-dropdown">
              <button onClick={() => handleDuplicateTest(test._id)}>
                📋 Duplicate
              </button>
              {actualStatus === 'draft' && (
                <button 
                  onClick={() => handleDeleteTest(test._id)}
                  className="delete-action"
                >
                  🗑️ Delete
                </button>
              )}
              {(actualStatus === 'completed') && (
                <button onClick={() => {/* Archive functionality */}}>
                  📁 Archive
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Question Row Component
  const QuestionRow = ({ question, index, onEdit, onDelete }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
      <div style={{
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
      }}
      >
        {/* Question Header */}
        <div style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              minWidth: '40px',
              textAlign: 'center'
            }}>
              Q{index}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1f2937', 
                margin: 0,
                lineHeight: '1.4'
              }}>
                {question.questionText}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                padding: '4px 8px',
                backgroundColor: question.difficulty === 'easy' || question.difficulty === 'beginner' ? '#dcfce7' : 
                                 question.difficulty === 'medium' ? '#fef3c7' : '#fecaca',
                color: question.difficulty === 'easy' || question.difficulty === 'beginner' ? '#166534' : 
                       question.difficulty === 'medium' ? '#a16207' : '#dc2626',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {question.difficulty}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                padding: '8px 12px',
                backgroundColor: showDetails ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {showDetails ? '👁️ Hide' : '👁️ View'}
            </button>
            <button
              onClick={onEdit}
              style={{
                padding: '8px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={onDelete}
              style={{
                padding: '8px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🗑️ Remove
            </button>
          </div>
        </div>

        {/* Question Details (expandable) */}
        {showDetails && (
          <div style={{
            padding: '0 20px 20px 20px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc'
          }}>
            <div style={{ paddingTop: '16px' }}>
              <h5 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px',
                margin: 0
              }}>
                Answer Options:
              </h5>
              {question.options && question.options.length > 0 ? (
                <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                  {question.options.map((option, optIndex) => (
                    <div 
                      key={optIndex} 
                      style={{
                        padding: '12px 16px',
                        backgroundColor: option === question.correctAnswer ? '#dcfce7' : 'white',
                        border: `2px solid ${option === question.correctAnswer ? '#22c55e' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <span style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: option === question.correctAnswer ? '#22c55e' : '#94a3b8',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}>
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <span style={{ 
                        color: option === question.correctAnswer ? '#166534' : '#374151',
                        fontWeight: option === question.correctAnswer ? '600' : '500',
                        flex: 1
                      }}>
                        {option}
                      </span>
                      {option === question.correctAnswer && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          backgroundColor: '#166534',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ✓ Correct Answer
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  margin: 0
                }}>
                  No options available for this question.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTestDetails = () => {

    const handleDeleteQuestion = async (questionId) => {
      if (!window.confirm('Are you sure you want to remove this question from the test?')) {
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/tests/${selectedTest._id}/questions/${questionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          // Refresh the test data
          const updatedTest = { 
            ...selectedTest, 
            questions: selectedTest.questions.filter(q => 
              (q.questionId?._id || q._id) !== questionId
            )
          };
          setSelectedTest(updatedTest);
          
          // Also refresh the tests list
          fetchTests();
        } else {
          alert('Failed to remove question from test');
        }
      } catch (error) {
        console.error('Error removing question:', error);
        alert('Error removing question from test');
      }
    };

    return (
      <AnimatePresence>
        {showDetails && selectedTest && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetails(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000, // Higher z-index to ensure it's above everything
              padding: '20px'
            }}
          >
            <motion.div
              className="test-details-modal"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                width: '95%',
                maxWidth: '1200px',
                height: '90vh',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {/* Fixed Header */}
              <div style={{
                padding: '24px 32px',
                borderBottom: '2px solid #e5e7eb',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 10001
              }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  � {selectedTest.title}
                </h2>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {selectedTest.subject} • Grade {selectedTest.grade}
                </p>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDetails(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  zIndex: 10002
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ✕
              </button>
            </div>

              {/* Tab Navigation */}
              <div style={{
                padding: '0 32px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f8fafc',
                display: 'flex',
                gap: '0'
              }}>
                {[
                  { id: 'overview', label: '📋 Overview', icon: '📋' },
                  { id: 'questions', label: '❓ Questions', icon: '❓' },
                  { id: 'students', label: '👥 Students', icon: '👥' },
                  { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '16px 24px',
                      border: 'none',
                      backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                      color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                      fontWeight: activeTab === tab.id ? '600' : '500',
                      fontSize: '15px',
                      cursor: 'pointer',
                      borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== tab.id) {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.color = '#374151';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== tab.id) {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#6b7280';
                      }
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Content */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: '#ffffff'
              }}>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div style={{ padding: '32px' }}>
                    {/* Stats Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '20px',
                      marginBottom: '32px'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        padding: '24px',
                        borderRadius: '16px',
                        color: 'white',
                        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                          {selectedTest.questions?.length || 0}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Questions</div>
                      </div>

                      <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        padding: '24px',
                        borderRadius: '16px',
                        color: 'white',
                        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                          {selectedTest.assignedStudents?.length || 0}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Assigned Students</div>
                      </div>

                      <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        padding: '24px',
                        borderRadius: '16px',
                        color: 'white',
                        boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏱️</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
                          {selectedTest.timeLimit || 30}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Minutes</div>
                      </div>

                      <div style={{
                        background: selectedTest.isActive 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        padding: '24px',
                        borderRadius: '16px',
                        color: 'white',
                        boxShadow: `0 10px 25px ${selectedTest.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                          {selectedTest.isActive ? '✅' : '⏸️'}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                          {selectedTest.isActive ? 'Active' : 'Inactive'}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Status</div>
                      </div>
                    </div>

                    {/* Test Information Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '32px'
                    }}>
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '24px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <h3 style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#1f2937',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          📅 Schedule Details
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
                              Due Date
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                              {new Date(selectedTest.dueDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
                              Created
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                              {new Date(selectedTest.createdAt).toLocaleDateString('en-US')}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
                              Passing Score
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                              {selectedTest.passingScore || 70}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '24px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <h3 style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#1f2937',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          📝 Test Configuration
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
                              Test Type
                            </div>
                            <span style={{ 
                              fontWeight: '600', 
                              padding: '8px 16px',
                              backgroundColor: selectedTest.type === 'challenge' ? '#fef3f2' : '#f0f9ff',
                              color: selectedTest.type === 'challenge' ? '#dc2626' : '#0369a1',
                              borderRadius: '8px',
                              fontSize: '16px',
                              display: 'inline-block'
                            }}>
                              {selectedTest.type === 'challenge' ? '⚡ Challenge Test' : '📚 Regular Test'}
                            </span>
                          </div>
                          {selectedTest.description && (
                            <div>
                              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
                                Description
                              </div>
                              <p style={{ fontSize: '16px', color: '#1f2937', margin: 0, lineHeight: '1.6' }}>
                                {selectedTest.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Questions Tab */}
                {activeTab === 'questions' && (
                  <div style={{ padding: '32px' }}>
                    {/* Header with grade and subject */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '32px',
                      padding: '20px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '28px',
                          fontWeight: '700',
                          color: '#1f2937',
                          margin: 0,
                          marginBottom: '4px'
                        }}>
                          📚 {selectedTest.subject} - Grade {selectedTest.grade}
                        </h3>
                        <p style={{
                          fontSize: '16px',
                          color: '#6b7280',
                          margin: 0
                        }}>
                          Total Questions: {getQuestionsByType().length}
                        </p>
                      </div>
                    </div>

                    {/* Question Type Tabs */}
                    <div style={{
                      display: 'flex',
                      marginBottom: '24px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '12px',
                      padding: '6px',
                      gap: '4px'
                    }}>
                      <button
                        onClick={() => setSelectedQuestionType('regular')}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: selectedQuestionType === 'regular' ? '#3b82f6' : 'transparent',
                          color: selectedQuestionType === 'regular' ? 'white' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        📚 Regular Questions ({getQuestionsByType().filter(q => ['easy', 'beginner', 'medium'].includes(q.difficulty)).length})
                      </button>
                      <button
                        onClick={() => setSelectedQuestionType('challenge')}
                        style={{
                          flex: 1,
                          padding: '12px 20px',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: selectedQuestionType === 'challenge' ? '#ef4444' : 'transparent',
                          color: selectedQuestionType === 'challenge' ? 'white' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        ⚡ Challenge Questions ({getQuestionsByType().filter(q => ['advanced', 'expert', 'hard'].includes(q.difficulty)).length})
                      </button>
                    </div>

                    {/* Regular Questions Content */}
                    {selectedQuestionType === 'regular' && (
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '20px',
                          padding: '16px 20px',
                          backgroundColor: '#f0f9ff',
                          borderRadius: '10px',
                          border: '2px solid #3b82f6'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '700'
                          }}>
                            📚
                          </div>
                          <div>
                            <h4 style={{
                              fontSize: '20px',
                              fontWeight: '700',
                              color: '#1f2937',
                              margin: 0
                            }}>
                              Regular Questions
                            </h4>
                            <p style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              margin: 0
                            }}>
                              Easy to Medium difficulty level questions
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {getQuestionsByType()
                            .filter(q => ['easy', 'beginner', 'medium'].includes(q.difficulty))
                            .map((question, index) => (
                              <QuestionRow 
                                key={question._id || index} 
                                question={question} 
                                index={index + 1}
                                onEdit={() => setEditingQuestion(question)}
                                onDelete={() => handleDeleteQuestion(question._id)}
                              />
                            ))}
                          {getQuestionsByType().filter(q => ['easy', 'beginner', 'medium'].includes(q.difficulty)).length === 0 && (
                            <div style={{
                              textAlign: 'center',
                              padding: '48px',
                              color: '#6b7280',
                              fontSize: '16px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '12px',
                              border: '2px dashed #e5e7eb'
                            }}>
                              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📚</div>
                              <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Regular Questions</h4>
                              <p style={{ margin: 0 }}>No regular difficulty questions found in this test.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Challenge Questions Content */}
                    {selectedQuestionType === 'challenge' && (
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '20px',
                          padding: '16px 20px',
                          backgroundColor: '#fef3f2',
                          borderRadius: '10px',
                          border: '2px solid #ef4444'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '700'
                          }}>
                            ⚡
                          </div>
                          <div>
                            <h4 style={{
                              fontSize: '20px',
                              fontWeight: '700',
                              color: '#1f2937',
                              margin: 0
                            }}>
                              Challenge Questions
                            </h4>
                            <p style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              margin: 0
                            }}>
                              Advanced to Expert difficulty level questions
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {getQuestionsByType()
                            .filter(q => ['advanced', 'expert', 'hard'].includes(q.difficulty))
                            .map((question, index) => (
                              <QuestionRow 
                                key={question._id || index} 
                                question={question} 
                                index={index + 1}
                                onEdit={() => setEditingQuestion(question)}
                                onDelete={() => handleDeleteQuestion(question._id)}
                              />
                            ))}
                          {getQuestionsByType().filter(q => ['advanced', 'expert', 'hard'].includes(q.difficulty)).length === 0 && (
                            <div style={{
                              textAlign: 'center',
                              padding: '48px',
                              color: '#6b7280',
                              fontSize: '16px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '12px',
                              border: '2px dashed #e5e7eb'
                            }}>
                              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
                              <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Challenge Questions</h4>
                              <p style={{ margin: 0 }}>No advanced difficulty questions found in this test.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Students Tab */}
                {activeTab === 'students' && (
                  <div style={{ padding: '32px' }}>
                    <h3 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '24px'
                    }}>
                      Assigned Students ({selectedTest.assignedStudents?.length || 0})
                    </h3>
                    
                    {selectedTest.assignedStudents && selectedTest.assignedStudents.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px'
                      }}>
                        {selectedTest.assignedStudents.map(student => (
                          <div key={student._id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '20px',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            border: '2px solid #e5e7eb',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          >
                            <div style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '50%',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              fontWeight: '700'
                            }}>
                              {student.profile?.firstName?.[0]}{student.profile?.lastName?.[0]}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                                {student.profile?.firstName} {student.profile?.lastName}
                              </div>
                              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                @{student.username}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '48px',
                        color: '#6b7280',
                        fontSize: '16px'
                      }}>
                        No students assigned to this test.
                      </div>
                    )}
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div style={{ padding: '32px' }}>
                    <h3 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '24px'
                    }}>
                      Test Settings & Actions
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '32px'
                    }}>
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '24px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <h4 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '16px'
                        }}>
                          Quick Actions
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <button
                            onClick={() => {
                              setEditingTest(selectedTest);
                              setShowEditModal(true);
                              setShowDetails(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              justifyContent: 'flex-start'  
                            }}
                          >
                            ✏️ Edit Test Details
                          </button>
                          <button
                            onClick={() => {
                              handleDuplicateTest(selectedTest._id);
                              setShowDetails(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              justifyContent: 'flex-start'  
                            }}
                          >
                            📋 Duplicate Test
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${selectedTest.title}"? This action cannot be undone.`)) {
                                handleDeleteTest(selectedTest._id);
                                setShowDetails(false);
                              }
                            }}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              justifyContent: 'flex-start'  
                            }}
                          >
                            🗑️ Delete Test
                          </button>
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '24px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <h4 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '16px'
                        }}>
                          Test Information
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Test ID:</span>
                            <div style={{ fontSize: '14px', color: '#1f2937', fontFamily: 'monospace', backgroundColor: '#e5e7eb', padding: '4px 8px', borderRadius: '4px', marginTop: '2px' }}>
                              {selectedTest._id}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Instructions:</span>
                            <div style={{ fontSize: '14px', color: '#1f2937', marginTop: '2px' }}>
                              {selectedTest.instructions || 'No special instructions'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            {/* Footer Actions */}
            <div style={{
              padding: '24px 32px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setEditingTest(selectedTest);
                    setShowEditModal(true);
                    setShowDetails(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ✏️ Edit Test
                </button>
                <button
                  onClick={() => handleDuplicateTest(selectedTest._id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📋 Duplicate
                </button>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${selectedTest.title}"? This action cannot be undone.`)) {
                    handleDeleteTest(selectedTest._id);
                    setShowDetails(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🗑️ Delete Test
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

  const renderEditModal = () => (
    <AnimatePresence>
      {showEditModal && editingTest && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowEditModal(false)}
        >
          <motion.div
            className="modal-content edit-test-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>✏️ Edit Test: {editingTest.title}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="edit-form">
              <div className="form-group">
                <label>Test Title</label>
                <input
                  type="text"
                  defaultValue={editingTest.title}
                  onChange={(e) => setEditingTest({...editingTest, title: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  defaultValue={editingTest.description}
                  onChange={(e) => setEditingTest({...editingTest, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Time Limit (minutes)</label>
                  <input
                    type="number"
                    defaultValue={editingTest.timeLimit}
                    onChange={(e) => setEditingTest({...editingTest, timeLimit: parseInt(e.target.value)})}
                    min="10"
                    max="120"
                  />
                </div>

                <div className="form-group">
                  <label>Passing Score (%)</label>
                  <input
                    type="number"
                    defaultValue={editingTest.passingScore}
                    onChange={(e) => setEditingTest({...editingTest, passingScore: parseInt(e.target.value)})}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="datetime-local"
                  defaultValue={new Date(editingTest.dueDate).toISOString().slice(0, 16)}
                  onChange={(e) => setEditingTest({...editingTest, dueDate: e.target.value})}
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={() => handleEditTest(editingTest._id, editingTest)}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderScheduleModal = () => (
    <AnimatePresence>
      {showScheduleModal && editingTest && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowScheduleModal(false)}
        >
          <motion.div
            className="modal-content schedule-test-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>📅 Schedule Test: {editingTest.title}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowScheduleModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="schedule-form">
              <div className="form-group">
                <label>Start Date & Time</label>
                <input
                  type="datetime-local"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setEditingTest({...editingTest, startDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Due Date & Time</label>
                <input
                  type="datetime-local"
                  defaultValue={new Date(editingTest.dueDate).toISOString().slice(0, 16)}
                  onChange={(e) => setEditingTest({...editingTest, dueDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Instructions for Students</label>
                <textarea
                  defaultValue={editingTest.instructions}
                  onChange={(e) => setEditingTest({...editingTest, instructions: e.target.value})}
                  rows="3"
                  placeholder="Any special instructions for students..."
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-schedule"
                  onClick={() => handleScheduleTest(editingTest._id, {
                    startDate: editingTest.startDate,
                    dueDate: editingTest.dueDate,
                    instructions: editingTest.instructions,
                    status: 'scheduled'
                  })}
                >
                  📅 Schedule Test
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderAnalyticsModal = () => (
    <AnimatePresence>
      {showAnalytics && testAnalytics && (
        <motion.div
          className="modal-overlay analytics-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAnalytics(false)}
        >
          <motion.div
            className="modal-content analytics-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>📊 Test Analytics</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAnalytics(false)}
              >
                ✕
              </button>
            </div>

            <div className="analytics-body">
              <div className="analytics-summary">
                <div className="stat-card">
                  <div className="stat-value">{testAnalytics.totalAttempts || 0}</div>
                  <div className="stat-label">Total Attempts</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{testAnalytics.averageScore || 0}%</div>
                  <div className="stat-label">Average Score</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{testAnalytics.passRate || 0}%</div>
                  <div className="stat-label">Pass Rate</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{testAnalytics.averageTime || 0}m</div>
                  <div className="stat-label">Avg. Completion Time</div>
                </div>
              </div>

              {testAnalytics.studentPerformance && (
                <div className="student-performance">
                  <h4>Student Performance</h4>
                  <div className="performance-list">
                    {testAnalytics.studentPerformance.map(student => (
                      <div key={student.studentId} className="performance-item">
                        <div className="student-info">
                          <span className="student-name">{student.studentName}</span>
                          <span className="completion-time">{student.completionTime}m</span>
                        </div>
                        <div className="score-bar">
                          <div 
                            className="score-fill"
                            style={{ width: `${student.score}%` }}
                          ></div>
                          <span className="score-text">{student.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testAnalytics.questionAnalysis && (
                <div className="question-analysis">
                  <h4>Question Analysis</h4>
                  <div className="question-stats">
                    {testAnalytics.questionAnalysis.map((question, index) => (
                      <div key={index} className="question-stat">
                        <div className="question-text">{question.questionText}</div>
                        <div className="correct-rate">
                          {question.correctRate}% correct
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
        <div className="header-actions">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log(`[${new Date().toLocaleTimeString()}] 🎯 BUTTON CLICKED!`);
              console.log(`[${new Date().toLocaleTimeString()}] Event:`, e);
              console.log(`[${new Date().toLocaleTimeString()}] onCreateTest exists:`, typeof onCreateTest);
              
              if (typeof onCreateTest === 'function') {
                console.log(`[${new Date().toLocaleTimeString()}] ✅ Calling onCreateTest`);
                try {
                  onCreateTest();
                  console.log(`[${new Date().toLocaleTimeString()}] ✅ onCreateTest called successfully`);
                } catch (error) {
                  console.error(`[${new Date().toLocaleTimeString()}] ❌ Error calling onCreateTest:`, error);
                }
              } else {
                console.error(`[${new Date().toLocaleTimeString()}] ❌ onCreateTest is not a function, it is:`, onCreateTest);
              }
            }}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              zIndex: 9999,
              position: 'relative'
            }}
          >
            ➕ Create New Test
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="test-controls">
        <div className="filter-controls">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Tests</option>
              <option value="draft">📝 Draft</option>
              <option value="scheduled">⏰ Scheduled</option>
              <option value="active">🚀 Active</option>
              <option value="completed">✅ Completed</option>
              <option value="archived">📁 Archived</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
              <option value="dueDate">Due Date</option>
              <option value="studentCount">Student Count</option>
            </select>
          </div>

          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '📈' : '📉'}
          </button>
        </div>


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



      {/* Temporarily removed assignment warning for debugging */}

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
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`[${new Date().toLocaleTimeString()}] 🎯 Create Your First Test clicked!`);
                
                if (typeof onCreateTest === 'function') {
                  console.log(`[${new Date().toLocaleTimeString()}] ✅ Calling onCreateTest`);
                  onCreateTest();
                } else {
                  console.error(`[${new Date().toLocaleTimeString()}] ❌ onCreateTest is not a function`);
                }
              }}
              style={{
                background: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Create Your First Test
            </button>
          </motion.div>
        ) : (
          <>
            <div className="tests-summary">
              <span className="tests-count">
                Showing {getFilteredAndSortedTests().length} of {tests.length} tests
              </span>
            </div>
            <div className="tests-grid">
              {getFilteredAndSortedTests().map(renderTestCard)}
            </div>
            {getFilteredAndSortedTests().length === 0 && filterStatus !== 'all' && (
              <motion.div 
                className="no-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="no-results-icon">🔍</div>
                <h3>No tests found</h3>
                <p>Try adjusting your filters to see more tests</p>
                <button 
                  className="btn-clear-filters"
                  onClick={() => {
                    setFilterStatus('all');
                    setSortBy('createdAt');
                    setSortOrder('desc');
                  }}
                >
                  Clear Filters
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {renderTestDetails()}
      {renderEditModal()}
      {renderScheduleModal()}
      {renderAnalyticsModal()}
    </div>
  );
};

export default TestManagement;

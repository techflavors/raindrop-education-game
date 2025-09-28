import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Add CSS animation for the success icon
const pulseAnimation = `
  @keyframes pulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
      transform: scale(1.05);
      box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = pulseAnimation;
  document.head.appendChild(styleSheet);
}

const TestCreation = ({ user, onBack, onTestCreated }) => {
  // Use assigned grades and subjects from user profile
  const assignedGrades = user?.profile?.assignedGrades || [];
  const assignedSubjects = user?.profile?.subjects || [];

  // Helper function to get default due date (5 days from today)
  const getDefaultDueDate = () => {
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    return fiveDaysFromNow.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'regular', // Use 'regular' as the backend expects this enum value
    grade: '',
    subject: '',
    assignedStudents: [], // Will be auto-populated with all students in grade
    timeLimit: 30,
    dueDate: getDefaultDueDate(), // Set default due date to 5 days from now
    instructions: '',
    passingScore: 70,
    regularQuestions: 5, // Number of regular difficulty questions
    advancedQuestions: 5  // Number of advanced difficulty questions
  });

  const [questionPreview, setQuestionPreview] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdTest, setCreatedTest] = useState(null);

  const fetchQuestionPreview = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/tests/questions/preview', {
        params: {
          grade: formData.grade,
          subject: formData.subject,
          type: formData.type,
          regularQuestions: formData.regularQuestions,
          advancedQuestions: formData.advancedQuestions
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setQuestionPreview(response.data);
      }
    } catch (error) {
      console.error('Error fetching question preview:', error);
      setError('Failed to load question preview');
    }
  }, [formData.grade, formData.subject, formData.type, formData.regularQuestions, formData.advancedQuestions]);

  const fetchStudents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/tests/students/${formData.grade}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const students = response.data.students;
        setAvailableStudents(students);
        
        // Automatically assign ALL students in the grade
        const allStudentIds = students.map(student => student._id);
        setFormData(prev => ({
          ...prev,
          assignedStudents: allStudentIds
        }));
        
        console.log(`Auto-assigned ${allStudentIds.length} students to test for Grade ${formData.grade}`);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    }
  }, [formData.grade]);

  // Fetch question preview when grade/subject/type/question counts change
  useEffect(() => {
    if (formData.grade && formData.subject) {
      fetchQuestionPreview();
    }
  }, [formData.grade, formData.subject, formData.type, formData.regularQuestions, formData.advancedQuestions, fetchQuestionPreview]);

  // Fetch students when grade changes
  useEffect(() => {
    if (formData.grade) {
      fetchStudents();
    }
  }, [formData.grade, fetchStudents]);

  // Initialize form data when user assignments are available
  useEffect(() => {
    if (assignedGrades.length > 0 && assignedSubjects.length > 0 && !formData.grade) {
      setFormData(prev => ({
        ...prev,
        grade: assignedGrades[0],
        subject: assignedSubjects[0]
      }));
    }
  }, [assignedGrades, assignedSubjects, formData.grade]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.title || !formData.grade || !formData.subject || !formData.dueDate) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.assignedStudents.length === 0) {
        throw new Error('Please select at least one student');
      }

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/tests/create', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Store the created test data for the confirmation modal
        setCreatedTest({
          ...response.data.test,
          questionDistribution: response.data.questionDistribution
        });
        
        // Show confirmation modal
        setShowConfirmation(true);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          type: 'regular',
          grade: '',
          subject: '',
          assignedStudents: [],
          timeLimit: 30,
          dueDate: getDefaultDueDate(),
          instructions: '',
          passingScore: 70,
          regularQuestions: 5,
          advancedQuestions: 5
        });
        
        setQuestionPreview(null);
        setAvailableStudents([]);
      }
    } catch (error) {
      console.error('Error creating test:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Show loading if user assignments are not available
  if (!user || !user.profile || assignedGrades.length === 0 || assignedSubjects.length === 0) {
    return (
      <div className="test-creation-container">
        <div className="test-creation-header">
          <button onClick={onBack} className="back-button">← Back to Dashboard</button>
          <h2>🎯 Create New Test</h2>
        </div>
        <div className="loading-assignments">
          <div className="loading-spinner"></div>
          <p>Loading your assigned grades and subjects...</p>
          {assignedGrades.length === 0 && <p style={{color: '#e74c3c'}}>⚠️ No grades assigned to your profile</p>}
          {assignedSubjects.length === 0 && <p style={{color: '#e74c3c'}}>⚠️ No subjects assigned to your profile</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="test-creation-container">
      <div className="test-creation-header">
        <button onClick={onBack} className="back-button">← Back to Dashboard</button>
        <h2>🎯 Create New Test</h2>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="test-creation-form">
        {/* Basic Test Information */}
        <div className="form-section">
          <h3>📝 Test Information</h3>
          
          <div className="form-group">
            <label htmlFor="title">Test Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Grade 5 Math Assessment"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of the test..."
              rows="3"
            />
          </div>
        </div>

        {/* Grade and Subject */}
        <div className="form-section">
          <h3>🎓 Grade & Subject</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="grade">Grade *</label>
              <select
                id="grade"
                name="grade"
                value={formData.grade || assignedGrades[0] || ''}
                onChange={handleInputChange}
                required
              >
                {assignedGrades.length === 0 ? (
                  <option value="">No grades assigned</option>
                ) : (
                  assignedGrades.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject *</label>
              <select
                id="subject"
                name="subject"
                value={formData.subject || assignedSubjects[0] || ''}
                onChange={handleInputChange}
                required
              >
                {assignedSubjects.length === 0 ? (
                  <option value="">No subjects assigned</option>
                ) : (
                  assignedSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))
                )}
              </select>
            </div>
          </div>


        </div>



        {/* Test Settings with Question Configuration */}
        <div className="form-section">
          <h3>⚙️ Test Settings</h3>
          
          {/* Question Configuration - Side by Side */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="regularQuestions">📖 Regular Questions</label>
              <input
                type="number"
                id="regularQuestions"
                name="regularQuestions"
                value={formData.regularQuestions}
                onChange={handleInputChange}
                min="1"
                max="20"
              />
              <small>Basic to intermediate difficulty</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="advancedQuestions">⚡ Advanced Questions</label>
              <input
                type="number"
                id="advancedQuestions"
                name="advancedQuestions"
                value={formData.advancedQuestions}
                onChange={handleInputChange}
                min="1"
                max="20"
              />
              <small>High difficulty questions</small>
            </div>
          </div>
          
          <div className="total-questions-display" style={{ textAlign: 'center', margin: '1rem 0', padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px' }}>
            <strong>Total Questions: {parseInt(formData.regularQuestions) + parseInt(formData.advancedQuestions)}</strong>
          </div>
          
          <div className="form-row" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="timeLimit">Time Limit (minutes) *</label>
              <input
                type="number"
                id="timeLimit"
                name="timeLimit"
                value={formData.timeLimit}
                onChange={handleInputChange}
                min="10"
                max="120"
                required
              />
              <small>Enter the time limit for students to complete the test</small>
            </div>

            <div className="form-group">
              <label htmlFor="passingScore">Passing Score (%)</label>
              <input
                type="number"
                id="passingScore"
                name="passingScore"
                value={formData.passingScore}
                onChange={handleInputChange}
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Due Date *</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              min={getMinDate()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="instructions">Instructions for Students</label>
            <textarea
              id="instructions"
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              placeholder="Special instructions for students taking this test..."
              rows="3"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          
          <button
            type="submit"
            className="create-test-btn"
            disabled={loading || !questionPreview?.canCreateTest || formData.assignedStudents.length === 0}
            style={{
              opacity: (loading || !questionPreview?.canCreateTest || formData.assignedStudents.length === 0) ? 0.5 : 1,
              cursor: (loading || !questionPreview?.canCreateTest || formData.assignedStudents.length === 0) ? 'not-allowed' : 'pointer',
              background: (loading || !questionPreview?.canCreateTest || formData.assignedStudents.length === 0) ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              zIndex: 1000,
              position: 'relative'
            }}
            onClick={(e) => {
              console.log('🎯 CREATE TEST BUTTON CLICKED!');
              console.log('Button disabled?', loading || !questionPreview?.canCreateTest || formData.assignedStudents.length === 0);
              console.log('Loading:', loading);
              console.log('Question Preview:', questionPreview);
              console.log('Can Create Test:', questionPreview?.canCreateTest);
              console.log('Assigned Students:', formData.assignedStudents.length);
              console.log('Form Data:', formData);
              
              // If disabled, prevent default and show alert
              if (loading || !questionPreview?.canCreateTest || formData.assignedStudents.length === 0) {
                e.preventDefault();
                alert('Button is disabled. Check the debug info below the button.');
                return;
              }
            }}
          >
            {loading ? (
              <span>🔄 Creating Test...</span>
            ) : (
              <span>📚 Create Test</span>
            )}
          </button>
          
          {/* Additional debug info */}
          {(loading || !questionPreview?.canCreateTest || formData.assignedStudents.length === 0) && (
            <div className="button-disabled-reasons" style={{ marginTop: '10px', fontSize: '12px', color: '#e74c3c' }}>
              <strong>Button disabled because:</strong>
              {loading && <div>• Test is being created</div>}
              {!questionPreview?.canCreateTest && <div>• Not enough questions available for this grade/subject</div>}
              {formData.assignedStudents.length === 0 && <div>• No students assigned</div>}
            </div>
          )}
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmation && createdTest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              margin: '0 auto 24px auto',
              animation: 'pulse 2s infinite'
            }}>
              ✅
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>
              Test Created Successfully! 🎉
            </h2>

            {/* Test Details */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '24px',
              margin: '24px 0',
              textAlign: 'left'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 16px 0',
                textAlign: 'center'
              }}>
                📋 {createdTest.title}
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Subject & Grade</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {createdTest.subject} - Grade {createdTest.grade}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Test Type</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {createdTest.type === 'challenge' ? '⚡ Challenge Test' : '📚 Regular Test'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Total Questions</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {createdTest.questions?.length || 0} Questions
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Students Assigned</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {createdTest.assignedStudents?.length || 0} Students
                  </div>
                </div>
              </div>

              {/* Question Distribution */}
              {createdTest.questionDistribution && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>
                    Question Distribution:
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    📚 Regular: {createdTest.questionDistribution.regular || 0} questions • 
                    ⚡ Advanced: {createdTest.questionDistribution.advanced || 0} questions
                  </div>
                </div>
              )}

              {/* Due Date */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Due Date</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {new Date(createdTest.dueDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              marginTop: '32px'
            }}>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  if (onTestCreated) {
                    onTestCreated(createdTest);
                  } else if (onBack) {
                    // Fallback to onBack if onTestCreated is not provided
                    onBack();
                  }
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                📋 Go to Test Dashboard
              </button>
              
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  // Stay on test creation page for creating another test
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                ➕ Create Another Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCreation;

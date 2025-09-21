import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TestCreation = ({ user, onBack, onTestCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    grade: '',
    subject: '',
    regularQuestionCount: 10,
    challengeQuestionCount: 5,
    scheduledDate: '',
    startTime: '',
    duration: 60,
    settings: {
      shuffleQuestions: true,
      showResults: true,
      passingScore: 70
    }
  });

  const [regularQuestions, setRegularQuestions] = useState([]);
  const [challengeQuestions, setChallengeQuestions] = useState([]);
  const [selectedRegular, setSelectedRegular] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Get teacher's assigned grades and subjects
  const teacherGrades = user?.profile?.assignedGrades || [];
  const teacherSubjects = user?.profile?.subjects || [];
  
  // Use teacher's assigned grades and subjects instead of all options
  const grades = teacherGrades.length > 0 ? teacherGrades : [];
  const subjects = teacherSubjects.length > 0 ? teacherSubjects : [];

  // Fetch questions when grade and subject change
  useEffect(() => {
    if (formData.grade && formData.subject) {
      fetchQuestions();
    }
  }, [formData.grade, formData.subject]);

  // Fetch students when grade changes
  useEffect(() => {
    if (formData.grade) {
      fetchStudents();
    }
  }, [formData.grade]);

  const fetchQuestions = async () => {
    if (!formData.grade || !formData.subject) {
      console.log('Grade or subject not set:', { grade: formData.grade, subject: formData.subject });
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching questions for:', { grade: formData.grade, subject: formData.subject });
      
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      const response = await fetch(
        `/api/tests/questions/${formData.grade}/${formData.subject}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('=== FRONTEND: Questions data received ===');
        console.log('Full API response:', data);
        console.log('Regular questions count:', data.regularQuestions?.length);
        console.log('Challenge questions count:', data.challengeQuestions?.length);
        
        if (data.regularQuestions?.length > 0) {
          console.log('Sample regular question:', data.regularQuestions[0]);
          console.log('Regular question text:', data.regularQuestions[0].questionText);
        }
        
        if (data.challengeQuestions?.length > 0) {
          console.log('Sample challenge question:', data.challengeQuestions[0]);
          console.log('Challenge question text:', data.challengeQuestions[0].questionText);
        }
        
        setRegularQuestions(data.regularQuestions || []);
        setChallengeQuestions(data.challengeQuestions || []);
        setSelectedRegular([]);
        setSelectedChallenge([]);
        console.log('=== FRONTEND: State updated ===');
      } else {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        setError('Failed to fetch questions');
      }
    } catch (error) {
      setError('Error fetching questions');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tests/students/${formData.grade}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleQuestionSelect = (questionId, type) => {
    if (type === 'regular') {
      setSelectedRegular(prev => {
        if (prev.includes(questionId)) {
          return prev.filter(id => id !== questionId);
        } else if (prev.length < 10) {
          return [...prev, questionId];
        }
        return prev;
      });
    } else {
      setSelectedChallenge(prev => {
        if (prev.includes(questionId)) {
          return prev.filter(id => id !== questionId);
        } else if (prev.length < 5) {
          return [...prev, questionId];
        }
        return prev;
      });
    }
  };

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedRegular.length !== 10) {
      setError('Please select exactly 10 regular questions');
      return;
    }
    
    if (selectedChallenge.length !== 5) {
      setError('Please select exactly 5 challenge questions');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          regularQuestions: selectedRegular,
          challengeQuestions: selectedChallenge,
          studentIds: selectedStudents
        })
      });

      if (response.ok) {
        const data = await response.json();
        onTestCreated(data.test);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create test');
      }
    } catch (error) {
      setError('Error creating test');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3, 4, 5].map(stepNum => (
        <div 
          key={stepNum}
          className={`step ${step >= stepNum ? 'active' : ''} ${step > stepNum ? 'completed' : ''}`}
        >
          <div className="step-number">{stepNum}</div>
          <div className="step-label">
            {stepNum === 1 ? 'Basic Info' : 
             stepNum === 2 ? 'Question Counts' :
             stepNum === 3 ? 'Regular Questions' :
             stepNum === 4 ? 'Challenge Questions' : 'Schedule & Assign'}
          </div>
        </div>
      ))}
    </div>
  );

  const renderBasicInfo = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="step-content"
    >
      <h3>📋 Test Basic Information</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Test Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Chapter 5 Math Test"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description about the test..."
            rows="3"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Grade *</label>
            <select
              value={formData.grade}
              onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
              required
            >
              <option value="">Select Grade</option>
              {grades.map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Subject *</label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderQuestionCounts = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="step-content"
    >
      <div className="step-header">
        <h3>📊 Question Configuration</h3>
        <p>Set the number of questions for your test</p>
      </div>
      
      <div className="question-counts-form">
        <div className="count-section">
          <div className="form-group">
            <label>Regular Questions *</label>
            <select
              value={formData.regularQuestionCount}
              onChange={(e) => setFormData(prev => ({ ...prev, regularQuestionCount: parseInt(e.target.value) }))}
              required
            >
              {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(count => (
                <option key={count} value={count}>{count} questions</option>
              ))}
            </select>
            <small>Questions that all students must answer</small>
          </div>
          
          <div className="form-group">
            <label>Challenge Questions *</label>
            <select
              value={formData.challengeQuestionCount}
              onChange={(e) => setFormData(prev => ({ ...prev, challengeQuestionCount: parseInt(e.target.value) }))}
              required
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map(count => (
                <option key={count} value={count}>{count} questions</option>
              ))}
            </select>
            <small>Expert-level questions for challenging students</small>
          </div>
        </div>
        
        <div className="total-summary">
          <div className="summary-card">
            <h4>📋 Test Summary</h4>
            <div className="summary-details">
              <div className="summary-item">
                <span className="label">Regular Questions:</span>
                <span className="value">{formData.regularQuestionCount}</span>
              </div>
              <div className="summary-item">
                <span className="label">Challenge Questions:</span>
                <span className="value">{formData.challengeQuestionCount}</span>
              </div>
              <div className="summary-item total">
                <span className="label">Total Questions:</span>
                <span className="value">{formData.regularQuestionCount + formData.challengeQuestionCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderQuestionSelection = (type) => {
    const questions = type === 'regular' ? regularQuestions : challengeQuestions;
    const selected = type === 'regular' ? selectedRegular : selectedChallenge;
    const maxSelection = type === 'regular' ? formData.regularQuestionCount : formData.challengeQuestionCount;
    const title = type === 'regular' ? 'Regular Questions' : 'Challenge Questions';
    const description = type === 'regular' 
      ? `Select ${formData.regularQuestionCount} questions that all students must answer`
      : `Select ${formData.challengeQuestionCount} expert-level questions for student challenges`;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="step-content"
      >
        <div className="step-header">
          <h3>📝 {title}</h3>
          <p>{description}</p>
          <div className="selection-status">
            <span className={`status ${selected.length === maxSelection ? 'complete' : 'incomplete'}`}>
              {selected.length} / {maxSelection} selected
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(selected.length / maxSelection) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="no-questions">
            <p>⚠️ No questions available for {formData.grade} Grade {formData.subject}</p>
            <p>Please go back and select a different grade/subject or create some questions first.</p>
          </div>
        ) : (
          <div className="questions-list-view">
            <div className="questions-list-header">
              <div className="header-item select">Select</div>
              <div className="header-item question">Question</div>
              <div className="header-item difficulty">Difficulty</div>
              <div className="header-item answers">Answers</div>
            </div>
            
            <div className="questions-list-body">
              {questions.map((question, index) => {
                console.log(`Rendering question ${index}:`, {
                  id: question._id,
                  text: question.questionText,
                  difficulty: question.difficulty,
                  answersCount: question.answers?.length
                });
                return (
                <motion.div
                  key={question._id}
                  className={`question-list-item ${selected.includes(question._id) ? 'selected' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className="list-item-content">
                    <div className="select-column">
                      <label className="custom-checkbox">
                        <input
                          type="checkbox"
                          checked={selected.includes(question._id)}
                          onChange={() => handleQuestionSelect(question._id, type)}
                          disabled={!selected.includes(question._id) && selected.length >= maxSelection}
                        />
                        <span className="checkmark"></span>
                      </label>
                    </div>
                    
                    <div className="question-column">
                      <div className="question-text">
                        {question.questionText || '[No question text]'}
                      </div>
                      {question.answers && question.answers.length > 0 && (
                        <div className="answer-preview">
                          <div className="correct-answer">
                            ✓ {question.answers.find(a => a.isCorrect)?.text || 'No correct answer set'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="difficulty-column">
                      <span className={`difficulty-badge ${question.difficulty}`}>
                        {question.difficulty}
                      </span>
                    </div>
                    
                    <div className="answers-column">
                      <span className="answer-count">
                        {question.answers?.length || 0} options
                      </span>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
            
            {selected.length > 0 && (
              <div className="selection-summary">
                <h4>Selected Questions ({selected.length}/{maxSelection})</h4>
                <div className="selected-list">
                  {selected.map((questionId, index) => {
                    const question = questions.find(q => q._id === questionId);
                    return question ? (
                      <div key={questionId} className="selected-item">
                        <span className="item-number">{index + 1}.</span>
                        <span className="item-text">
                          {question.questionText.length > 60 
                            ? `${question.questionText.substring(0, 60)}...` 
                            : question.questionText}
                        </span>
                        <button
                          className="remove-btn"
                          onClick={() => handleQuestionSelect(questionId, type)}
                          title="Remove from selection"
                        >
                          ✕
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  const renderScheduleAndAssign = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="step-content"
    >
      <h3>📅 Schedule & Assign Test</h3>
      
      <div className="form-grid">
        <div className="schedule-section">
          <h4>⏰ Test Schedule</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                min={getTomorrowDate()}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Duration (minutes) *</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                min="30"
                max="180"
                step="15"
                required
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h4>⚙️ Test Settings</h4>
          <div className="settings-grid">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.settings.shuffleQuestions}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, shuffleQuestions: e.target.checked }
                }))}
              />
              <span className="checkmark"></span>
              Shuffle Questions
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.settings.showResults}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, showResults: e.target.checked }
                }))}
              />
              <span className="checkmark"></span>
              Show Results to Students
            </label>
            
            <div className="form-group">
              <label>Passing Score (%)</label>
              <input
                type="number"
                value={formData.settings.passingScore}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, passingScore: parseInt(e.target.value) }
                }))}
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        <div className="students-section">
          <h4>👥 Assign to Students</h4>
          <div className="students-selection">
            {students.length === 0 ? (
              <p>No students found for Grade {formData.grade}</p>
            ) : (
              <div className="students-grid">
                {students.map(student => (
                  <motion.div
                    key={student._id}
                    className={`student-card ${selectedStudents.includes(student._id) ? 'selected' : ''}`}
                    onClick={() => handleStudentSelect(student._id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="student-avatar">
                      {student.profile.firstName?.[0]}{student.profile.lastName?.[0]}
                    </div>
                    <div className="student-info">
                      <div className="student-name">
                        {student.profile.firstName} {student.profile.lastName}
                      </div>
                      <div className="student-username">@{student.username}</div>
                    </div>
                    <div className="selection-indicator">
                      {selectedStudents.includes(student._id) ? '✓' : '○'}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="test-creation">
      <div className="test-creation-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Tests
        </button>
        <h2>Create New Test</h2>
      </div>

      {/* Check if teacher has assignments */}
      {(grades.length === 0 || subjects.length === 0) ? (
        <motion.div 
          className="warning-message"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '2rem',
            borderRadius: '12px',
            margin: '2rem 0',
            textAlign: 'center'
          }}
        >
          <h3>⚠️ No Grade or Subject Assignments</h3>
          <p>You need to have grades and subjects assigned by an administrator before you can create tests.</p>
          <p><strong>Currently assigned:</strong></p>
          <p>Grades: {grades.length > 0 ? grades.join(', ') : 'None'}</p>
          <p>Subjects: {subjects.length > 0 ? subjects.join(', ') : 'None'}</p>
          <br />
          <small>Please contact your administrator to assign you to specific grades and subjects.</small>
        </motion.div>
      ) : (
        <>
          {renderStepIndicator()}

      <form onSubmit={handleSubmit} className="test-creation-form">
        <AnimatePresence mode="wait">
          {step === 1 && renderBasicInfo()}
          {step === 2 && renderQuestionCounts()}
          {step === 3 && renderQuestionSelection('regular')}
          {step === 4 && renderQuestionSelection('challenge')}
          {step === 5 && renderScheduleAndAssign()}
        </AnimatePresence>

        {error && (
          <motion.div 
            className="error-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <div className="form-actions">
          {step > 1 && (
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setStep(prev => prev - 1)}
            >
              Previous
            </button>
          )}
          
          {step < 5 ? (
            <button 
              type="button" 
              className="btn-primary"
              onClick={() => {
                if (step === 1 && (!formData.title || !formData.grade || !formData.subject)) {
                  setError('Please fill in all required fields');
                  return;
                }
                if (step === 2 && (!formData.regularQuestionCount || !formData.challengeQuestionCount)) {
                  setError('Please specify question counts');
                  return;
                }
                if (step === 3 && selectedRegular.length !== formData.regularQuestionCount) {
                  setError(`Please select exactly ${formData.regularQuestionCount} regular questions`);
                  return;
                }
                if (step === 4 && selectedChallenge.length !== formData.challengeQuestionCount) {
                  setError(`Please select exactly ${formData.challengeQuestionCount} challenge questions`);
                  return;
                }
                setError('');
                setStep(prev => prev + 1);
              }}
              disabled={loading}
            >
              Next
            </button>
          ) : (
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || !formData.scheduledDate || !formData.startTime}
            >
              {loading ? 'Creating Test...' : 'Create Test'}
            </button>
          )}
        </div>
      </form>
      </>
      )}
    </div>
  );
};

export default TestCreation;

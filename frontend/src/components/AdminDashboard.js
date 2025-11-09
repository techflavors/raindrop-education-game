import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    systemStatus: 'active'
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Filter and search states
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'edit', 'view', 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    role: 'student',
    firstName: '',
    lastName: '',
    grade: '',
    assignedGrades: [],
    subjects: [],
    assignedStudents: []
  });

  // Form states
  const [userForm, setUserForm] = useState({
    role: 'teacher',
    firstName: '',
    lastName: '',
    grade: '',
    assignedGrades: [],
    subjects: [],
    assignedStudents: []
  });

  // Predefined options
  const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
  const subjects = ['Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE'];

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.role !== 'admin') {
        window.location.href = '/login';
      }
    } else {
      window.location.href = '/login';
    }
    
    loadDashboardStats();
    fetchUsers();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch stats');
        // Fallback to dummy data if API fails
        setStats({
          totalUsers: 0,
          totalTeachers: 0,
          totalStudents: 0,
          systemStatus: 'error'
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback to dummy data if API fails
      setStats({
        totalUsers: 0,
        totalTeachers: 0,
        totalStudents: 0,
        systemStatus: 'error'
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMultiSelectChange = (field, value) => {
    setUserForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  // Generate unique username based on first name with random digits
  const generateUsername = async (firstName) => {
    if (!firstName) return '';
    
    // Get first 4 characters of first name (pad with 'x' if less than 4)
    const namePrefix = (firstName.toLowerCase().replace(/[^a-z]/g, '') + 'xxxx').substring(0, 4);
    
    // Get existing usernames to ensure uniqueness
    const existingUsers = users.map(user => user.username);
    
    // Generate random 4-digit number and check uniqueness
    let username;
    let attempts = 0;
    do {
      const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number between 1000-9999
      username = namePrefix + randomDigits;
      attempts++;
    } while (existingUsers.includes(username) && attempts < 100);
    
    // If we can't find a unique username after 100 attempts, add timestamp
    if (existingUsers.includes(username)) {
      username = namePrefix + Date.now().toString().slice(-4);
    }
    
    return username;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Generate unique username
      const generatedUsername = await generateUsername(userForm.firstName);
      
      const userData = { 
        ...userForm,
        username: generatedUsername,
        password: 'password1234'
      };
      
      // Clean up data based on role
      if (userData.role === 'student') {
        delete userData.assignedGrades;
        delete userData.subjects;
        delete userData.assignedStudents;
      } else if (userData.role === 'teacher') {
        delete userData.grade;
      } else if (userData.role === 'admin') {
        delete userData.grade;
        delete userData.assignedGrades;
        delete userData.subjects;
        delete userData.assignedStudents;
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} created successfully! Username: ${generatedUsername}`);
        setUserForm({
          role: 'teacher',
          firstName: '',
          lastName: '',
          grade: '',
          assignedGrades: [],
          subjects: [],
          assignedStudents: []
        });
        loadDashboardStats();
        fetchUsers();
      } else {
        setMessage(`❌ ${data.error || 'Failed to create user'}`);
      }
    } catch (error) {
      setMessage('❌ Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // User management handlers
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setModalType('view');
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      password: '', // Don't populate password for security
      role: user.role,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      grade: user.profile.grade || '',
      assignedGrades: user.profile.assignedGrades || [],
      subjects: user.profile.subjects || [],
      assignedStudents: user.profile.assignedStudents || []
    });
    setModalType('edit');
    setShowModal(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setModalType('delete');
    setShowModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditMultiSelectChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const userData = { ...editForm };
      
      // Clean up data based on role
      if (userData.role === 'student') {
        delete userData.assignedGrades;
        delete userData.subjects;
        delete userData.assignedStudents;
      } else if (userData.role === 'teacher') {
        delete userData.grade;
      } else if (userData.role === 'admin') {
        delete userData.grade;
        delete userData.assignedGrades;
        delete userData.subjects;
        delete userData.assignedStudents;
      }

      // Remove password if empty
      if (!userData.password) {
        delete userData.password;
      }

      const response = await fetch(`${API_URL}/auth/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ User updated successfully!`);
        setShowModal(false);
        loadDashboardStats();
        fetchUsers();
      } else {
        setMessage(`❌ ${data.error || 'Failed to update user'}`);
      }
    } catch (error) {
      setMessage('❌ Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/users/${selectedUser._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ User deleted successfully!`);
        setShowModal(false);
        loadDashboardStats();
        fetchUsers();
      } else {
        setMessage(`❌ ${data.error || 'Failed to delete user'}`);
      }
    } catch (error) {
      setMessage('❌ Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setModalType('');
    setMessage('');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return renderUserManagement();
      case 'grades':
        return renderGradeManagement();
      case 'subjects':
        return renderSubjectManagement();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3>{stats.totalTeachers}</h3>
            <p>Teachers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-content">
            <h3>{stats.totalStudents}</h3>
            <p>Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">�</div>
          <div className="stat-content">
            <h3>{stats.totalAdmins}</h3>
            <p>Admins</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderUserManagement = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="user-management"
    >
      {/* Create User Form */}
      <form onSubmit={handleCreateUser} className="create-user-form">
        <h3>Create New User</h3>
        
        {/* First Row - User Type Selection */}
        <div className="user-type-selection">
          <h4>Select User Type</h4>
          <div className="user-type-buttons">
            <button
              type="button"
              className={`user-type-btn ${userForm.role === 'teacher' ? 'selected' : ''}`}
              onClick={() => setUserForm(prev => ({ 
                ...prev, 
                role: 'teacher',
                firstName: '',
                lastName: '',
                grade: '',
                assignedGrades: [],
                subjects: []
              }))}
            >
              <div className="type-icon">�‍🏫</div>
              <div className="type-label">Teacher</div>
            </button>
            <button
              type="button"
              className={`user-type-btn ${userForm.role === 'student' ? 'selected' : ''}`}
              onClick={() => setUserForm(prev => ({ 
                ...prev, 
                role: 'student',
                firstName: '',
                lastName: '',
                grade: '',
                assignedGrades: [],
                subjects: []
              }))}
            >
              <div className="type-icon">👨‍�</div>
              <div className="type-label">Student</div>
            </button>
            <button
              type="button"
              className={`user-type-btn ${userForm.role === 'admin' ? 'selected' : ''}`}
              onClick={() => setUserForm(prev => ({ 
                ...prev, 
                role: 'admin',
                firstName: '',
                lastName: '',
                grade: '',
                assignedGrades: [],
                subjects: []
              }))}
            >
              <div className="type-icon">�</div>
              <div className="type-label">Admin</div>
            </button>
          </div>
        </div>

        {/* Second Row - Role-specific form */}
        <div className="user-details-form">
          <h4>User Details</h4>
          
          {/* Common fields - First Name and Last Name first */}
          <div className="form-row">
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={userForm.firstName}
              onChange={handleInputChange}
              required
              className="form-input"
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={userForm.lastName}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          {/* Username and Password Preview */}
          {userForm.firstName && (
            <div className="username-preview">
              <span className="preview-label">Generated Username: </span>
              <span className="preview-username">
                {(userForm.firstName.toLowerCase().replace(/[^a-z]/g, '') + 'xxxx').substring(0, 4)}####
              </span>
              <span className="preview-note"> (#### will be replaced with random 4 digits)</span>
              <br />
              <span className="preview-label">Password: </span>
              <span className="preview-password">password1234</span>
            </div>
          )}

          {/* Role-specific fields */}
          {userForm.role === 'admin' && (
            <div className="role-specific-section">
              <p className="role-description">
                Admins have full access to manage users, view reports, and configure the system.
              </p>
            </div>
          )}

          {userForm.role === 'student' && (
            <div className="role-specific-section">
              <div className="form-row">
                <select
                  name="grade"
                  value={userForm.grade}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Grade</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {userForm.role === 'teacher' && (
            <div className="role-specific-section">
              <div className="multi-select-section">
                <h5>Assigned Grades</h5>
                <div className="checkbox-grid">
                  {grades.map(grade => (
                    <label key={grade} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={userForm.assignedGrades.includes(grade)}
                        onChange={() => handleMultiSelectChange('assignedGrades', grade)}
                      />
                      Grade {grade}
                    </label>
                  ))}
                </div>
              </div>

              <div className="multi-select-section">
                <h5>Subjects</h5>
                <div className="checkbox-grid">
                  {subjects.map(subject => (
                    <label key={subject} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={userForm.subjects.includes(subject)}
                        onChange={() => handleMultiSelectChange('subjects', subject)}
                      />
                      {subject}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={loading || !userForm.firstName || !userForm.lastName}
          className="create-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? '⏳ Creating...' : `Create ${userForm.role}`}
        </motion.button>
      </form>

      {/* User List */}
      <div className="user-list-section">
        <div className="list-header">
          <h3>Existing Users ({users.filter(user => {
            if (filterRole !== 'all' && user.role !== filterRole) return false;
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              const fullName = `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase();
              const username = user.username.toLowerCase();
              if (!fullName.includes(searchLower) && !username.includes(searchLower)) return false;
            }
            return true;
          }).length})</h3>
          <div className="list-filters">
            <select 
              className="filter-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="admin">Admins</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
            </select>
            <input 
              type="text" 
              placeholder="Search users..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {users.length === 0 ? (
          <div className="no-users">
            <p>No users found. Create your first user above.</p>
          </div>
        ) : (
          <div className="user-table">
            <div className="table-header">
              <div className="header-cell name">Name</div>
              <div className="header-cell username">Username</div>
              <div className="header-cell role">Role</div>
              <div className="header-cell details">Details</div>
              <div className="header-cell joined">Joined</div>
              <div className="header-cell actions">Actions</div>
            </div>
            
            <div className="table-body">
              {users
                .filter(tableUser => {
                  // Role filter
                  if (filterRole !== 'all' && tableUser.role !== filterRole) {
                    return false;
                  }
                  
                  // Search filter
                  if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const fullName = `${tableUser.profile.firstName} ${tableUser.profile.lastName}`.toLowerCase();
                    const username = tableUser.username.toLowerCase();
                    
                    if (!fullName.includes(searchLower) && !username.includes(searchLower)) {
                      return false;
                    }
                  }
                  
                  return true;
                })
                .map(tableUser => (
                <div key={tableUser._id} className="table-row">
                  <div className="table-cell name">
                    <div className="user-name">
                      <div className="name-text">
                        {tableUser.profile.firstName} {tableUser.profile.lastName}
                      </div>
                    </div>
                  </div>
                  
                  <div className="table-cell username">
                    <span className="username-text">@{tableUser.username}</span>
                  </div>
                  
                  <div className="table-cell role">
                    <span className={`role-badge ${tableUser.role}`}>
                      {tableUser.role}
                    </span>
                  </div>
                  
                  <div className="table-cell details">
                    {tableUser.role === 'student' && (
                      <span className="detail-text">Grade {tableUser.profile.grade}</span>
                    )}
                    {tableUser.role === 'teacher' && (
                      <span className="detail-text">
                        Grades: {tableUser.profile.assignedGrades?.join(', ') || 'None'}
                      </span>
                    )}
                    {tableUser.role === 'admin' && (
                      <span className="detail-text">Administrator</span>
                    )}
                  </div>
                  
                  <div className="table-cell joined">
                    <span className="date-text">
                      {new Date(tableUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="table-cell actions">
                    <div className="action-buttons">
                      {user && user._id !== tableUser._id ? (
                        <>
                          <button 
                            className="action-btn edit-btn" 
                            title="Edit User"
                            onClick={() => handleEditUser(tableUser)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn delete-btn" 
                            title="Delete User"
                            onClick={() => handleDeleteUser(tableUser)}
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="action-btn edit-btn disabled" 
                            title="Cannot edit your own account"
                            disabled
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn delete-btn disabled" 
                            title="Cannot delete your own account"
                            disabled
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      <button 
                        className="action-btn view-btn" 
                        title="View Details"
                        onClick={() => handleViewUser(tableUser)}
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* No results message */}
              {users.filter(user => {
                if (filterRole !== 'all' && user.role !== filterRole) return false;
                if (searchTerm) {
                  const searchLower = searchTerm.toLowerCase();
                  const fullName = `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase();
                  const username = user.username.toLowerCase();
                  if (!fullName.includes(searchLower) && !username.includes(searchLower)) return false;
                }
                return true;
              }).length === 0 && users.length > 0 && (
                <div className="no-results">
                  <p>No users match your search criteria.</p>
                  <button 
                    className="clear-filters-btn"
                    onClick={() => {
                      setFilterRole('all');
                      setSearchTerm('');
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderGradeManagement = () => {
    // Calculate statistics for each grade
    const gradeStats = grades.map(grade => {
      const studentsInGrade = users.filter(user => 
        user.role === 'student' && user.profile.grade === grade
      );
      const teachersForGrade = users.filter(user => 
        user.role === 'teacher' && user.profile.assignedGrades?.includes(grade)
      );
      
      return {
        grade,
        studentCount: studentsInGrade.length,
        teacherCount: teachersForGrade.length,
        students: studentsInGrade,
        teachers: teachersForGrade
      };
    });

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grade-management"
      >
        <div className="management-header">
          <h3>📚 Grade Overview</h3>
          <p>Student and teacher distribution across grade levels</p>
        </div>
        
        {/* Summary Cards */}
        <div className="grade-summary-top">
          <div className="summary-card">
            <div className="summary-icon">👥</div>
            <div className="summary-content">
              <span className="summary-number">{users.filter(u => u.role === 'student').length}</span>
              <span className="summary-label">Total Students</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">👩‍🏫</div>
            <div className="summary-content">
              <span className="summary-number">{users.filter(u => u.role === 'teacher').length}</span>
              <span className="summary-label">Total Teachers</span>
            </div>
          </div>
          <div className="summary-card warning">
            <div className="summary-icon">⚠️</div>
            <div className="summary-content">
              <span className="summary-number">{gradeStats.filter(g => g.teacherCount === 0).length}</span>
              <span className="summary-label">Grades Need Teachers</span>
            </div>
          </div>
        </div>
        
        {/* Grade Cards Grid */}
        <div className="grade-cards-grid">
          {gradeStats.map(({ grade, studentCount, teacherCount, students, teachers }) => (
            <div key={grade} className={`grade-card-clean ${teacherCount === 0 ? 'needs-attention' : ''}`}>
              
              {/* Grade Header */}
              <div className="grade-header-clean">
                <div className="grade-title">
                  <span className="grade-label">Grade</span>
                  <span className="grade-number">{grade}</span>
                </div>
                <div className="grade-status">
                  {teacherCount > 0 ? (
                    <span className="status-good">✅ Staffed</span>
                  ) : (
                    <span className="status-warning">⚠️ No Teacher</span>
                  )}
                </div>
              </div>

              {/* Statistics Row */}
              <div className="grade-stats-row">
                <div className="stat-box">
                  <span className="stat-number-clean">{studentCount}</span>
                  <span className="stat-label-clean">Students</span>
                </div>
                <div className="stat-divider">|</div>
                <div className="stat-box">
                  <span className="stat-number-clean">{teacherCount}</span>
                  <span className="stat-label-clean">Teachers</span>
                </div>
              </div>

              {/* Teachers List */}
              {teacherCount > 0 && (
                <div className="teachers-section">
                  <h5 className="section-title">Teachers:</h5>
                  <div className="teachers-list-clean">
                    {teachers.map(teacher => (
                      <div key={teacher._id} className="teacher-tag">
                        {teacher.profile.firstName} {teacher.profile.lastName}
                        <div className="teacher-subjects">
                          {teacher.profile.subjects?.slice(0, 2).join(', ')}
                          {teacher.profile.subjects?.length > 2 && ' +more'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Students Preview */}
              {studentCount > 0 && (
                <div className="students-section">
                  <h5 className="section-title">
                    Students ({studentCount})
                    {studentCount > 4 && <span className="show-more"> - showing first 4</span>}
                  </h5>
                  <div className="students-list-clean">
                    {students.slice(0, 4).map(student => (
                      <span key={student._id} className="student-tag">
                        {student.profile.firstName} {student.profile.lastName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grade-actions-clean">
                {studentCount > 0 && (
                  <button 
                    className="action-btn-clean primary"
                    onClick={() => {
                      setFilterRole('student');
                      setActiveTab('users');
                    }}
                  >
                    View All Students
                  </button>
                )}
                {teacherCount === 0 ? (
                  <button 
                    className="action-btn-clean urgent"
                    onClick={() => {
                      setActiveTab('users');
                    }}
                  >
                    Assign Teacher
                  </button>
                ) : (
                  <button 
                    className="action-btn-clean secondary"
                    onClick={() => {
                      setFilterRole('teacher');
                      setActiveTab('users');
                    }}
                  >
                    View Teachers
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Alert if needed */}
        {gradeStats.filter(g => g.teacherCount === 0).length > 0 && (
          <div className="grades-alert">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
              <div className="alert-text">
                <strong>Action Required:</strong> 
                {gradeStats.filter(g => g.teacherCount === 0).length === 1 ? 
                  ` Grade ${gradeStats.find(g => g.teacherCount === 0)?.grade} needs a teacher` :
                  ` ${gradeStats.filter(g => g.teacherCount === 0).length} grades need teachers`
                }
              </div>
              <button 
                className="alert-action-btn"
                onClick={() => setActiveTab('users')}
              >
                Create Teachers
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderSubjectManagement = () => {
    // Calculate statistics for each subject
    const subjectStats = subjects.map(subject => {
      const teachersForSubject = users.filter(user => 
        user.role === 'teacher' && user.profile.subjects?.includes(subject)
      );
      
      // Get all grades taught by teachers of this subject
      const gradesForSubject = [...new Set(
        teachersForSubject.flatMap(teacher => teacher.profile.assignedGrades || [])
      )].sort();
      
      return {
        subject,
        teacherCount: teachersForSubject.length,
        teachers: teachersForSubject,
        grades: gradesForSubject
      };
    });

    // Get subject icons
    const getSubjectIcon = (subject) => {
      const icons = {
        'Math': '🔢',
        'Science': '🔬',
        'English': '📚',
        'History': '🏛️',
        'Art': '🎨',
        'Music': '🎵',
        'PE': '⚽'
      };
      return icons[subject] || '📖';
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="subject-management"
      >
        <div className="management-header">
          <h3>📖 Subject Overview</h3>
          <p>Teacher coverage and grade distribution by subject</p>
        </div>
        
        {/* Summary Cards */}
        <div className="subject-summary-top">
          <div className="summary-card">
            <div className="summary-icon">📚</div>
            <div className="summary-content">
              <span className="summary-number">{subjects.length}</span>
              <span className="summary-label">Total Subjects</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">✅</div>
            <div className="summary-content">
              <span className="summary-number">{subjectStats.filter(s => s.teacherCount > 0).length}</span>
              <span className="summary-label">Subjects Covered</span>
            </div>
          </div>
          <div className="summary-card warning">
            <div className="summary-icon">⚠️</div>
            <div className="summary-content">
              <span className="summary-number">{subjectStats.filter(s => s.teacherCount === 0).length}</span>
              <span className="summary-label">Need Teachers</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <span className="summary-number">
                {subjects.length > 0 ? Math.round((subjectStats.filter(s => s.teacherCount > 0).length / subjects.length) * 100) : 0}%
              </span>
              <span className="summary-label">Coverage Rate</span>
            </div>
          </div>
        </div>
        
        {/* Subject Cards Grid */}
        <div className="subject-cards-grid">
          {subjectStats.map(({ subject, teacherCount, teachers, grades }) => (
            <div key={subject} className={`subject-card-clean ${teacherCount === 0 ? 'needs-attention' : ''}`}>
              
              {/* Subject Header */}
              <div className="subject-header-clean">
                <div className="subject-title">
                  <span className="subject-icon">{getSubjectIcon(subject)}</span>
                  <div className="subject-name-area">
                    <span className="subject-label">Subject</span>
                    <span className="subject-name">{subject}</span>
                  </div>
                </div>
                <div className="subject-status">
                  {teacherCount > 0 ? (
                    <span className="status-good">✅ Covered</span>
                  ) : (
                    <span className="status-warning">⚠️ No Teacher</span>
                  )}
                </div>
              </div>

              {/* Statistics Row */}
              <div className="subject-stats-row">
                <div className="stat-box">
                  <span className="stat-number-clean">{teacherCount}</span>
                  <span className="stat-label-clean">Teachers</span>
                </div>
                <div className="stat-divider">|</div>
                <div className="stat-box">
                  <span className="stat-number-clean">{grades.length}</span>
                  <span className="stat-label-clean">Grades</span>
                </div>
              </div>

              {/* Teachers Section */}
              {teacherCount > 0 && (
                <div className="teachers-section">
                  <h5 className="section-title">Teachers ({teacherCount}):</h5>
                  <div className="teachers-list-clean">
                    {teachers.map(teacher => (
                      <div key={teacher._id} className="teacher-tag">
                        {teacher.profile.firstName} {teacher.profile.lastName}
                        <div className="teacher-grades">
                          Grades: {teacher.profile.assignedGrades?.join(', ') || 'None assigned'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade Coverage Section */}
              <div className="coverage-section">
                <h5 className="section-title">Grade Coverage:</h5>
                {grades.length > 0 ? (
                  <div className="coverage-display">
                    <div className="covered-grades-tags">
                      {grades.map(grade => (
                        <span key={grade} className="grade-covered-tag">Grade {grade}</span>
                      ))}
                    </div>
                    {grades.length < 9 && (
                      <div className="missing-info">
                        <span className="missing-note">
                          Missing {9 - grades.length} grade{grades.length !== 8 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-coverage-display">
                    <span className="no-coverage-text">No grade coverage yet</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="subject-actions-clean">
                {teacherCount > 0 ? (
                  <>
                    <button 
                      className="action-btn-clean primary"
                      onClick={() => {
                        setFilterRole('teacher');
                        setActiveTab('users');
                      }}
                    >
                      View Teachers
                    </button>
                    <button 
                      className="action-btn-clean secondary"
                      onClick={() => setActiveTab('grades')}
                    >
                      View Grades
                    </button>
                  </>
                ) : (
                  <button 
                    className="action-btn-clean urgent"
                    onClick={() => setActiveTab('users')}
                  >
                    Assign Teacher
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Alert if needed */}
        {subjectStats.filter(s => s.teacherCount === 0).length > 0 && (
          <div className="subjects-alert">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
              <div className="alert-text">
                <strong>Action Required:</strong> 
                {subjectStats.filter(s => s.teacherCount === 0).length === 1 ? 
                  ` ${subjectStats.find(s => s.teacherCount === 0)?.subject} needs a teacher` :
                  ` ${subjectStats.filter(s => s.teacherCount === 0).length} subjects need teachers`
                }
              </div>
              <button 
                className="alert-action-btn"
                onClick={() => setActiveTab('users')}
              >
                Create Teachers
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <motion.div
      className="admin-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="dashboard-header"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <h1>🛠️ Admin Dashboard</h1>
          <p>Welcome back, {user.profile.firstName}!</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div 
        className="tab-navigation"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'users', label: '👥 Users', icon: '👥' },
          { id: 'grades', label: '📚 Grades', icon: '📚' },
          { id: 'subjects', label: '📖 Subjects', icon: '📖' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon} {tab.label.split(' ')[1]}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <motion.div 
        className="tab-content"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {renderTabContent()}
      </motion.div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <motion.div 
            className="modal-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            {modalType === 'view' && selectedUser && (
              <div className="modal-view">
                <div className="modal-header">
                  <h3>👁️ User Details</h3>
                  <button className="close-btn" onClick={closeModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="user-details">
                    <div className="detail-row">
                      <span className="label">Name:</span>
                      <span className="value">{selectedUser.profile.firstName} {selectedUser.profile.lastName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Username:</span>
                      <span className="value">@{selectedUser.username}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Password:</span>
                      <span className="value password-display">password1234</span>
                      <span className="password-note">(Default password for all users)</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Role:</span>
                      <span className={`role-badge ${selectedUser.role}`}>{selectedUser.role}</span>
                    </div>
                    {selectedUser.role === 'student' && selectedUser.profile.grade && (
                      <div className="detail-row">
                        <span className="label">Grade:</span>
                        <span className="value">{selectedUser.profile.grade}</span>
                      </div>
                    )}
                    {selectedUser.role === 'teacher' && (
                      <>
                        {selectedUser.profile.assignedGrades && selectedUser.profile.assignedGrades.length > 0 && (
                          <div className="detail-row">
                            <span className="label">Assigned Grades:</span>
                            <span className="value">{selectedUser.profile.assignedGrades.join(', ')}</span>
                          </div>
                        )}
                        {selectedUser.profile.subjects && selectedUser.profile.subjects.length > 0 && (
                          <div className="detail-row">
                            <span className="label">Subjects:</span>
                            <span className="value">{selectedUser.profile.subjects.join(', ')}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="detail-row">
                      <span className="label">Joined:</span>
                      <span className="value">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalType === 'edit' && selectedUser && (
              <div className="modal-edit">
                <div className="modal-header">
                  <h3>✏️ Edit User</h3>
                  <button className="close-btn" onClick={closeModal}>✕</button>
                </div>
                <form onSubmit={handleUpdateUser} className="modal-body">
                  <div className="form-row">
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleEditInputChange}
                      className="form-select"
                      disabled
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', cursor: 'not-allowed' }}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                    <small style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                      Role cannot be changed after creation
                    </small>
                  </div>

                  <div className="form-row">
                    <input
                      type="text"
                      name="username"
                      placeholder="Username"
                      value={editForm.username}
                      onChange={handleEditInputChange}
                      required
                      className="form-input"
                    />
                    <input
                      type="password"
                      name="password"
                      placeholder="New Password (leave empty to keep current)"
                      value={editForm.password}
                      onChange={handleEditInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-row">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={editForm.firstName}
                      onChange={handleEditInputChange}
                      required
                      className="form-input"
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={editForm.lastName}
                      onChange={handleEditInputChange}
                      required
                      className="form-input"
                    />
                  </div>

                  {editForm.role === 'student' && (
                    <div className="form-row">
                      <select
                        name="grade"
                        value={editForm.grade}
                        onChange={handleEditInputChange}
                        required
                        className="form-select"
                      >
                        <option value="">Select Grade</option>
                        {grades.map(grade => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editForm.role === 'teacher' && (
                    <>
                      <div className="multi-select-section">
                        <h4>Assigned Grades</h4>
                        <div className="checkbox-grid">
                          {grades.map(grade => (
                            <label key={grade} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={editForm.assignedGrades.includes(grade)}
                                onChange={() => handleEditMultiSelectChange('assignedGrades', grade)}
                              />
                              Grade {grade}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="multi-select-section">
                        <h4>Subjects</h4>
                        <div className="checkbox-grid">
                          {subjects.map(subject => (
                            <label key={subject} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={editForm.subjects.includes(subject)}
                                onChange={() => handleEditMultiSelectChange('subjects', subject)}
                              />
                              {subject}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="multi-select-section">
                        <h4>📚 Assigned Students</h4>
                        <p className="section-description">Students will be filtered by the grades you teach</p>
                        
                        {editForm.assignedGrades.length > 0 ? (
                          <div className="student-assignment-container">
                            {editForm.assignedGrades.map(grade => {
                              const studentsInGrade = users.filter(user => 
                                user.role === 'student' && user.profile.grade === grade
                              );
                              const assignedInGrade = studentsInGrade.filter(student => 
                                editForm.assignedStudents.includes(student._id)
                              );

                              return (
                                <div key={grade} className="grade-student-section">
                                  <div className="grade-header">
                                    <h5>Grade {grade} Students ({assignedInGrade.length}/{studentsInGrade.length})</h5>
                                    {studentsInGrade.length > 0 && (
                                      <div className="grade-actions">
                                        <button
                                          type="button"
                                          className="select-all-btn"
                                          onClick={() => {
                                            const gradeStudentIds = studentsInGrade.map(s => s._id);
                                            const newAssignedStudents = [
                                              ...editForm.assignedStudents.filter(id => 
                                                !gradeStudentIds.includes(id)
                                              ),
                                              ...gradeStudentIds
                                            ];
                                            setEditForm(prev => ({ 
                                              ...prev, 
                                              assignedStudents: newAssignedStudents 
                                            }));
                                          }}
                                        >
                                          Select All
                                        </button>
                                        <button
                                          type="button"
                                          className="deselect-all-btn"
                                          onClick={() => {
                                            const gradeStudentIds = studentsInGrade.map(s => s._id);
                                            const newAssignedStudents = editForm.assignedStudents.filter(id => 
                                              !gradeStudentIds.includes(id)
                                            );
                                            setEditForm(prev => ({ 
                                              ...prev, 
                                              assignedStudents: newAssignedStudents 
                                            }));
                                          }}
                                        >
                                          Deselect All
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="students-list">
                                    {studentsInGrade.length > 0 ? (
                                      studentsInGrade.map(student => (
                                        <label key={student._id} className="student-checkbox-label">
                                          <input
                                            type="checkbox"
                                            checked={editForm.assignedStudents.includes(student._id)}
                                            onChange={() => handleEditMultiSelectChange('assignedStudents', student._id)}
                                          />
                                          <div className="student-info">
                                            <span className="student-name">
                                              {student.profile.firstName} {student.profile.lastName}
                                            </span>
                                            <span className="student-username">@{student.username}</span>
                                          </div>
                                        </label>
                                      ))
                                    ) : (
                                      <p className="no-students">No students found in Grade {grade}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="no-grades-selected">Please select grades first to see available students</p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="save-btn" disabled={loading}>
                      {loading ? '⏳ Updating...' : 'Update User'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {modalType === 'delete' && selectedUser && (
              <div className="modal-delete">
                <div className="modal-header">
                  <h3>🗑️ Delete User</h3>
                  <button className="close-btn" onClick={closeModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="delete-warning">
                    <p>Are you sure you want to delete this user?</p>
                    <div className="user-preview">
                      <strong>{selectedUser.profile.firstName} {selectedUser.profile.lastName}</strong>
                      <span>@{selectedUser.username}</span>
                      <span className={`role-badge ${selectedUser.role}`}>{selectedUser.role}</span>
                    </div>
                    <p className="warning-text">This action cannot be undone!</p>
                  </div>
                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={closeModal}>
                      Cancel
                    </button>
                    <button className="delete-confirm-btn" onClick={handleConfirmDelete} disabled={loading}>
                      {loading ? '⏳ Deleting...' : 'Delete User'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className="modal-message">
                {message}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './AdminHomePage.css';

interface UserData {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
}

export const AdminHomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentStatus, setDepartmentStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDepartmentSubmitting, setIsDepartmentSubmitting] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessSearchTerm, setAccessSearchTerm] = useState('');
  const [isAccessSearching, setIsAccessSearching] = useState(false);
  const [employeeResults, setEmployeeResults] = useState<Array<{ id: string; name: string; title: string; email: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [accessStatus, setAccessStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/signin');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      // Check if user is Admin
      if (currentUser.role !== 'Admin') {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }
      setUser(currentUser);
    }
    setLoading(false);
  }, [navigate]);

  const handleCreateBlockchain = () => {
    navigate('/create-blockchain');
  };

  const handleJoinBlockchain = () => {
    navigate('/join-blockchain');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      navigate('/');
    }
  };

  const handleDepartmentMenu = () => {
    setDepartmentStatus(null);
    setDepartmentName('');
    setIsDepartmentModalOpen(true);
  };

  const handleAccessMenu = () => {
    setAccessStatus(null);
    setAccessSearchTerm('');
    setEmployeeResults([]);
    setSelectedEmployeeId('');
    setSelectedDepartmentId('');
    setIsAccessModalOpen(true);
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentName.trim()) {
      setDepartmentStatus({ type: 'error', message: 'Department name is required.' });
      return;
    }

    setIsDepartmentSubmitting(true);
    setDepartmentStatus(null);

    try {
      // TODO: Replace with real API call to create department
      await new Promise((resolve) => setTimeout(resolve, 800));
      console.log('Creating department:', departmentName.trim());

      setDepartmentStatus({
        type: 'success',
        message: `Department "${departmentName.trim()}" created successfully.`,
      });
      setDepartmentName('');
    } catch (submitError) {
      console.error('Department creation failed:', submitError);
      setDepartmentStatus({
        type: 'error',
        message: 'Failed to create department. Please try again.',
      });
    } finally {
      setIsDepartmentSubmitting(false);
    }
  };

  const closeDepartmentModal = () => {
    setIsDepartmentModalOpen(false);
    setDepartmentStatus(null);
    setDepartmentName('');
  };

  const handleAccessSearch = async () => {
    if (!accessSearchTerm.trim()) {
      setAccessStatus({ type: 'error', message: 'Please enter a name or email to search.' });
      return;
    }

    setIsAccessSearching(true);
    setAccessStatus(null);
    setEmployeeResults([]);
    setSelectedEmployeeId('');
    setSelectedDepartmentId('');

    try {
      // TODO: Replace with real API call to search organization employees
      await new Promise((resolve) => setTimeout(resolve, 900));
      const normalizedQuery = accessSearchTerm.trim();

      const mockEmployees = [
        {
          id: `${normalizedQuery}-emp-1`,
          name: 'Ava Martinez',
          title: 'Security Analyst',
          email: 'ava.martinez@example.com',
        },
        {
          id: `${normalizedQuery}-emp-2`,
          name: 'Noah Patel',
          title: 'DevOps Engineer',
          email: 'noah.patel@example.com',
        },
      ];

      const mockDepartments = [
        { id: 'dept-1', name: 'Security Operations' },
        { id: 'dept-2', name: 'Core Infrastructure' },
        { id: 'dept-3', name: 'Compliance' },
      ];

      setEmployeeResults(mockEmployees);
      setDepartmentOptions(mockDepartments);
      setAccessStatus({
        type: 'success',
        message: `${mockEmployees.length} employee${mockEmployees.length > 1 ? 's' : ''} found within the organization.`,
      });
    } catch (searchError) {
      console.error('Employee search failed:', searchError);
      setAccessStatus({
        type: 'error',
        message: 'Unable to search employees. Please try again.',
      });
    } finally {
      setIsAccessSearching(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !selectedDepartmentId) {
      setAccessStatus({ type: 'error', message: 'Please select both an employee and a department.' });
      return;
    }

    setIsGrantingAccess(true);
    setAccessStatus(null);

    try {
      // TODO: Replace with real API call to grant temporary access
      await new Promise((resolve) => setTimeout(resolve, 900));

      const employee = employeeResults.find((emp) => emp.id === selectedEmployeeId);
      const department = departmentOptions.find((dept) => dept.id === selectedDepartmentId);

      setAccessStatus({
        type: 'success',
        message: `${employee?.name} has temporary access to ${department?.name}.`,
      });
    } catch (grantError) {
      console.error('Grant access failed:', grantError);
      setAccessStatus({
        type: 'error',
        message: 'Unable to grant access. Please try again.',
      });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const closeAccessModal = () => {
    setIsAccessModalOpen(false);
    setAccessStatus(null);
    setAccessSearchTerm('');
    setEmployeeResults([]);
    setSelectedEmployeeId('');
    setSelectedDepartmentId('');
  };

  if (loading) {
    return (
      <div className="admin-homepage-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-homepage-container">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={handleLogout} className="retry-button">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-homepage-container">
      {/* Header */}
      <header className="admin-homepage-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p className="organization-name">{user?.organizationName}</p>
          <p className="user-name">Welcome, {user?.firstName} {user?.lastName}</p>
        </div>
        <div className="header-actions">
          <button onClick={handleAccessMenu} className="menu-button access-button">
            <span className="menu-icon" aria-hidden="true">🗝️</span>
            <span>Access</span>
          </button>
          <button onClick={handleDepartmentMenu} className="menu-button">
            <span className="menu-icon" aria-hidden="true">🏢</span>
            <span>Departments</span>
          </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-homepage-main">
        <div className="blockchain-section">
          <div className="welcome-message">
            <h2>Blockchain Management</h2>
            <p className="section-description">
              Create a new blockchain network or join an existing one to start collaborating and sharing files securely.
            </p>
          </div>
          
          <div className="blockchain-actions">
            <button 
              onClick={handleCreateBlockchain}
              className="blockchain-button create-button"
            >
              <div className="button-icon">🔗</div>
              <div className="button-content">
                <h3>Create Blockchain</h3>
                <p>Create a new blockchain network for your organization</p>
              </div>
              <div className="button-arrow">→</div>
            </button>

            <button 
              onClick={handleJoinBlockchain}
              className="blockchain-button join-button"
            >
              <div className="button-icon">➕</div>
              <div className="button-content">
                <h3>Join Blockchain</h3>
                <p>Join an existing blockchain network using an invitation code</p>
              </div>
              <div className="button-arrow">→</div>
            </button>
          </div>
        </div>
      </main>

      {isDepartmentModalOpen && (
        <div className="department-modal-overlay" role="dialog" aria-modal="true">
          <div className="department-modal">
            <div className="department-modal-header">
              <div className="department-modal-icon">🏢</div>
              <div>
                <h3>Create Department</h3>
                <p>Add a new department to your organization</p>
              </div>
              <button className="modal-close-button" onClick={closeDepartmentModal} aria-label="Close department modal">
                ×
              </button>
            </div>
            <form className="department-form" onSubmit={handleDepartmentSubmit}>
              <label htmlFor="departmentName">Department Name *</label>
              <input
                id="departmentName"
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="Enter department name"
                disabled={isDepartmentSubmitting}
                className="department-input"
                autoFocus
              />
              {departmentStatus && (
                <div className={`department-status ${departmentStatus.type}`}>
                  {departmentStatus.message}
                </div>
              )}
              <div className="department-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeDepartmentModal}
                  disabled={isDepartmentSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isDepartmentSubmitting}
                >
                  {isDepartmentSubmitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAccessModalOpen && (
        <div className="access-modal-overlay" role="dialog" aria-modal="true">
          <div className="access-modal">
            <div className="access-modal-header">
              <div className="access-modal-icon">🗝️</div>
              <div>
                <h3>Temporary Department Access</h3>
                <p>Search an employee and grant limited-time access</p>
              </div>
              <button
                className="modal-close-button"
                onClick={closeAccessModal}
                aria-label="Close access modal"
              >
                ×
              </button>
            </div>

            <div className="access-search">
              <label htmlFor="accessSearch">Employee Name or Email</label>
              <div className="search-input-container">
                <input
                  id="accessSearch"
                  type="text"
                  value={accessSearchTerm}
                  onChange={(e) => setAccessSearchTerm(e.target.value)}
                  placeholder="Search employees within your organization"
                  disabled={isAccessSearching || isGrantingAccess}
                  className="department-input-field"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isAccessSearching && accessSearchTerm.trim()) {
                      e.preventDefault();
                      handleAccessSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  className="search-icon-button"
                  onClick={handleAccessSearch}
                  disabled={isAccessSearching || !accessSearchTerm.trim()}
                  aria-label="Search for employee"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            </div>

            {accessStatus && (
              <div className={`department-status ${accessStatus.type}`}>
                {accessStatus.message}
              </div>
            )}

            <div className="access-content">
              <div className="access-column">
                <h4>Employees</h4>
                {isAccessSearching && <p className="muted-text">Searching employees...</p>}
                {!isAccessSearching && employeeResults.length === 0 && (
                  <p className="muted-text">
                    Search for employees to view available results.
                  </p>
                )}
                <div className="employee-results">
                  {employeeResults.map((employee) => (
                    <label
                      key={employee.id}
                      className={`employee-card ${
                        selectedEmployeeId === employee.id ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="employee"
                        value={employee.id}
                        checked={selectedEmployeeId === employee.id}
                        onChange={() => setSelectedEmployeeId(employee.id)}
                        disabled={isGrantingAccess}
                      />
                      <div>
                        <p className="employee-name">{employee.name}</p>
                        <p className="employee-meta">{employee.title}</p>
                        <p className="employee-email">{employee.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="access-column">
                <h4>Departments</h4>
                {employeeResults.length === 0 ? (
                  <p className="muted-text">Search for an employee to view departments.</p>
                ) : (
                  <form className="grant-access-form" onSubmit={handleGrantAccess}>
                    <div className="select-wrapper">
                      <select
                        id="departmentSelect"
                        className="channel-select"
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        disabled={isGrantingAccess || departmentOptions.length === 0}
                        required
                        aria-label="Department"
                      >
                        <option value="">Select department</option>
                        {departmentOptions.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label htmlFor="accessDuration">Access Duration (Hours)</label>
                    <input
                      id="accessDuration"
                      type="number"
                      min={1}
                      max={72}
                      defaultValue={24}
                      className="department-input"
                      disabled={isGrantingAccess}
                    />

                    <button
                      type="submit"
                      className="submit-button full-width"
                      disabled={isGrantingAccess}
                    >
                      {isGrantingAccess ? 'Granting...' : 'Grant Temporary Access'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


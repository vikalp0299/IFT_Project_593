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
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
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
    </div>
  );
};


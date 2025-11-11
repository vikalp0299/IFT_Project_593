import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './HomePage.css';

interface UserData {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
}

export const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/signin');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
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
      <div className="homepage-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="homepage-container">
      {/* Header */}
      <header className="homepage-header">
        <div className="header-content">
          <h1>Welcome, {user?.firstName} {user?.lastName}</h1>
          <p className="organization-name">{user?.organizationName}</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="homepage-main">
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

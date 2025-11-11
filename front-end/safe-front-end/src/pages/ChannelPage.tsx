import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { FileUpload } from '../components/FileUpload';
import { FileList } from '../components/FileList';
import './ChannelPage.css';

interface UserData {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
}

export const ChannelPage = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/signin');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      checkChannelAccess(decodeURIComponent(channelName || ''), currentUser);
    }
  }, [navigate, channelName]);

  const checkChannelAccess = async (channel: string, user: UserData) => {
    try {
      setLoading(true);
      
      // For now, we'll simulate access checking
      // In a real implementation, this would be an API call to check user's access to the channel
      const mockAccessCheck = await new Promise<boolean>((resolve) => {
        setTimeout(() => {
          // Simulate access check - in real implementation, this would be an API call
          const accessibleChannels = ['General', 'Project Alpha', 'Marketing', 'Finance'];
          resolve(accessibleChannels.includes(channel));
        }, 1000);
      });

      setHasAccess(mockAccessCheck);
    } catch (error) {
      console.error('Error checking channel access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const handleUploadSuccess = () => {
    // Trigger file list refresh
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="channel-page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Checking access to channel...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="channel-page-container">
        <div className="access-denied">
          <div className="access-denied-content">
            <h1>Access Denied</h1>
            <p>You don't have access to this channel.</p>
            <button onClick={handleBackToHome} className="back-button">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="channel-page-container">
      {/* Header */}
      <header className="channel-header">
        <div className="header-content">
          <button onClick={handleBackToHome} className="back-button">
            ← Back to Home
          </button>
          <div className="channel-info">
            <h1>{decodeURIComponent(channelName || '')}</h1>
            <p className="channel-description">File sharing and receiving space</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="user-info">
            {user?.firstName} {user?.lastName} ({user?.organizationName})
          </span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="channel-main">
        <div className="channel-content">
          <div className="welcome-section">
            <h2>Welcome to {decodeURIComponent(channelName || '')}</h2>
            <p className="welcome-text">
              This space is for file sharing and receiving. You can upload files, 
              share documents, and collaborate with other organizations in this channel.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📁</div>
              <h3>File Upload</h3>
              <p>Upload and share files securely with other organizations</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Sharing</h3>
              <p>All files are encrypted and shared securely</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Collaboration</h3>
              <p>Work together with partner organizations</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>File Management</h3>
              <p>Organize and manage your shared files</p>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="file-section">
            <FileUpload 
              onUploadSuccess={handleUploadSuccess}
              maxFileSizeMB={100}
            />
          </div>

          {/* File List Section */}
          <div className="file-section">
            <FileList 
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './ChannelAccessRequestPage.css';

interface UserData {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
}

export const ChannelAccessRequestPage = () => {
  const { channelName } = useParams<{ channelName: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [navigate]);

  const handleRequestAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call to request access
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In a real implementation, this would be an API call to request channel access
      console.log('Access request sent for channel:', decodeURIComponent(channelName || ''));
      
      setRequestSent(true);
    } catch (error) {
      console.error('Error requesting access:', error);
      setError('Failed to send access request. Please try again.');
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

  return (
    <div className="access-request-container">
      {/* Header */}
      <header className="access-request-header">
        <div className="header-content">
          <button onClick={handleBackToHome} className="back-button">
            ← Back to Home
          </button>
          <div className="page-info">
            <h1>Channel Access Request</h1>
            <p>Request access to {decodeURIComponent(channelName || '')}</p>
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
      <main className="access-request-main">
        <div className="access-request-content">
          {!requestSent ? (
            <>
              {/* Access Denied Message */}
              <div className="access-denied-section">
                <div className="access-denied-icon">⚠️</div>
                <h2>Access Required</h2>
                <p className="access-denied-text">
                  You don't have access to the <strong>{decodeURIComponent(channelName || '')}</strong> channel. 
                  This channel is restricted and requires approval from the channel administrators.
                </p>
              </div>

              {/* Channel Information */}
              <div className="channel-info-section">
                <h3>Channel Information</h3>
                <div className="info-card">
                  <div className="info-item">
                    <span className="info-label">Channel Name:</span>
                    <span className="info-value">{decodeURIComponent(channelName || '')}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Your Organization:</span>
                    <span className="info-value">{user?.organizationName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Requested By:</span>
                    <span className="info-value">{user?.firstName} {user?.lastName}</span>
                  </div>
                </div>
              </div>

              {/* Request Form */}
              <div className="request-form-section">
                <h3>Request Access</h3>
                <p className="request-description">
                  Click the button below to send an access request to the channel administrators. 
                  You will be notified once your request is approved or denied.
                </p>
                
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <button 
                  onClick={handleRequestAccess}
                  disabled={loading}
                  className={`request-button ${loading ? 'loading' : ''}`}
                >
                  {loading ? (
                    <>
                      <div className="button-spinner"></div>
                      Sending Request...
                    </>
                  ) : (
                    'Request Access'
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Success Message */
            <div className="success-section">
              <div className="success-icon">✅</div>
              <h2>Request Sent Successfully</h2>
              <p className="success-text">
                Your access request for the <strong>{decodeURIComponent(channelName || '')}</strong> channel 
                has been sent to the administrators. You will receive a notification once your request is reviewed.
              </p>
              
              <div className="success-actions">
                <button onClick={handleBackToHome} className="back-to-home-button">
                  Back to Home
                </button>
                <button 
                  onClick={() => setRequestSent(false)} 
                  className="send-another-button"
                >
                  Send Another Request
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

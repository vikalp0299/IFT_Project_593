import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './HomePage.css';

interface Channel {
  name: string;
  organizations: string[];
  hasAccess: boolean;
}

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
  const [channels, setChannels] = useState<Channel[]>([]);
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
      setUser(currentUser);
      loadChannels(currentUser.organizationName);
    }
  }, [navigate]);

  const loadChannels = async (organizationName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get organization channels
      const response = await authService.authenticatedRequest('/org/channels', {
        method: 'POST',
        body: JSON.stringify({ organizationName })
      });

      if (response.success && response.data) {
        // For now, we'll create mock data since the backend structure needs to be enhanced
        // In a real implementation, this would come from the backend
        const mockChannels: Channel[] = [
          {
            name: 'General',
            organizations: [organizationName, 'Partner Org A', 'Partner Org B'],
            hasAccess: true
          },
          {
            name: 'Project Alpha',
            organizations: [organizationName, 'Partner Org A'],
            hasAccess: true
          },
          {
            name: 'Project Beta',
            organizations: [organizationName, 'Partner Org C'],
            hasAccess: false
          },
          {
            name: 'Marketing',
            organizations: [organizationName, 'Partner Org B', 'Partner Org D'],
            hasAccess: true
          },
          {
            name: 'Finance',
            organizations: [organizationName],
            hasAccess: true
          }
        ];

        setChannels(mockChannels);
      } else {
        setError('Failed to load channels');
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.hasAccess) {
      navigate(`/channel/${encodeURIComponent(channel.name)}`);
    } else {
      navigate(`/channel-access-request/${encodeURIComponent(channel.name)}`);
    }
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
          <p>Loading channels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="homepage-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
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
        <div className="channels-section">
          <h2>Available Channels</h2>
          <p className="channels-description">
            Click on a channel to access it. Channels you don't have access to will require approval.
          </p>
          
          <div className="channels-grid">
            {channels.map((channel, index) => (
              <div
                key={index}
                className={`channel-card ${channel.hasAccess ? 'accessible' : 'restricted'}`}
                onClick={() => handleChannelClick(channel)}
              >
                <div className="channel-header">
                  <h3 className="channel-name">{channel.name}</h3>
                  <div className={`access-indicator ${channel.hasAccess ? 'has-access' : 'no-access'}`}>
                    {channel.hasAccess ? '✓ Access' : '⚠ Request Access'}
                  </div>
                </div>
                
                <div className="channel-organizations">
                  <p className="organizations-label">Organizations:</p>
                  <div className="organizations-list">
                    {channel.organizations.map((org, orgIndex) => (
                      <span
                        key={orgIndex}
                        className={`organization-tag ${
                          org === user?.organizationName ? 'current-org' : 'partner-org'
                        }`}
                      >
                        {org}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="channel-footer">
                  {channel.hasAccess ? (
                    <span className="access-text">Click to enter</span>
                  ) : (
                    <span className="request-text">Request access</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

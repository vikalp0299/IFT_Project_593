import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './SignInCredentials.css';
import { authService } from '../services/authService';

interface SignInCredentialsProps {
  organizationName?: string;
  onSignIn?: (credentials: { username: string; password: string }) => void;
  onBack?: () => void;
}

export const SignInCredentials: React.FC<SignInCredentialsProps> = ({ 
  organizationName = 'Test_Org',
  onSignIn, 
  onBack 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get organization name from navigation state or props
  const orgName = location.state?.organizationName || organizationName;
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use the new authentication service
      const data = await authService.login(
        credentials.username,
        credentials.password,
        organizationName || 'default_org'
      );
      
      // Log the response to console
      console.log('Login response:', data);
      
      if (data.success) {
        console.log('✅ Login successful!', data.data);
        if (onSignIn) {
          onSignIn(credentials);
        }
        
        // Show success state instead of redirecting
        setError(''); // Clear any previous errors
        setLoginSuccess(true);
        setUserData(data.data);
      } else {
        console.error('❌ Login failed:', data.message);
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/signin');
    }
  };

  // Show success message if login was successful
  if (loginSuccess && userData) {
    return (
      <div className="signin-credentials-container">
        <div className="signin-credentials-card">
          {/* Success Icon */}
          <div className="success-icon" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', color: '#10B981' }}>✅</div>
          </div>

          {/* Success Messages */}
          <h1 className="signin-credentials-title" style={{ color: '#10B981' }}>Login Successful!</h1>
          <p className="signin-credentials-subtitle">Welcome back to <span className="signin-credentials-org">{orgName}</span></p>

          {/* User Details */}
          <div className="success-details" style={{ marginBottom: '30px' }}>
            <p><strong>Welcome:</strong> {userData.firstName} {userData.lastName}</p>
            <p><strong>Username:</strong> {userData.username}</p>
            <p><strong>Email:</strong> {userData.email}</p>
            <p><strong>Role:</strong> {userData.role}</p>
            <p><strong>Organization:</strong> {userData.organizationName}</p>
            <p><strong>Login Time:</strong> {new Date().toLocaleString()}</p>
          </div>

          {/* Action Buttons */}
          <div className="success-buttons">
            <button
              onClick={() => {
                setLoginSuccess(false);
                setUserData(null);
                setCredentials({ username: '', password: '' });
              }}
              className="signin-credentials-button"
            >
              Sign In Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="signin-credentials-button"
              style={{ marginTop: '10px', backgroundColor: '#6B7280' }}
            >
              Go to Homepage
            </button>
            <button
              onClick={async () => {
                try {
                  await authService.logout();
                  setLoginSuccess(false);
                  setUserData(null);
                  setCredentials({ username: '', password: '' });
                  console.log('✅ Logged out successfully');
                } catch (error) {
                  console.error('❌ Logout failed:', error);
                }
              }}
              className="signin-credentials-button"
              style={{ 
                marginTop: '10px', 
                backgroundColor: '#DC2626',
                color: 'white'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signin-credentials-container">
      <div className="signin-credentials-card">
                {/* Navigation */}
                <div className="signin-credentials-nav">
                  <button onClick={handleBack} className="signin-credentials-back">
                    ←
                  </button>
                  <Link to="/" className="signin-credentials-home">
                    🏠 Landing
                  </Link>
                </div>

        {/* Header */}
        <div className="signin-credentials-header">
          <h1 className="signin-credentials-title">Sign In</h1>
          <p className="signin-credentials-subtitle">
            Enter your credentials for <span className="signin-credentials-org">{orgName}</span>
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="signin-credentials-form">
          <div className="signin-credentials-field">
            <label htmlFor="username" className="signin-credentials-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={credentials.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              className="signin-credentials-input"
              required
            />
          </div>

          <div className="signin-credentials-field">
            <label htmlFor="password" className="signin-credentials-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              className="signin-credentials-input"
              required
            />
          </div>

          {/* Helper Text */}
          <div className="signin-credentials-demo">
            <p className="signin-credentials-demo-text">
              Enter your username and password to sign in
            </p>
            <p className="signin-credentials-demo-text" style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
              Working credentials: <strong>testuser123</strong> / <strong>Password123</strong>
            </p>
          </div>

          {error && (
            <div className="signin-credentials-error">
              <div className="signin-credentials-error-icon"></div>
              <p className="signin-credentials-error-text">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !credentials.username.trim() || !credentials.password.trim()}
            className="signin-credentials-button"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="signin-credentials-footer">
          <p className="signin-credentials-footer-text">
            Don't have an account?{' '}
            <Link to="/create-account" className="signin-credentials-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

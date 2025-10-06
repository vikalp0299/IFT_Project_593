import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './SignInCredentials.css';

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
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate credentials - only allow demo users for testing
      const validCredentials = [
        { username: 'john_doe', password: 'password123' },
        { username: 'jane_smith', password: 'mypassword' },
        { username: 'admin', password: 'admin123' }
      ];
      
      const isValid = validCredentials.some(
        cred => cred.username === credentials.username && cred.password === credentials.password
      );
      
      if (!isValid) {
        setError('Invalid username or password. Please try again.');
        setIsLoading(false);
        return;
      }

      if (onSignIn) {
        onSignIn(credentials);
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('An error occurred. Please try again.');
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

  return (
    <div className="signin-credentials-container">
      <div className="signin-credentials-card">
        {/* Back Arrow */}
        <button onClick={handleBack} className="signin-credentials-back">
          ←
        </button>

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

          {/* Demo Users Helper Text */}
          <div className="signin-credentials-demo">
            <p className="signin-credentials-demo-text">
              Demo users: john_doe/password123, jane_smith/mypassword, admin/admin123
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

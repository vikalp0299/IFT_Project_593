import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignIn.css';

interface SignInProps {
  onSignIn?: (organizationName: string) => void;
  onSignUp?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ 
  onSignIn, 
  onSignUp 
}) => {
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrganizationName(e.target.value);
    
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
      // Call the actual backend API
      const response = await fetch('http://localhost:8000/validate-signin-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: organizationName
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Navigate to credentials page with organization name
        navigate('/signin-credentials', { state: { organizationName } });
        
        // Also call the callback if provided
        if (onSignIn) {
          onSignIn(organizationName);
        }
      } else {
        setError(data.message || 'Organization validation failed');
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        {/* Home Navigation */}
        <div className="signin-nav">
          <Link to="/" className="signin-home">
            🏠 Landing
          </Link>
        </div>
        
        <h1 className="signin-title">Sign In</h1>
        <p className="signin-subtitle">Enter your organization name to continue</p>
        
        <form onSubmit={handleSubmit} className="signin-form">
          <div className="signin-field">
            <label htmlFor="organizationName" className="signin-label">
              Organization Name
            </label>
            <input
              id="organizationName"
              name="organizationName"
              type="text"
              value={organizationName}
              onChange={handleInputChange}
              placeholder="Enter your organization name"
              className="signin-input"
              required
            />
            <p className="signin-helper">
              Enter your organization name to continue
            </p>
          </div>

          {error && (
            <div className="signin-error">
              <div className="signin-error-icon"></div>
              <p className="signin-error-text">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !organizationName.trim()}
            className="signin-button"
          >
            {isLoading ? 'Signing In...' : 'Continue'}
          </button>
        </form>

        <div className="signin-footer">
          <p className="signin-footer-text">
            Don't have an account?{' '}
            <Link to="/create-account" className="signin-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

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
  const [organizationName, setOrganizationName] = useState('Test_Org_01');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('Organization not found. Please check the organization name and try again.');

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
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate organization name - only allow "Test_Org" for demo
      if (organizationName.toLowerCase() !== 'test_org') {
        setError('Organization not found. Please check the organization name and try again.');
        setIsLoading(false);
        return;
      }

      // Always navigate to credentials page with organization name
      navigate('/signin-credentials', { state: { organizationName } });
      
      // Also call the callback if provided
      if (onSignIn) {
        onSignIn(organizationName);
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
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
              Use "Test_Org" for demo purposes
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

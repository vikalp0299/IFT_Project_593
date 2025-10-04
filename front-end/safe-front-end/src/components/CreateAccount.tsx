import React, { useState } from 'react';
import './CreateAccount.css';
import { AccountCreatedSuccess } from './AccountCreatedSuccess';

interface CreateAccountProps {
  onAccountCreated?: (accountData: { organizationName: string; username: string; password: string }) => void;
  onSignIn?: () => void;
}

export const CreateAccount: React.FC<CreateAccountProps> = ({ 
  onAccountCreated, 
  onSignIn 
}) => {
  const [formData, setFormData] = useState({
    organizationName: 'test_org',
    username: 'test_user_01',
    password: '••••••••'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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
      
      // Validate organization name - only allow "test_org" for testing
      if (formData.organizationName.toLowerCase() !== 'test_org') {
        setError('Organization not found. Please check the organization name and try again.');
        setIsLoading(false);
        return;
      }

      if (onAccountCreated) {
        onAccountCreated(formData);
      }
      
      setShowSuccess(true);
    } catch (err) {
      console.error('Account creation failed:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRedirect = () => {
    if (onSignIn) {
      onSignIn();
    }
  };

  if (showSuccess) {
    return <AccountCreatedSuccess />;
  }

  return (
    <div className="create-account-container">
      <div className="create-account-card">
        <h1 className="create-account-title">Create Account</h1>
        <p className="create-account-subtitle">Sign up with your organization credentials</p>
        
        <form onSubmit={handleSubmit} className="create-account-form">
          <div className="create-account-field">
            <label htmlFor="organizationName" className="create-account-label">
              Organization Name
            </label>
            <input
              id="organizationName"
              name="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={handleInputChange}
              placeholder="Enter your organization name"
              className="create-account-input"
              required
            />
            <p className="create-account-helper">
              Valid organizations: Acme Corporation, TechStart Inc, Global Dynamics, and others...
            </p>
          </div>

          <div className="create-account-field">
            <label htmlFor="username" className="create-account-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose a username"
              className="create-account-input"
              required
            />
          </div>

          <div className="create-account-field">
            <label htmlFor="password" className="create-account-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a password"
              className="create-account-input"
              required
            />
          </div>

          {error && (
            <div className="create-account-error">
              <div className="create-account-error-icon"></div>
              <p className="create-account-error-text">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !formData.organizationName.trim() || !formData.username.trim() || !formData.password.trim()}
            className="create-account-button"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="create-account-footer">
          <p className="create-account-footer-text">
            Already have an account?{' '}
            <a href="/signin" className="create-account-link">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

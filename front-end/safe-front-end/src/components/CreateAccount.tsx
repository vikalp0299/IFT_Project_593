import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    organizationName: '',
    username: '',
    password: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('At least one number');
    }
    
    return errors;
  };

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

    // Validate password in real-time
    if (name === 'password') {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Frontend password validation
      const passwordValidationErrors = validatePassword(formData.password);
      if (passwordValidationErrors.length > 0) {
        setError('Password does not meet requirements. Please check the password requirements below.');
        setIsLoading(false);
        return;
      }

      // Organization validation will be handled by the backend

      // Call your existing server's register endpoint
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          organizationName: formData.organizationName
        })
      });

      const data = await response.json();
      
      if (data.success) {
        if (onAccountCreated) {
          onAccountCreated(formData);
        }
        setShowSuccess(true);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Account creation failed:', err);
      setError('An error occurred. Please try again.');
    } finally {
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
                {/* Home Navigation */}
                <div className="create-account-nav">
                  <Link to="/" className="create-account-home">
                    🏠 Landing
                  </Link>
                </div>
                
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
                      Enter your organization name to register
                    </p>
                    <p className="create-account-helper" style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                      Available organizations: <strong>test_org</strong>, <strong>demo_org</strong>, <strong>test_organization</strong>
                    </p>
          </div>

          <div className="create-account-field">
            <label htmlFor="email" className="create-account-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              className="create-account-input"
              required
            />
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
              onFocus={() => setShowPasswordRequirements(true)}
              onBlur={() => setShowPasswordRequirements(false)}
              placeholder="Create a password"
              className={`create-account-input ${passwordErrors.length > 0 ? 'error' : ''}`}
              required
            />
            
            {/* Password Requirements */}
            {(showPasswordRequirements || passwordErrors.length > 0) && (
              <div className="password-requirements">
                <p className="requirements-title">Password Requirements:</p>
                <ul className="requirements-list">
                  <li className={formData.password.length >= 8 ? 'valid' : 'invalid'}>
                    ✓ At least 8 characters long
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? 'valid' : 'invalid'}>
                    ✓ At least one uppercase letter (A-Z)
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? 'valid' : 'invalid'}>
                    ✓ At least one lowercase letter (a-z)
                  </li>
                  <li className={/\d/.test(formData.password) ? 'valid' : 'invalid'}>
                    ✓ At least one number (0-9)
                  </li>
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="create-account-error">
              <div className="create-account-error-icon"></div>
              <p className="create-account-error-text">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading || 
              !formData.organizationName.trim() || 
              !formData.username.trim() || 
              !formData.password.trim() || 
              !formData.email.trim() ||
              passwordErrors.length > 0
            }
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

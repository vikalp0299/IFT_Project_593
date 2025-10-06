import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AccountCreatedSuccess.css';

interface AccountCreatedSuccessProps {
  onRedirect?: () => void;
  redirectDelay?: number;
}

export const AccountCreatedSuccess: React.FC<AccountCreatedSuccessProps> = ({ 
  onRedirect,
  redirectDelay = 3000 
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onRedirect) {
        onRedirect();
      } else {
        // Default redirect to sign in page
        navigate('/signin');
      }
    }, redirectDelay);

    return () => clearTimeout(timer);
  }, [onRedirect, redirectDelay, navigate]);

  return (
    <div className="account-success-container">
      <div className="account-success-card">
        {/* Success Icon */}
        <div className="account-success-icon">
          <svg className="account-success-checkmark" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Success Messages */}
        <h1 className="account-success-title">Account Created Successfully!</h1>
        <p className="account-success-message">
          Your account has been created and you will be redirected to the login page shortly.
        </p>
      </div>
    </div>
  );
};

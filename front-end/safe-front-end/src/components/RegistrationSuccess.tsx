import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegistrationSuccess.css';

interface RegistrationSuccessProps {
  organizationName: string;
  onRegisterAnother: () => void;
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({ 
  organizationName, 
  onRegisterAnother 
}) => {
  const navigate = useNavigate();

  // Automatically navigate to signin after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/signin');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="success-container">
      <div className="success-card">
        {/* Success Icon */}
        <div className="success-icon">
          <svg className="success-checkmark" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Success Messages */}
        <h1 className="success-title">Registration Successful!</h1>
        <p className="success-message">Your organization has been successfully registered</p>
        <p className="success-redirect">Redirecting to sign in page...</p>

        {/* Organization Details */}
        <div className="success-details">
          <p className="success-org-name">Organization: {organizationName}</p>
          <p className="success-db-message">Database has been updated successfully</p>
          <p className="success-next-step">You can now create accounts and sign in</p>
        </div>

        {/* Action Buttons */}
        <div className="success-buttons">
          <button
            onClick={() => navigate('/signin')}
            className="success-button primary"
          >
            Go to Sign In
          </button>
          <button
            onClick={onRegisterAnother}
            className="success-button secondary"
          >
            Register Another Organization
          </button>
        </div>
      </div>
    </div>
  );
};

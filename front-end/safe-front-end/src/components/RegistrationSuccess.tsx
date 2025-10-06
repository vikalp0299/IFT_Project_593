import React from 'react';
import './RegistrationSuccess.css';

interface RegistrationSuccessProps {
  organizationName: string;
  onRegisterAnother: () => void;
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({ 
  organizationName, 
  onRegisterAnother 
}) => {
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

        {/* Organization Details */}
        <div className="success-details">
          <p className="success-org-name">Organization Name: {organizationName}</p>
          <p className="success-db-message">Database has been updated successfully</p>
        </div>

        {/* Action Button */}
        <button
          onClick={onRegisterAnother}
          className="success-button"
        >
          Register Another Organization
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './RegistrationForm.css';

interface RegistrationFormProps {
  onRegistrationSuccess: (orgName: string) => void;
  onBack: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  onRegistrationSuccess, 
  onBack 
}) => {
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call the actual backend API
      const response = await fetch('http://localhost:8000/validate-organization', {
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
        onRegistrationSuccess(organizationName);
      } else {
        setError(data.message || 'Organization validation failed');
      }
    } catch (err) {
      console.error('Organization validation failed:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        {/* Home Navigation */}
        <div className="registration-nav">
          <Link to="/" className="registration-home">
            🏠 Landing
          </Link>
        </div>
        
        <h1 className="registration-title">Organization Registration</h1>
        <p className="registration-subtitle">Enter your organization name to get started.</p>
        
        <form onSubmit={handleSubmit} className="registration-form">
          <div className="registration-field">
            <label htmlFor="organizationName" className="registration-label">
              Organization Name
            </label>
            <input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Enter organization name"
              className="registration-input"
              required
            />
          </div>

          {error && (
            <div className="registration-error">
              <p className="registration-error-text">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !organizationName.trim()}
            className="registration-button"
          >
            {isLoading ? 'Registering...' : 'Register Organization'}
          </button>
        </form>
      </div>
    </div>
  );
};

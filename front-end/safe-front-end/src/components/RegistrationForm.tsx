import React, { useState } from 'react';
import './RegistrationForm.css';

interface RegistrationFormProps {
  onRegistrationSuccess: (orgName: string) => void;
  onBack: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  onRegistrationSuccess, 
  onBack 
}) => {
  const [organizationName, setOrganizationName] = useState('Test_org');
  const [error, setError] = useState('This organization name already exists. Please choose a different name.');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate duplicate name error for demonstration
      if (organizationName.toLowerCase() === 'test_org') {
        setError('This organization name already exists. Please choose a different name.');
        setIsLoading(false);
        return;
      }

      onRegistrationSuccess(organizationName);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
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

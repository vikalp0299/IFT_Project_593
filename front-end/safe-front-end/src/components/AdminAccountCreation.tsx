import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminAccountCreation.css';

interface AdminAccountCreationProps {
  organizationId: string;
  organizationName: string;
  onAdminCreated: (adminData: any) => void;
  onBack: () => void;
}

export const AdminAccountCreation: React.FC<AdminAccountCreationProps> = ({ 
  organizationId,
  organizationName,
  onAdminCreated,
  onBack
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];
    
    // Admin account validation
    if (!formData.username.trim()) newErrors.push('Admin username is required');
    if (formData.username.length < 3) newErrors.push('Admin username must be at least 3 characters');
    if (!formData.email.trim()) newErrors.push('Admin email is required');
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) newErrors.push('Valid admin email is required');
    if (!formData.password.trim()) newErrors.push('Admin password is required');
    if (formData.password.length < 8) newErrors.push('Admin password must be at least 8 characters');
    if (formData.password !== formData.confirmPassword) newErrors.push('Passwords do not match');
    if (!formData.firstName.trim()) newErrors.push('Admin first name is required');
    if (!formData.lastName.trim()) newErrors.push('Admin last name is required');
    if (!formData.phone.trim()) newErrors.push('Admin phone number is required');
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) newErrors.push('Valid admin phone number is required');
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Send admin details to /admin/registration
      const adminData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        organizationId: organizationId
      };

      const adminResponse = await fetch('http://localhost:8000/admin/registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminData)
      });

      const adminResponseData = await adminResponse.json();
      
      if (adminResponseData.success) {
        // Admin registration succeeded
        onAdminCreated({
          organizationId,
          organizationName,
          admin: adminResponseData.data
        });
      } else {
        // Admin registration failed
        if (adminResponseData.errors && Array.isArray(adminResponseData.errors)) {
          setErrors(adminResponseData.errors);
        } else {
          setErrors([adminResponseData.message || 'Admin account registration failed']);
        }
      }
    } catch (err) {
      setErrors(['An error occurred. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-account-container">
      <div className="admin-account-card">
        {/* Home Navigation */}
        <div className="admin-account-nav">
          <Link to="/" className="admin-account-home">
            🏠 Landing
          </Link>
        </div>
        
        <h1 className="admin-account-title">Create Admin Account</h1>
        <p className="admin-account-subtitle">
          Create an admin account for <strong>{organizationName}</strong>
        </p>
        
        <form onSubmit={handleSubmit} className="admin-account-form">
          {/* Admin Account Information */}
          <div className="form-section">
            <h3 className="section-title">Admin Account Information</h3>
            <p className="section-description">Set up your admin account credentials</p>
            
            <div className="admin-account-field">
              <label htmlFor="username" className="admin-account-label">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="admin_username"
                className="admin-account-input"
                required
                minLength={3}
                maxLength={30}
              />
            </div>

            <div className="admin-account-field">
              <label htmlFor="email" className="admin-account-label">
                Admin Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="admin@acme.com"
                className="admin-account-input"
                required
              />
            </div>

            <div className="admin-account-field">
              <label htmlFor="password" className="admin-account-label">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Minimum 8 characters"
                className="admin-account-input"
                required
                minLength={8}
              />
            </div>

            <div className="admin-account-field">
              <label htmlFor="confirmPassword" className="admin-account-label">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className="admin-account-input"
                required
                minLength={8}
              />
            </div>

            <div className="name-row">
              <div className="admin-account-field">
                <label htmlFor="firstName" className="admin-account-label">
                  First Name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="admin-account-input"
                  required
                />
              </div>

              <div className="admin-account-field">
                <label htmlFor="lastName" className="admin-account-label">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="admin-account-input"
                  required
                />
              </div>
            </div>

            <div className="admin-account-field">
              <label htmlFor="phone" className="admin-account-label">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                className="admin-account-input"
                required
              />
            </div>
          </div>

          {errors.length > 0 && (
            <div className="admin-account-error">
              <h4 className="error-title">Please fix the following errors:</h4>
              <ul className="error-list">
                {errors.map((error, index) => (
                  <li key={index} className="error-item">{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="admin-account-actions">
            <button
              type="button"
              onClick={onBack}
              className="back-button"
              disabled={isLoading}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="submit-button"
            >
              {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


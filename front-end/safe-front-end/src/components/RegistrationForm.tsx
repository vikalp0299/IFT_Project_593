import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './RegistrationForm.css';

interface RegistrationFormProps {
  onRegistrationSuccess: (orgData: any) => void;
  onBack: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  onRegistrationSuccess, 
  onBack 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    businessType: '',
    industry: '',
    website: '',
    maxUsers: 50
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    const newErrors: string[] = [];
    
    if (!formData.name.trim()) newErrors.push('Organization name is required');
    if (!formData.displayName.trim()) newErrors.push('Display name is required');
    if (!formData.email.trim()) newErrors.push('Email is required');
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) newErrors.push('Valid email is required');
    if (!formData.phone.trim()) newErrors.push('Phone number is required');
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) newErrors.push('Valid phone number is required');
    if (!formData.address.street.trim()) newErrors.push('Street address is required');
    if (!formData.address.city.trim()) newErrors.push('City is required');
    if (!formData.address.state.trim()) newErrors.push('State is required');
    if (!formData.address.zipCode.trim()) newErrors.push('ZIP code is required');
    if (!formData.address.country.trim()) newErrors.push('Country is required');
    if (!formData.businessType) newErrors.push('Business type is required');
    if (!formData.industry.trim()) newErrors.push('Industry is required');
    
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
      const response = await fetch('http://localhost:8000/validate-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        onRegistrationSuccess(data.data);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else {
          setErrors([data.message || 'Organization registration failed']);
        }
      }
    } catch (err) {
      console.error('Organization registration failed:', err);
      setErrors(['An error occurred. Please try again.']);
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
        <p className="registration-subtitle">Complete your organization information to get started.</p>
        
        <form onSubmit={handleSubmit} className="registration-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            
            <div className="registration-field">
              <label htmlFor="name" className="registration-label">
                Organization Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., acme-corp"
                className="registration-input"
                required
              />
            </div>

            <div className="registration-field">
              <label htmlFor="displayName" className="registration-label">
                Display Name *
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleInputChange}
                placeholder="e.g., ACME Corporation"
                className="registration-input"
                required
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3 className="section-title">Contact Information</h3>
            
            <div className="registration-field">
              <label htmlFor="email" className="registration-label">
                Organization Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contact@acme.com"
                className="registration-input"
                required
              />
            </div>

            <div className="registration-field">
              <label htmlFor="phone" className="registration-label">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                className="registration-input"
                required
              />
            </div>

            <div className="registration-field">
              <label htmlFor="website" className="registration-label">
                Website (Optional)
              </label>
              <input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://www.acme.com"
                className="registration-input"
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="form-section">
            <h3 className="section-title">Address Information</h3>
            
            <div className="registration-field">
              <label htmlFor="address.street" className="registration-label">
                Street Address *
              </label>
              <input
                id="address.street"
                name="address.street"
                type="text"
                value={formData.address.street}
                onChange={handleInputChange}
                placeholder="123 Main Street"
                className="registration-input"
                required
              />
            </div>

            <div className="address-row">
              <div className="registration-field">
                <label htmlFor="address.city" className="registration-label">
                  City *
                </label>
                <input
                  id="address.city"
                  name="address.city"
                  type="text"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  placeholder="New York"
                  className="registration-input"
                  required
                />
              </div>

              <div className="registration-field">
                <label htmlFor="address.state" className="registration-label">
                  State *
                </label>
                <input
                  id="address.state"
                  name="address.state"
                  type="text"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  placeholder="NY"
                  className="registration-input"
                  required
                />
              </div>
            </div>

            <div className="address-row">
              <div className="registration-field">
                <label htmlFor="address.zipCode" className="registration-label">
                  ZIP Code *
                </label>
                <input
                  id="address.zipCode"
                  name="address.zipCode"
                  type="text"
                  value={formData.address.zipCode}
                  onChange={handleInputChange}
                  placeholder="10001"
                  className="registration-input"
                  required
                />
              </div>

              <div className="registration-field">
                <label htmlFor="address.country" className="registration-label">
                  Country *
                </label>
                <input
                  id="address.country"
                  name="address.country"
                  type="text"
                  value={formData.address.country}
                  onChange={handleInputChange}
                  placeholder="United States"
                  className="registration-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="form-section">
            <h3 className="section-title">Business Information</h3>
            
            <div className="registration-field">
              <label htmlFor="businessType" className="registration-label">
                Business Type *
              </label>
              <select
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                className="registration-input"
                required
              >
                <option value="">Select Business Type</option>
                <option value="Corporation">Corporation</option>
                <option value="LLC">LLC</option>
                <option value="Partnership">Partnership</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Non-Profit">Non-Profit</option>
                <option value="Government">Government</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="registration-field">
              <label htmlFor="industry" className="registration-label">
                Industry *
              </label>
              <input
                id="industry"
                name="industry"
                type="text"
                value={formData.industry}
                onChange={handleInputChange}
                placeholder="e.g., Technology, Healthcare, Finance"
                className="registration-input"
                required
              />
            </div>

            <div className="registration-field">
              <label htmlFor="maxUsers" className="registration-label">
                Maximum Users (Default: 50)
              </label>
              <input
                id="maxUsers"
                name="maxUsers"
                type="number"
                value={formData.maxUsers}
                onChange={handleInputChange}
                min="1"
                max="10000"
                className="registration-input"
              />
            </div>
          </div>

          {errors.length > 0 && (
            <div className="registration-error">
              <h4 className="error-title">Please fix the following errors:</h4>
              <ul className="error-list">
                {errors.map((error, index) => (
                  <li key={index} className="error-item">{error}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="registration-button"
          >
            {isLoading ? 'Registering Organization...' : 'Register Organization'}
          </button>
        </form>
      </div>
    </div>
  );
};

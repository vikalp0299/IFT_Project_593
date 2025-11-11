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
    // Organization fields
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
    maxUsers: 50,
    // Admin account fields
    admin: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      jobTitle: '',
      department: ''
    }
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
    } else if (name.startsWith('admin.')) {
      const adminField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        admin: {
          ...prev.admin,
          [adminField]: value
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
    
    // Organization validation
    if (!formData.name.trim()) newErrors.push('Organization name is required');
    if (!formData.displayName.trim()) newErrors.push('Display name is required');
    if (!formData.email.trim()) newErrors.push('Organization email is required');
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) newErrors.push('Valid organization email is required');
    if (!formData.phone.trim()) newErrors.push('Organization phone number is required');
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) newErrors.push('Valid organization phone number is required');
    if (!formData.address.street.trim()) newErrors.push('Street address is required');
    if (!formData.address.city.trim()) newErrors.push('City is required');
    if (!formData.address.state.trim()) newErrors.push('State is required');
    if (!formData.address.zipCode.trim()) newErrors.push('ZIP code is required');
    if (!formData.address.country.trim()) newErrors.push('Country is required');
    if (!formData.businessType) newErrors.push('Business type is required');
    if (!formData.industry.trim()) newErrors.push('Industry is required');
    
    // Admin account validation
    if (!formData.admin.username.trim()) newErrors.push('Admin username is required');
    if (formData.admin.username.length < 3) newErrors.push('Admin username must be at least 3 characters');
    if (!formData.admin.email.trim()) newErrors.push('Admin email is required');
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.admin.email)) newErrors.push('Valid admin email is required');
    if (!formData.admin.password.trim()) newErrors.push('Admin password is required');
    if (formData.admin.password.length < 8) newErrors.push('Admin password must be at least 8 characters');
    if (formData.admin.password !== formData.admin.confirmPassword) newErrors.push('Passwords do not match');
    if (!formData.admin.firstName.trim()) newErrors.push('Admin first name is required');
    if (!formData.admin.lastName.trim()) newErrors.push('Admin last name is required');
    if (!formData.admin.phone.trim()) newErrors.push('Admin phone number is required');
    if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.admin.phone)) newErrors.push('Valid admin phone number is required');
    if (!formData.admin.jobTitle.trim()) newErrors.push('Admin job title is required');
    if (!formData.admin.department.trim()) newErrors.push('Admin department is required');
    
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
      // Step 1: Send organization details to /org/validate-organization
      const organizationData = {
        name: formData.name,
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        businessType: formData.businessType,
        industry: formData.industry,
        website: formData.website || '',
        maxUsers: formData.maxUsers
      };

      const orgResponse = await fetch('http://localhost:8000/org/validate-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(organizationData)
      });

      const orgData = await orgResponse.json();
      
      if (!orgData.success) {
        // Organization validation failed
        if (orgData.errors && Array.isArray(orgData.errors)) {
          setErrors(orgData.errors);
        } else {
          setErrors([orgData.message || 'Organization validation failed']);
        }
        setIsLoading(false);
        return;
      }

      // Step 2: If organization validation succeeds, send admin details to /admin/registration
      const adminData = {
        username: formData.admin.username,
        email: formData.admin.email,
        password: formData.admin.password,
        firstName: formData.admin.firstName,
        lastName: formData.admin.lastName,
        phone: formData.admin.phone,
        jobTitle: formData.admin.jobTitle,
        department: formData.admin.department,
        // Include organization reference if needed (organizationId from org response)
        organizationId: orgData.data?.organizationId || orgData.data?.id || orgData.data?._id
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
        // Both organization and admin registration succeeded
        // Combine the data for the success callback
        const combinedData = {
          organization: orgData.data,
          admin: adminResponseData.data
        };
        onRegistrationSuccess(combinedData);
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
    <div className="registration-container">
      <div className="registration-card">
        {/* Home Navigation */}
        <div className="registration-nav">
          <Link to="/" className="registration-home">
            🏠 Landing
          </Link>
        </div>
        
        <h1 className="registration-title">Organization Registration</h1>
        <p className="registration-subtitle">Complete your organization information and create an admin account to get started.</p>
        
        <form onSubmit={handleSubmit} className="registration-form">
          {/* Admin Account Information */}
          <div className="form-section">
            <h3 className="section-title">Admin Account Information</h3>
            <p className="section-description">Create an admin account for your organization</p>
            
            <div className="registration-field">
              <label htmlFor="admin.username" className="registration-label">
                Username *
              </label>
              <input
                id="admin.username"
                name="admin.username"
                type="text"
                value={formData.admin.username}
                onChange={handleInputChange}
                placeholder="admin_username"
                className="registration-input"
                required
                minLength={3}
                maxLength={30}
              />
            </div>

            <div className="registration-field">
              <label htmlFor="admin.email" className="registration-label">
                Admin Email *
              </label>
              <input
                id="admin.email"
                name="admin.email"
                type="email"
                value={formData.admin.email}
                onChange={handleInputChange}
                placeholder="admin@acme.com"
                className="registration-input"
                required
              />
            </div>

            <div className="registration-field">
              <label htmlFor="admin.password" className="registration-label">
                Password *
              </label>
              <input
                id="admin.password"
                name="admin.password"
                type="password"
                value={formData.admin.password}
                onChange={handleInputChange}
                placeholder="Minimum 8 characters"
                className="registration-input"
                required
                minLength={8}
              />
            </div>

            <div className="registration-field">
              <label htmlFor="admin.confirmPassword" className="registration-label">
                Confirm Password *
              </label>
              <input
                id="admin.confirmPassword"
                name="admin.confirmPassword"
                type="password"
                value={formData.admin.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className="registration-input"
                required
                minLength={8}
              />
            </div>

            <div className="address-row">
              <div className="registration-field">
                <label htmlFor="admin.firstName" className="registration-label">
                  First Name *
                </label>
                <input
                  id="admin.firstName"
                  name="admin.firstName"
                  type="text"
                  value={formData.admin.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="registration-input"
                  required
                />
              </div>

              <div className="registration-field">
                <label htmlFor="admin.lastName" className="registration-label">
                  Last Name *
                </label>
                <input
                  id="admin.lastName"
                  name="admin.lastName"
                  type="text"
                  value={formData.admin.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="registration-input"
                  required
                />
              </div>
            </div>

            <div className="registration-field">
              <label htmlFor="admin.phone" className="registration-label">
                Admin Phone Number *
              </label>
              <input
                id="admin.phone"
                name="admin.phone"
                type="tel"
                value={formData.admin.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                className="registration-input"
                required
              />
            </div>

            <div className="address-row">
              <div className="registration-field">
                <label htmlFor="admin.jobTitle" className="registration-label">
                  Job Title *
                </label>
                <input
                  id="admin.jobTitle"
                  name="admin.jobTitle"
                  type="text"
                  value={formData.admin.jobTitle}
                  onChange={handleInputChange}
                  placeholder="Administrator"
                  className="registration-input"
                  required
                />
              </div>

              <div className="registration-field">
                <label htmlFor="admin.department" className="registration-label">
                  Department *
                </label>
                <input
                  id="admin.department"
                  name="admin.department"
                  type="text"
                  value={formData.admin.department}
                  onChange={handleInputChange}
                  placeholder="Administration"
                  className="registration-input"
                  required
                />
              </div>
            </div>
          </div>

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
            {isLoading ? 'Registering Organization and Admin Account...' : 'Register Organization & Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { RegistrationForm } from './RegistrationForm';
import { AdminAccountCreation } from './AdminAccountCreation';
import { RegistrationSuccess } from './RegistrationSuccess';

type RegistrationStep = 'welcome' | 'organization' | 'admin' | 'success';

export const OrganizationRegistration: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('welcome');
  const [registeredOrganization, setRegisteredOrganization] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');

  const handleStartRegistration = () => {
    setCurrentStep('organization');
  };

  const handleOrganizationCreated = (orgData: any) => {
    // Organization created successfully, proceed to admin creation
    const orgName = orgData.organizationName || orgData.organization?.displayName || orgData.organization?.name || 'Unknown Organization';
    const orgId = orgData.organizationId || orgData.organization?._id || orgData.organization?.id;
    
    setRegisteredOrganization(orgName);
    setOrganizationId(orgId);
    setCurrentStep('admin');
  };

  const handleAdminCreated = (adminData: any) => {
    // Both organization and admin created successfully
    setCurrentStep('success');
  };

  const handleBackToWelcome = () => {
    setCurrentStep('welcome');
  };

  const handleBackToOrganization = () => {
    setCurrentStep('organization');
  };

  const handleRegisterAnother = () => {
    setRegisteredOrganization('');
    setOrganizationId('');
    setCurrentStep('organization');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen onStartRegistration={handleStartRegistration} />;
      
      case 'organization':
        return (
          <RegistrationForm
            onRegistrationSuccess={handleOrganizationCreated}
            onBack={handleBackToWelcome}
          />
        );
      
      case 'admin':
        return (
          <AdminAccountCreation
            organizationId={organizationId}
            organizationName={registeredOrganization}
            onAdminCreated={handleAdminCreated}
            onBack={handleBackToOrganization}
          />
        );
      
      case 'success':
        return (
          <RegistrationSuccess
            organizationName={registeredOrganization}
            onRegisterAnother={handleRegisterAnother}
          />
        );
      
      default:
        return <WelcomeScreen onStartRegistration={handleStartRegistration} />;
    }
  };

  return <>{renderCurrentStep()}</>;
};

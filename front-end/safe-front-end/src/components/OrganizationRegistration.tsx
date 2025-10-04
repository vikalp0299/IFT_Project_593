import React, { useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { RegistrationForm } from './RegistrationForm';
import { RegistrationSuccess } from './RegistrationSuccess';

type RegistrationStep = 'welcome' | 'form' | 'success';

export const OrganizationRegistration: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('welcome');
  const [registeredOrganization, setRegisteredOrganization] = useState<string>('');

  const handleStartRegistration = () => {
    setCurrentStep('form');
  };

  const handleRegistrationSuccess = (orgName: string) => {
    setRegisteredOrganization(orgName);
    setCurrentStep('success');
  };

  const handleBackToWelcome = () => {
    setCurrentStep('welcome');
  };

  const handleRegisterAnother = () => {
    setRegisteredOrganization('');
    setCurrentStep('form');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen onStartRegistration={handleStartRegistration} />;
      
      case 'form':
        return (
          <RegistrationForm
            onRegistrationSuccess={handleRegistrationSuccess}
            onBack={handleBackToWelcome}
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

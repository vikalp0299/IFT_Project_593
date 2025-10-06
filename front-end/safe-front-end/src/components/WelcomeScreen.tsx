import React from 'react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onStartRegistration: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartRegistration }) => {
  return (
    <div className="welcome-container">
      <div className="welcome-card">
        <h1 className="welcome-heading">Welcome</h1>
        <p className="welcome-description">Get started by registering your organization.</p>
        <button 
          className="welcome-button"
          onClick={onStartRegistration}
        >
          Organization Registration
        </button>
      </div>
    </div>
  );
};

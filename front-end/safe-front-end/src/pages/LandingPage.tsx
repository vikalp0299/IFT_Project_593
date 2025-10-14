import { Link } from 'react-router-dom';
import './LandingPage.css';

export const LandingPage = () => {
  return (
    <div className="landing-page-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="brand-highlight">Safe Frontend</span>
          </h1>
          
          <p className="hero-description">
            Your secure gateway to organization management
          </p>
        </div>
      </div>

      {/* Action Cards Section */}
      <div className="action-section">
        <div className="action-grid">
          <div className="action-card primary">
            <div className="card-icon">🏢</div>
            <h3 className="card-title">Organization Registration</h3>
            <p className="card-description">
              Register your organization and get started
            </p>
            <Link to="/organization-registration" className="card-button primary">
              Get Started
            </Link>
          </div>
          
          <div className="action-card secondary">
            <div className="card-icon">👤</div>
            <h3 className="card-title">Create Account</h3>
            <p className="card-description">
              Create your personal account
            </p>
            <Link to="/create-account" className="card-button secondary">
              Sign Up
            </Link>
          </div>
          
          <div className="action-card tertiary">
            <div className="card-icon">🔐</div>
            <h3 className="card-title">Sign In</h3>
            <p className="card-description">
              Already have an account? Sign in
            </p>
            <Link to="/signin" className="card-button tertiary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

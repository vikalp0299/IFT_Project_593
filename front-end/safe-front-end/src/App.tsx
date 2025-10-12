import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { LandingPage } from './pages/LandingPage';
import { OrganizationRegistrationPage } from './pages/OrganizationRegistrationPage';
import { CreateAccountPage } from './pages/CreateAccountPage';
import { SignInPage } from './pages/SignInPage';
import { SignInCredentialsPage } from './pages/SignInCredentialsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/organization-registration" element={<OrganizationRegistrationPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signin-credentials" element={<SignInCredentialsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App

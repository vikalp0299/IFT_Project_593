import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { LandingPage } from './pages/LandingPage';
import { OrganizationRegistrationPage } from './pages/OrganizationRegistrationPage';
import { CreateAccountPage } from './pages/CreateAccountPage';
import { SignInPage } from './pages/SignInPage';
import { SignInCredentialsPage } from './pages/SignInCredentialsPage';
import { HomePage } from './pages/HomePage';
import { CreateBlockchain } from './pages/CreateBlockchain';
import { JoinBlockchain } from './pages/JoinBlockchain';
import { ProtectedRoute } from './components/ProtectedRoute';

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
          
          {/* Protected Routes */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-blockchain" 
            element={
              <ProtectedRoute>
                <CreateBlockchain />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/join-blockchain" 
            element={
              <ProtectedRoute>
                <JoinBlockchain />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App

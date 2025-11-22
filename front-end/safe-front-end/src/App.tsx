import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { LandingPage } from './pages/LandingPage';
import { OrganizationRegistrationPage } from './pages/OrganizationRegistrationPage';
import { CreateAccountPage } from './pages/CreateAccountPage';
import { SignInPage } from './pages/SignInPage';
import { SignInCredentialsPage } from './pages/SignInCredentialsPage';
import { AdminHomePage } from './pages/AdminHomePage';
import { UserHomePage } from './pages/UserHomePage';
import { CreateBlockchain } from './pages/CreateBlockchain';
import { JoinBlockchain } from './pages/JoinBlockchain';
import TextEditorPage from './pages/TextEditorPage';
import PendingApprovalsPage from './pages/PendingApprovalsPage';
import ProposalReviewPage from './pages/ProposalReviewPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleBasedRoute, HomeRouteRedirect } from './components/RoleBasedRoute';

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
          
          {/* Home route - redirects based on user role */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <HomeRouteRedirect />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Home Page - Only accessible to Admin users */}
          <Route 
            path="/admin/home" 
            element={
              <RoleBasedRoute allowedRoles={['Admin']}>
                <AdminHomePage />
              </RoleBasedRoute>
            } 
          />
          
          {/* User Home Page - For regular users */}
          <Route 
            path="/user/home" 
            element={
              <ProtectedRoute>
                <UserHomePage />
              </ProtectedRoute>
            } 
          />
          
          {/* File Edit Routes */}
          <Route 
            path="/edit-file/:fileId" 
            element={
              <ProtectedRoute>
                <TextEditorPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/pending-approvals" 
            element={
              <ProtectedRoute>
                <PendingApprovalsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/proposal-review/:fileId/:proposalId" 
            element={
              <ProtectedRoute>
                <ProposalReviewPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin-only routes */}
          <Route 
            path="/create-blockchain" 
            element={
              <RoleBasedRoute allowedRoles={['Admin']}>
                <CreateBlockchain />
              </RoleBasedRoute>
            } 
          />
          <Route 
            path="/join-blockchain" 
            element={
              <RoleBasedRoute allowedRoles={['Admin']}>
                <JoinBlockchain />
              </RoleBasedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App

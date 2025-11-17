import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './JoinBlockchain.css';

export const JoinBlockchain = () => {
  const navigate = useNavigate();
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const user = authService.getCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // TODO: Implement API call to join blockchain
      // const response = await authService.authenticatedRequest('/blockchain/join', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     invitationCode: invitationCode.trim(),
      //     userId: user?.userId,
      //     organizationId: user?.organizationId
      //   })
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccess(true);
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (err) {
      console.error('Error joining blockchain:', err);
      setError(err instanceof Error ? err.message : 'Failed to join blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/home');
  };

  if (success) {
    return (
      <div className="join-blockchain-container">
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h2>Successfully Joined Blockchain!</h2>
          <p>You have been added to the blockchain network.</p>
          <p>Redirecting to homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-blockchain-container">
      <header className="page-header">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>
        <h1>Join Blockchain</h1>
      </header>

      <main className="page-main">
        <div className="form-container">
          <div className="form-header">
            <h2>Join Existing Blockchain Network</h2>
            <p>Enter the invitation code provided by the blockchain administrator</p>
          </div>

          <form onSubmit={handleSubmit} className="blockchain-form">
            <div className="form-group">
              <label htmlFor="invitationCode">Invitation Code *</label>
              <input
                type="text"
                id="invitationCode"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                required
                placeholder="Enter invitation code"
                disabled={isLoading}
                className="invitation-input"
              />
              <small className="form-hint">
                The invitation code is typically provided by the blockchain network administrator
              </small>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={handleBack}
                className="cancel-button"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading || !invitationCode.trim()}
              >
                {isLoading ? 'Joining...' : 'Join Blockchain'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};




import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateBlockchain.css';

export const CreateBlockchain = () => {
  const navigate = useNavigate();
  const [peerCount, setPeerCount] = useState('');
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // TODO: Implement API call to create blockchain
      // const response = await authService.authenticatedRequest('/blockchain/create', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     peerCount: Number(peerCount),
      //     channelName,
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
      console.error('Error creating blockchain:', err);
      setError(err instanceof Error ? err.message : 'Failed to create blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/home');
  };

  if (success) {
    return (
      <div className="create-blockchain-container">
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h2>Blockchain Created Successfully!</h2>
          <p>
            Your blockchain network for channel "{channelName}" with {peerCount || '0'} peers has
            been created.
          </p>
          <p>Redirecting to homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-blockchain-container">
      <header className="page-header">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>
        <h1>Create Blockchain</h1>
      </header>

      <main className="page-main">
        <div className="form-container">
          <div className="form-header">
            <h2>Create New Blockchain Network</h2>
            <p>Set up a new blockchain network for your organization</p>
          </div>

          <form onSubmit={handleSubmit} className="blockchain-form">
            <div className="form-group">
              <label htmlFor="peerCount">Peer Count *</label>
              <input
                type="number"
                id="peerCount"
                value={peerCount}
                min={1}
                onChange={(e) => setPeerCount(e.target.value)}
                required
                placeholder="Enter number of peers"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="channelName">Channel Name *</label>
              <input
                type="text"
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                required
                placeholder="Enter channel name"
                disabled={isLoading}
              />
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
                disabled={isLoading || !peerCount.trim() || !channelName.trim()}
              >
                {isLoading ? 'Creating...' : 'Create Blockchain'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};






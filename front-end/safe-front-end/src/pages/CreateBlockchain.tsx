import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './CreateBlockchain.css';

const API_BASE_URL = 'http://localhost:8000';

export const CreateBlockchain = () => {
  const navigate = useNavigate();
  const [peerCount, setPeerCount] = useState('');
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setStatusMessage(null);
    setProgressPercent(0);

    try {
      // Validate peerCount is a valid number
      const peerCountNum = Number(peerCount);
      if (isNaN(peerCountNum) || peerCountNum < 1) {
        setError('Peer count must be a valid number greater than 0');
        setIsLoading(false);
        return;
      }

      // Prepare request body according to backend expectations
      const requestBody: { peerCount: number; channelName?: string } = {
        peerCount: peerCountNum,
      };

      // Add channelName if provided (optional in backend)
      if (channelName.trim()) {
        requestBody.channelName = channelName.trim();
      }

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('You are not authenticated. Please sign in again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/blockchain/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create blockchain.';
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch {
          try {
            const text = await response.text();
            if (text) {
              errorMessage = text;
            }
          } catch {
            // ignore
          }
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('No response body received from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let operationFinished = false;
      let shouldStop = false;

      while (!shouldStop) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');

        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');

          if (!rawEvent || rawEvent.startsWith(':')) {
            continue;
          }

          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data:'));

          if (!dataLine) {
            continue;
          }

          const payload = dataLine.replace(/^data:\s*/, '');

          try {
            const update = JSON.parse(payload);

            if (update.message) {
              setStatusMessage(update.message);
            }

            if (typeof update.progress === 'number') {
              setProgressPercent(Math.min(Math.max(update.progress, 0), 100));
            }

            if (update.status === 'completed') {
              operationFinished = true;
              shouldStop = true;
              setSuccess(true);
              setTimeout(() => {
                navigate('/home');
              }, 2000);
              break;
            }

            if (update.status === 'failed') {
              operationFinished = true;
              shouldStop = true;
              throw new Error(update.message || 'Blockchain creation failed.');
            }
          } catch (parseError) {
            console.error('Failed to parse SSE message:', parseError, payload);
          }
        }
      }

      if (!operationFinished) {
        throw new Error('Blockchain creation ended unexpectedly. Please try again.');
      }
    } catch (err) {
      console.error('Error creating blockchain:', err);
      setError(err instanceof Error ? err.message : 'Failed to create blockchain. Please try again.');
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

            {statusMessage && (
              <div className="info-message">
                <p>{statusMessage}</p>
                {!success && (
                  <div
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      height: '6px',
                      borderRadius: '999px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: '#4ade80',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

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






import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './JoinBlockchain.css';

interface BlockchainOrganization {
  orgName: string;
  organizationChannelName: string[];
}

export const JoinBlockchain = () => {
  const navigate = useNavigate();
  const [organizationQuery, setOrganizationQuery] = useState('');
  const [channelOptions, setChannelOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [peerCount, setPeerCount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedChannelName =
    channelOptions.find((channel) => channel.id === selectedChannelId)?.name ?? '';

  const handleOrganizationSearch = async () => {
    if (!organizationQuery.trim()) {
      setError('Please enter an organization name to search.');
      return;
    }

    setError(null);
    setSearchMessage(null);
    setIsSearching(true);
    setSelectedChannelId('');
    setChannelOptions([]);

    try {
      const response = await authService.authenticatedRequest<BlockchainOrganization[]>(
        '/api/blockchain/organizations'
      );

      if (!response.success || !response.data) {
        setError(response.message || 'Unable to fetch organizations.');
        return;
      }

      const normalizedOrg = organizationQuery.trim();
      const normalizedQuery = normalizedOrg.toLowerCase();
      const matchedOrganizations = response.data.filter((org) =>
        org.orgName.toLowerCase().includes(normalizedQuery)
      );

      if (matchedOrganizations.length === 0) {
        setSearchMessage(`No organizations found for "${normalizedOrg}".`);
        return;
      }

      const generatedChannels = matchedOrganizations.flatMap((org) => {
        const channels =
          Array.isArray(org.organizationChannelName) && org.organizationChannelName.length > 0
            ? org.organizationChannelName
            : ['Main Channel'];

        return channels.map((channelName, index) => ({
          id: `${org.orgName}-${index}-${channelName || 'channel'}`,
          name: `${org.orgName} - ${channelName || 'Channel'}`,
        }));
      });

      setChannelOptions(generatedChannels);
      setSearchMessage(
        `${generatedChannels.length} channel${
          generatedChannels.length > 1 ? 's' : ''
        } found for ${normalizedOrg}. Select one below.`
      );
    } catch (searchError) {
      console.error('Error searching organization:', searchError);
      setError('Failed to search organization. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // TODO: Implement API call to join blockchain
      // const response = await authService.authenticatedRequest('/blockchain/join', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     organizationName: organizationQuery.trim(),
      //     channelId: selectedChannelId,
      //     peerCount: Number(peerCount),
      //     userId: user?.userId
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
          <p>
            You have been added to the "{selectedChannelName}" channel with {peerCount || '0'} peers.
          </p>
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
            <p>Search for organization that has the blockchain network</p>
          </div>

          <form onSubmit={handleSubmit} className="blockchain-form">
            <div className="form-group">
              <label htmlFor="organizationSearch">Search Organization *</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  id="organizationSearch"
                  value={organizationQuery}
                  onChange={(e) => setOrganizationQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSearching && organizationQuery.trim()) {
                      e.preventDefault();
                      handleOrganizationSearch();
                    }
                  }}
                  required
                  placeholder="Enter organization name"
                  disabled={isLoading || isSearching}
                  className="invitation-input"
                />
                <button
                  type="button"
                  className="search-icon-button"
                  onClick={handleOrganizationSearch}
                  disabled={isLoading || isSearching || !organizationQuery.trim()}
                  aria-label="Search organization"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
              <small className="form-hint">
                Search for an organization to load its available blockchain channels.
              </small>
            </div>

            {searchMessage && <p className="info-message">{searchMessage}</p>}

            {channelOptions.length > 0 && (
              <>
                <div className="form-group">
                  <label htmlFor="channelSelect">Channel Name *</label>
                  <div className="select-wrapper">
                    <select
                      id="channelSelect"
                      className="channel-select"
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      disabled={isLoading}
                      required
                    >
                      <option value="">Select a channel</option>
                      {channelOptions.map((channel) => (
                        <option value={channel.id} key={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="peerCount">Peer Count *</label>
                  <input
                    type="number"
                    id="peerCount"
                    className="peer-input"
                    value={peerCount}
                    min={1}
                    onChange={(e) => setPeerCount(e.target.value)}
                    required
                    placeholder="Enter number of peers"
                    disabled={isLoading}
                  />
                </div>
              </>
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
                disabled={
                  isLoading ||
                  !organizationQuery.trim() ||
                  !selectedChannelId ||
                  !peerCount.trim()
                }
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






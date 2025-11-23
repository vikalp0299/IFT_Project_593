import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingEdits } from '../services/fileService';
import type { PendingEdit } from '../services/fileService';
import './PendingApprovalsPage.css';

const PendingApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadPendingEditsSafely = async () => {
      try {
        setLoading(true);
        setError(null);
        const edits = await getPendingEdits();
        if (isMounted) {
          setPendingEdits(edits);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load pending approvals');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadPendingEditsSafely();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleReviewProposal = (fileId: string, proposalId: string) => {
    navigate(`/proposal-review/${fileId}/${proposalId}`);
  };

  if (loading) {
    return (
      <div className="pending-approvals-page">
        <div className="loading">Loading pending approvals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pending-approvals-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="pending-approvals-page">
      <div className="page-header">
        <h1>Pending Approvals</h1>
        <p className="subtitle">
          Files awaiting your organization's approval for proposed edits
        </p>
        <button 
          onClick={() => navigate('/user/home')} 
          className="btn-home"
          style={{ marginTop: '10px' }}
        >
          ← Back to File Upload
        </button>
      </div>

      {pendingEdits.length === 0 ? (
        <div className="empty-state">
          <p>No pending approvals at the moment.</p>
        </div>
      ) : (
        <div className="pending-list">
          {pendingEdits.map((edit) => (
            <div key={`${edit.fileId}-${edit.proposalId}`} className="pending-card">
              <div className="file-info">
                <h3>{edit.filename}</h3>
                <div className="metadata">
                  <span className="file-size">{formatFileSize(edit.fileSize)}</span>
                  <span className="file-type">{edit.mimetype}</span>
                </div>
              </div>

              <div className="proposal-info">
                <div className="proposal-detail">
                  <label>Proposed by:</label>
                  <span>{edit.proposedBy}</span>
                </div>
                <div className="proposal-detail">
                  <label>Proposal ID:</label>
                  <span className="proposal-id">{edit.proposalId}</span>
                </div>
                <div className="proposal-detail">
                  <label>Status:</label>
                  <span className="status-badge">{edit.status}</span>
                </div>
              </div>

              <div className="approvals-section">
                <h4>Approvals:</h4>
                <div className="approvals-list">
                  {edit.approvals && edit.approvals.length > 0 ? (
                    edit.approvals.map((approval, idx) => (
                      <div key={idx} className="approval-item">
                        <span className="approval-org">{approval}</span>
                        <span className="approval-check">✓</span>
                      </div>
                    ))
                  ) : (
                    <span className="no-approvals">No approvals yet</span>
                  )}
                </div>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => handleReviewProposal(edit.fileId, edit.proposalId)}
                  className="btn-primary"
                >
                  Review Proposal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default PendingApprovalsPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProposalDetails, approveFileEdit, rejectFileEdit } from '../services/fileService';
import { calculateDiff, getSummary } from '../utils/diffUtils';
import DiffViewer from '../components/DiffViewer';
import type { ProposalDetails } from '../services/fileService';
import './ProposalReviewPage.css';

const ProposalReviewPage: React.FC = () => {
  const { fileId, proposalId } = useParams<{ fileId: string; proposalId: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [fileId, proposalId]);

  const loadProposal = async () => {
    if (!fileId || !proposalId) return;

    try {
      setLoading(true);
      setError(null);
      const details = await getProposalDetails(fileId, proposalId);
      setProposal(details);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load proposal details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!fileId || !proposalId) return;

    try {
      setSubmitting(true);
      setError(null);
      await approveFileEdit(fileId, proposalId);
      alert('Proposal approved successfully!');
      navigate('/pending-approvals');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!fileId || !proposalId) return;

    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await rejectFileEdit(fileId, proposalId, rejectReason);
      alert('Proposal rejected successfully');
      navigate('/pending-approvals');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="proposal-review-page">
        <div className="loading">Loading proposal...</div>
      </div>
    );
  }

  if (error && !proposal) {
    return (
      <div className="proposal-review-page">
        <div className="error">{error}</div>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="proposal-review-page">
        <div className="error">Proposal not found</div>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  const diffs = calculateDiff(proposal.originalContent, proposal.newContent);
  const summary = getSummary(diffs);

  return (
    <div className="proposal-review-page">
      <div className="page-header">
        <h1>Review Edit Proposal</h1>
        <div className="file-info">
          <h2>{proposal.filename}</h2>
          <div className="metadata">
            <span className="file-type">{proposal.mimetype}</span>
            <span className="separator">•</span>
            <span className="proposed-by">Proposed by: {proposal.proposedBy}</span>
            <span className="separator">•</span>
            <span className="proposed-date">{new Date(proposal.proposedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="approval-status">
        <h3>Approval Status</h3>
        <div className="approval-grid">
          {proposal.approvalStatus.map((status, idx) => (
            <div key={idx} className={`approval-item ${status.approved ? 'approved' : 'pending'}`}>
              <span className="org-name">{status.org}</span>
              <span className="approval-indicator">
                {status.approved ? '✓ Approved' : '⏳ Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="changes-summary">
        <h3>Changes Summary</h3>
        <div className="summary-stats">
          <div className="stat stat-added">
            <span className="stat-label">Lines Added</span>
            <span className="stat-value">+{summary.added}</span>
          </div>
          <div className="stat stat-removed">
            <span className="stat-label">Lines Removed</span>
            <span className="stat-value">-{summary.removed}</span>
          </div>
          <div className="stat stat-modified">
            <span className="stat-label">Lines Modified</span>
            <span className="stat-value">~{summary.modified}</span>
          </div>
        </div>
      </div>

      <div className="diff-section">
        <h3>Detailed Changes</h3>
        <DiffViewer diffs={diffs} oldFileLabel="Original File" newFileLabel="Proposed Changes" />
      </div>

      {!showRejectInput ? (
        <div className="action-buttons">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Back
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={submitting}
            className="btn-danger"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Approving...' : 'Approve'}
          </button>
        </div>
      ) : (
        <div className="reject-section">
          <h3>Reject Proposal</h3>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Please provide a reason for rejection..."
            className="reject-reason-input"
            rows={4}
          />
          <div className="reject-actions">
            <button
              onClick={() => {
                setShowRejectInput(false);
                setRejectReason('');
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
              className="btn-danger"
            >
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalReviewPage;

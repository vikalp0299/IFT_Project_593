import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFileContent, proposeFileEdit } from '../services/fileService';
import { calculateDiff, getSummary } from '../utils/diffUtils';
import DiffViewer from '../components/DiffViewer';
import './TextEditorPage.css';

interface PrivateKeyServerSession {
  baseUrl: string;
  token: string;
  user: any;
}

const TextEditorPage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  const [originalContent, setOriginalContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      if (!fileId) return;

      try {
        setLoading(true);
        setError(null);

        // Check if user has private-key-server session
        const sessionData = localStorage.getItem('privateKeyServerSession');
        console.log('Private-key-server session data:', sessionData ? 'exists' : 'missing');
        
        if (!sessionData) {
          setError('Please connect to Private-Key-Server first to edit files');
          setLoading(false);
          return;
        }

        const session: PrivateKeyServerSession = JSON.parse(sessionData);
        console.log('Parsed session:', {
          hasBaseUrl: !!session.baseUrl,
          hasToken: !!session.token,
          hasUser: !!session.user,
          baseUrl: session.baseUrl,
        });
        
        if (!session.token) {
          setError('Private-Key-Server session token is missing');
          setLoading(false);
          return;
        }

        console.log('Attempting to load file content...');
        const content = await getFileContent(fileId, session.token);
        console.log('File content loaded successfully');
        setOriginalContent(content);
        setEditedContent(content);
      } catch (err: any) {
        console.error('Error loading file:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [fileId]);

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!fileId) return;

    try {
      setSubmitting(true);
      setError(null);

      console.log('Preparing to submit proposal...');
      console.log('Original content length:', originalContent.length);
      console.log('Edited content length:', editedContent.length);

      // Convert the edited content to base64 for backend
      const blob = new Blob([editedContent], { type: 'text/plain' });
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      console.log('Base64 encoded file length:', base64String.length);
      console.log('Submitting proposal to fileId:', fileId);

      // Submit the proposal
      const result = await proposeFileEdit(fileId, originalContent, editedContent, base64String);
      
      console.log('Proposal created successfully:', result);

      // Navigate back to files list
      alert('Edit proposal created successfully!');
      navigate('/user/home');
    } catch (err: any) {
      console.error('Error submitting proposal:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      setError(err.response?.data?.message || err.message || 'Failed to submit edit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-editor-page">
        <div className="loading">Loading file...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-editor-page">
        <div className="error-container">
          <div className="error">{error}</div>
          {error.includes('Private-Key-Server') && (
            <div className="error-hint">
              <p>To edit files, you need to:</p>
              <ol>
                <li>Go back to the home page</li>
                <li>Click "Connect to Private-Key-Server" button in the header</li>
                <li>Enter your credentials</li>
                <li>Return here to edit the file</li>
              </ol>
            </div>
          )}
          <div className="error-actions">
            <button onClick={() => navigate(-1)} className="btn-secondary">
              Go Back
            </button>
            <button onClick={() => navigate('/user/home')} className="btn-primary">
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const diffs = calculateDiff(originalContent, editedContent);
  const summary = getSummary(diffs);
  const hasChanges = summary.added > 0 || summary.removed > 0 || summary.modified > 0;

  return (
    <div className="text-editor-page">
      <div className="editor-header">
        <h1>Edit File</h1>
        <div className="editor-actions">
          {!showPreview ? (
            <>
              <button onClick={() => navigate(-1)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={!hasChanges}
                className="btn-primary"
              >
                Preview Changes
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowPreview(false)} className="btn-secondary">
                Back to Editor
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !hasChanges}
                className="btn-primary"
              >
                {submitting ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!showPreview ? (
        <div className="editor-container">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="text-editor"
            placeholder="Edit your file here..."
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="preview-container">
          <div className="diff-summary">
            <h2>Changes Summary</h2>
            <div className="summary-stats">
              <span className="stat-added">+{summary.added} lines added</span>
              <span className="stat-removed">-{summary.removed} lines removed</span>
              <span className="stat-modified">~{summary.modified} lines modified</span>
            </div>
          </div>
          <DiffViewer diffs={diffs} oldFileLabel="Original" newFileLabel="Your Changes" />
        </div>
      )}
    </div>
  );
};

export default TextEditorPage;

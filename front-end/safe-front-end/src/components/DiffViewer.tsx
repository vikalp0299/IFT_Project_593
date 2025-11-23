import React from 'react';
import type { LineDiff } from '../utils/diffUtils';
import './DiffViewer.css';

interface DiffViewerProps {
  diffs: LineDiff[];
  oldFileLabel?: string;
  newFileLabel?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  diffs,
  oldFileLabel = 'Original',
  newFileLabel = 'Modified',
}) => {
  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-header-old">{oldFileLabel}</div>
        <div className="diff-header-new">{newFileLabel}</div>
      </div>
      <div className="diff-content">
        {diffs.map((diff, index) => (
          <div
            key={index}
            className={`diff-line diff-line-${diff.type}`}
          >
            <div className="diff-line-number">{diff.lineNumber}</div>
            <div className="diff-line-old">
              {diff.oldContent !== undefined ? (
                <span className={diff.type === 'removed' || diff.type === 'modified' ? 'highlight-removed' : ''}>
                  {diff.oldContent || '\u00A0'}
                </span>
              ) : (
                <span className="empty-line">\u00A0</span>
              )}
            </div>
            <div className="diff-line-new">
              {diff.newContent !== undefined ? (
                <span className={diff.type === 'added' || diff.type === 'modified' ? 'highlight-added' : ''}>
                  {diff.newContent || '\u00A0'}
                </span>
              ) : (
                <span className="empty-line">\u00A0</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiffViewer;

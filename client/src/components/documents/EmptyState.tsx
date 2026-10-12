import React from 'react';
import { FileText, Plus, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import './EmptyState.css';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onCreateNew?: () => void;
  onImport?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No documents found',
  description = 'Get started by creating your first document or importing an existing markdown file.',
  onCreateNew,
  onImport,
}) => {
  return (
    <div className="empty-state-card animate-fade-in">
      <div className="empty-state-icon-box">
        <FileText size={32} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      <div className="empty-state-actions">
        {onCreateNew && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={onCreateNew}>
            New document
          </Button>
        )}
        {onImport && (
          <Button variant="secondary" icon={<Upload size={16} />} onClick={onImport}>
            Import Markdown
          </Button>
        )}
      </div>
    </div>
  );
};

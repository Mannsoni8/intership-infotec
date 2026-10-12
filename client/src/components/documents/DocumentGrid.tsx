import React from 'react';
import { DocSummary } from '../../types';
import { DocumentCard } from './DocumentCard';
import './DocumentList.css';

interface DocumentGridProps {
  documents: DocSummary[];
  onRename: (doc: DocSummary) => void;
  onDelete: (id: string) => void;
  onLeave: (id: string) => void;
  onShare: (doc: DocSummary) => void;
}

export const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  onRename,
  onDelete,
  onLeave,
  onShare,
}) => {
  const getAccent = (index: number): 'blue' | 'sage' | 'rose' | 'default' => {
    const accents: ('blue' | 'sage' | 'rose' | 'default')[] = ['blue', 'sage', 'rose', 'default'];
    return accents[index % accents.length];
  };

  return (
    <div className="doc-grid">
      {documents.map((doc, index) => (
        <DocumentCard
          key={doc._id}
          doc={doc}
          accentVariant={getAccent(index)}
          onRename={onRename}
          onDelete={onDelete}
          onLeave={onLeave}
          onShare={onShare}
        />
      ))}
    </div>
  );
};

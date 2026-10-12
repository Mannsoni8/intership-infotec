import React, { useState } from 'react';
import { DocSummary } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface RenameDocumentDialogProps {
  isOpen: boolean;
  doc: DocSummary | null;
  onClose: () => void;
  onSubmit: (id: string, newTitle: string) => Promise<void>;
}

export const RenameDocumentDialog: React.FC<RenameDocumentDialogProps> = ({
  isOpen,
  doc,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState(doc?.title || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setError('');
    }
  }, [doc]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    if (title.trim() === doc.title) {
      onClose();
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit(doc._id, title.trim());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!doc}
      onClose={onClose}
      title="Rename document"
      description="Update the document's name across all collaborators."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="New document title"
          value={title}
          maxLength={120}
          error={error}
          autoFocus
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || !title.trim()}>
            {loading ? 'Saving...' : 'Rename'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

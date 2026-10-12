import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CreateDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => Promise<void>;
}

export const CreateDocumentDialog: React.FC<CreateDocumentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await onSubmit(title.trim());
      setTitle('');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create new document"
      description="Give your document a clear title to collaborate in real-time."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Document title"
          placeholder="e.g. Q3 Architecture Proposal"
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
            {loading ? 'Creating...' : 'Create document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

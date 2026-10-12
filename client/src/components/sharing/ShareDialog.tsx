import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Trash2, Mail, ShieldAlert } from 'lucide-react';
import { DocInfo, DocSummary } from '../../types';
import { api } from '../../api';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import './ShareDialog.css';

interface ShareDialogProps {
  isOpen: boolean;
  docSummary: DocSummary | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  docSummary,
  onClose,
  onUpdated,
}) => {
  const [docInfo, setDocInfo] = useState<DocInfo | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && docSummary) {
      setLoading(true);
      setError('');
      setSuccess('');
      api
        .getDoc(docSummary._id)
        .then((info) => setDocInfo(info))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, docSummary]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docSummary || !email.trim()) return;

    try {
      setSharing(true);
      setError('');
      setSuccess('');
      const updated = await api.shareDoc(docSummary._id, email.trim());
      setDocInfo(updated);
      setEmail('');
      setSuccess('Collaborator added successfully!');
      onUpdated?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!docSummary) return;
    try {
      setError('');
      const updated = await api.unshareDoc(docSummary._id, userId);
      setDocInfo(updated);
      setSuccess('Collaborator removed.');
      onUpdated?.();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!docSummary}
      onClose={onClose}
      title="Share document"
      description={`Manage collaborator access for "${docSummary?.title}"`}
      maxWidth="540px"
    >
      <div className="share-dialog-content">
        {docInfo?.role === 'owner' && (
          <form onSubmit={handleShare} className="share-invite-form">
            <Input
              type="email"
              placeholder="Enter registered user's email..."
              value={email}
              icon={<Mail size={16} />}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
                if (success) setSuccess('');
              }}
            />
            <Button
              type="submit"
              variant="primary"
              icon={<UserPlus size={16} />}
              disabled={sharing || !email.trim()}
            >
              {sharing ? 'Inviting...' : 'Invite'}
            </Button>
          </form>
        )}

        {error && <div className="share-alert error"><ShieldAlert size={16} /><span>{error}</span></div>}
        {success && <div className="share-alert success"><UserCheck size={16} /><span>{success}</span></div>}

        <div className="collaborators-list-section">
          <h4 className="collaborators-header">People with access</h4>
          {loading ? (
            <p className="loading-muted">Loading collaborator list...</p>
          ) : docInfo ? (
            <div className="collaborator-items">
              <div className="collaborator-item owner">
                <div className="collaborator-avatar">
                  {docInfo.owner.name.charAt(0).toUpperCase()}
                </div>
                <div className="collaborator-details">
                  <span className="collaborator-name">{docInfo.owner.name}</span>
                  <span className="collaborator-sub">Owner</span>
                </div>
                <span className="role-tag owner">Owner</span>
              </div>

              {docInfo.collaborators.length === 0 ? (
                <p className="no-collabs-text">No other collaborators yet. Invite someone using their email above.</p>
              ) : (
                docInfo.collaborators.map((collab) => (
                  <div key={collab.id} className="collaborator-item">
                    <div className="collaborator-avatar col-guest">
                      {collab.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="collaborator-details">
                      <span className="collaborator-name">{collab.name}</span>
                      <span className="collaborator-sub">{collab.email || 'Collaborator'}</span>
                    </div>
                    {docInfo.role === 'owner' && (
                      <button
                        className="remove-collab-btn"
                        onClick={() => handleRemove(collab.id)}
                        title="Revoke access"
                        aria-label="Revoke collaborator access"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

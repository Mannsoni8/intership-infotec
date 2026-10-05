import { FormEvent, useState } from 'react';
import { api } from '../api';
import { DocInfo } from '../types';

interface Props {
  info: DocInfo;
  onChange: (info: DocInfo) => void;
}

// the owner of a document adds / removes collaborators here
function SharePanel({ info, onChange }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleShare = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      onChange(await api.shareDoc(info._id, email.trim()));
      setEmail('');
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      onChange(await api.unshareDoc(info._id, userId));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="panel">
      <h3>Share this document</h3>
      <form className="inline-form" onSubmit={handleShare}>
        <input
          type="email"
          placeholder="Email of a registered user"
          value={email}
          maxLength={254}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          Share
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <ul className="people">
        <li>
          <strong>{info.owner.name}</strong> <span className="muted">(owner)</span>
        </li>
        {info.collaborators.map((person) => (
          <li key={person.id}>
            <strong>{person.name}</strong> <span className="muted">{person.email}</span>
            <button type="button" className="link-button" onClick={() => handleRemove(person.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SharePanel;

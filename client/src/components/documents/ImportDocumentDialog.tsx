import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface ImportDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, markdown: string) => Promise<void>;
}

export const ImportDocumentDialog: React.FC<ImportDocumentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200000) {
      setError('File size exceeds the 200 KB limit.');
      return;
    }

    if (!title) {
      setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMarkdown(String(reader.result || ''));
      setError('');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!markdown.trim()) {
      setError('Markdown content is empty');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(title.trim(), markdown);
      setTitle('');
      setMarkdown('');
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
      title="Import Markdown document"
      description="Upload a markdown file or paste markdown syntax directly."
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Document title"
          placeholder="e.g. Project Readme"
          value={title}
          maxLength={120}
          required
          onChange={(e) => setTitle(e.target.value)}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="input-label" style={{ fontSize: '13px', fontWeight: 500 }}>
            Choose Markdown file (.md, .txt)
          </label>
          <input
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={handleFileUpload}
            style={{
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              backgroundColor: 'var(--canvas)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="input-label" style={{ fontSize: '13px', fontWeight: 500 }}>
            Or paste markdown content
          </label>
          <textarea
            value={markdown}
            placeholder="# Project Title&#10;&#10;Write markdown blocks here..."
            rows={7}
            maxLength={200000}
            onChange={(e) => setMarkdown(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              resize: 'vertical',
              outline: 'none',
              backgroundColor: 'var(--canvas)',
            }}
          />
        </div>

        {error && <span style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</span>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={<Upload size={16} />}
            disabled={loading || !title.trim() || !markdown.trim()}
          >
            {loading ? 'Importing...' : 'Import document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

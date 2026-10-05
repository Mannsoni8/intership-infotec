import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { DocSummary } from '../types';

function DocumentList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [markdown, setMarkdown] = useState('');

  const loadDocs = async () => {
    try {
      setDocs(await api.listDocs());
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocs();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const doc = await api.createDoc(title);
      setTitle('');
      navigate(`/doc/${doc._id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const doc = await api.importMarkdown(importTitle, markdown);
      navigate(`/doc/${doc._id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // read a .md file from the computer
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200000) {
      setError('This file is too big (max 200 KB)');
      return;
    }
    if (!importTitle) setImportTitle(file.name.replace(/\.(md|markdown|txt)$/i, ''));
    const reader = new FileReader();
    reader.onload = () => setMarkdown(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document for everyone?')) return;
    try {
      await api.deleteDoc(id);
      void loadDocs();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLeave = async (id: string) => {
    if (!user || !window.confirm('Leave this document?')) return;
    try {
      await api.unshareDoc(id, user.id);
      void loadDocs();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h1>My Documents</h1>

      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Title of new document" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit">Create</button>
        <button type="button" className="secondary" onClick={() => setShowImport((v) => !v)}>
          Import Markdown
        </button>
      </form>

      {showImport && (
        <form className="panel" onSubmit={handleImport}>
          <h3>Import Markdown</h3>
          <input placeholder="Title" value={importTitle} maxLength={120} onChange={(e) => setImportTitle(e.target.value)} />
          <input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={handleFile} />
          <textarea
            className="import-text"
            placeholder="...or paste Markdown here (# headings, - lists, > quotes, ``` code)"
            value={markdown}
            maxLength={200000}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <button type="submit" disabled={!importTitle.trim() || !markdown.trim()}>
            Import
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && docs.length === 0 && <p className="muted">No documents yet. Create one above.</p>}

      <ul className="doc-list">
        {docs.map((doc) => (
          <li key={doc._id} className="doc-item">
            <Link to={`/doc/${doc._id}`} className="doc-link">
              <span className="doc-title">{doc.title}</span>
              <span className="muted">
                {doc.role === 'owner' ? 'Owned by you' : `Shared by ${doc.ownerName}`} - {doc.blockCount} blocks - updated{' '}
                {new Date(doc.updatedAt).toLocaleString()}
              </span>
            </Link>
            {doc.role === 'owner' ? (
              <button className="danger" onClick={() => handleDelete(doc._id)}>
                Delete
              </button>
            ) : (
              <button className="secondary" onClick={() => handleLeave(doc._id)}>
                Leave
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DocumentList;

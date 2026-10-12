import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  MoreVertical,
  Edit2,
  Trash2,
  Share2,
  Download,
  Users,
  Clock,
  LogOut,
} from 'lucide-react';
import { DocSummary } from '../../types';
import { downloadExport } from '../../api';
import './DocumentCard.css';

interface DocumentCardProps {
  doc: DocSummary;
  onRename: (doc: DocSummary) => void;
  onDelete: (id: string) => void;
  onLeave: (id: string) => void;
  onShare: (doc: DocSummary) => void;
  accentVariant?: 'blue' | 'sage' | 'rose' | 'default';
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onRename,
  onDelete,
  onLeave,
  onShare,
  accentVariant = 'default',
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: 'pdf' | 'html' | 'md') => {
    try {
      setExporting(true);
      await downloadExport(doc._id, format, doc.title);
      setMenuOpen(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const isOwner = doc.role === 'owner';

  return (
    <div
      className={`doc-card accent-${accentVariant}`}
      onClick={() => navigate(`/doc/${doc._id}`)}
    >
      <div className="doc-card-top">
        <div className="doc-card-icon-tag">
          <FileText size={20} className="doc-card-icon" />
          <span className={`doc-role-pill ${doc.role}`}>
            {isOwner ? 'Owner' : 'Shared'}
          </span>
        </div>

        <div className="doc-card-actions" onClick={(e) => e.stopPropagation()} ref={menuRef}>
          <button
            className="card-menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Document actions"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="card-dropdown-menu animate-fade-in">
              {isOwner && (
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onRename(doc);
                  }}
                >
                  <Edit2 size={14} />
                  <span>Rename</span>
                </button>
              )}

              {isOwner && (
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onShare(doc);
                  }}
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
              )}

              <div className="dropdown-divider" />
              <div className="dropdown-label">Export</div>
              
              <button
                className="dropdown-item"
                disabled={exporting}
                onClick={() => handleExport('pdf')}
              >
                <Download size={14} />
                <span>PDF (.pdf)</span>
              </button>

              <button
                className="dropdown-item"
                disabled={exporting}
                onClick={() => handleExport('html')}
              >
                <Download size={14} />
                <span>HTML (.html)</span>
              </button>

              <button
                className="dropdown-item"
                disabled={exporting}
                onClick={() => handleExport('md')}
              >
                <Download size={14} />
                <span>Markdown (.md)</span>
              </button>

              <div className="dropdown-divider" />

              {isOwner ? (
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(doc._id);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              ) : (
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onLeave(doc._id);
                  }}
                >
                  <LogOut size={14} />
                  <span>Leave document</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="doc-card-body">
        <h3 className="doc-card-title" title={doc.title}>
          {doc.title}
        </h3>
      </div>

      <div className="doc-card-footer">
        <div className="doc-meta-item" title={`Owner: ${doc.ownerName}`}>
          <Users size={13} />
          <span>{isOwner ? 'You' : doc.ownerName}</span>
        </div>
        <div className="doc-meta-item" title={new Date(doc.updatedAt).toLocaleString()}>
          <Clock size={13} />
          <span>
            {new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="doc-block-badge">
          {doc.blockCount} {doc.blockCount === 1 ? 'block' : 'blocks'}
        </div>
      </div>
    </div>
  );
};

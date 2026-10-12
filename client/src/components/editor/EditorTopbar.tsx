import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Share2,
  Download,
  LogOut,
  Check,
} from 'lucide-react';
import { DocInfo } from '../../types';
import { Button } from '../ui/Button';
import './EditorTopbar.css';

interface EditorTopbarProps {
  info: DocInfo | null;
  onRename: (newTitle: string) => Promise<void>;
  onShare: () => void;
  onExport: (format: 'pdf' | 'html' | 'md') => Promise<void>;
  onLeave: () => Promise<void>;
  statusIndicator: React.ReactNode;
}

export const EditorTopbar: React.FC<EditorTopbarProps> = ({
  info,
  onRename,
  onShare,
  onExport,
  onLeave,
  statusIndicator,
}) => {
  const navigate = useNavigate();
  const [titleDraft, setTitleDraft] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  React.useEffect(() => {
    if (info) setTitleDraft(info.title);
  }, [info]);

  const handleTitleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!info || info.role !== 'owner' || !titleDraft.trim() || titleDraft.trim() === info.title) {
      return;
    }
    await onRename(titleDraft.trim());
  };

  const isOwner = info?.role === 'owner';

  return (
    <header className="editor-topbar">
      <div className="topbar-left">
        <button
          className="back-to-docs-btn"
          onClick={() => navigate('/')}
          title="Back to workspace"
          aria-label="Back to workspace"
        >
          <ChevronLeft size={18} />
          <span>Workspace</span>
        </button>

        <div className="document-title-container">
          {isOwner ? (
            <form onSubmit={handleTitleSubmit}>
              <input
                className="topbar-title-input"
                value={titleDraft}
                maxLength={120}
                placeholder="Untitled document"
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => void handleTitleSubmit()}
                aria-label="Document title"
              />
            </form>
          ) : (
            <h1 className="topbar-title-static">{info?.title || 'Loading document...'}</h1>
          )}
          <span className="save-status-text">
            <Check size={12} /> Synced
          </span>
        </div>
      </div>

      <div className="topbar-center">
        {statusIndicator}
      </div>

      <div className="topbar-right">
        {isOwner && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Share2 size={15} />}
            onClick={onShare}
          >
            Share
          </Button>
        )}

        <div className="export-dropdown-wrapper">
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={15} />}
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
          >
            Export
          </Button>

          {exportMenuOpen && (
            <div className="export-menu-popup animate-fade-in">
              <button
                className="export-menu-item"
                onClick={() => {
                  setExportMenuOpen(false);
                  onExport('pdf');
                }}
              >
                PDF document (.pdf)
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  setExportMenuOpen(false);
                  onExport('html');
                }}
              >
                Web page (.html)
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  setExportMenuOpen(false);
                  onExport('md');
                }}
              >
                Markdown file (.md)
              </button>
            </div>
          )}
        </div>

        {info && !isOwner && (
          <Button
            variant="danger"
            size="sm"
            icon={<LogOut size={15} />}
            onClick={onLeave}
          >
            Leave
          </Button>
        )}
      </div>
    </header>
  );
};

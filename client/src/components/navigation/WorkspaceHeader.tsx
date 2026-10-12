import React from 'react';
import { Search, Plus, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import './WorkspaceHeader.css';

interface WorkspaceHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewDoc: () => void;
  onToggleMobileMenu?: () => void;
  greeting?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onNewDoc,
  onToggleMobileMenu,
  greeting = 'Good afternoon',
}) => {
  return (
    <header className="workspace-header">
      <div className="header-left">
        {onToggleMobileMenu && (
          <button
            className="mobile-menu-trigger"
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="header-greeting-block">
          <span className="header-greeting-sub">{greeting}</span>
          <h1 className="header-title">Your workspace</h1>
        </div>
      </div>

      <div className="header-center">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search documents by title or owner..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={onNewDoc}>
          New document
        </Button>
      </div>
    </header>
  );
};

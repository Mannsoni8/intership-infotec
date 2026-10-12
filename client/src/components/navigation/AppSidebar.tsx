import {
  FileText,
  Users,
  Clock,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AppSidebar.css';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeFilter: 'all' | 'recent' | 'shared';
  onFilterChange: (filter: 'all' | 'recent' | 'shared') => void;
  onNewDoc: () => void;
  onImportDoc: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeFilter,
  onFilterChange,
  onNewDoc,
  onImportDoc,
}) => {
  const { user, logout } = useAuth();

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="brand-logo-mark">
            <span className="brand-logo-inner">S</span>
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-name">SyncDoc</span>
              <span className="brand-tag">Workspace</span>
            </div>
          )}
        </div>
        <button
          className="collapse-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="sidebar-actions">
        <button
          className="action-btn-primary"
          onClick={onNewDoc}
          title="Create document"
        >
          <Plus size={18} />
          {!collapsed && <span>New document</span>}
        </button>

        <button
          className="action-btn-secondary"
          onClick={onImportDoc}
          title="Import markdown"
        >
          <Upload size={16} />
          {!collapsed && <span>Import Markdown</span>}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">{!collapsed && 'Documents'}</div>
        <button
          className={`nav-item ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
          title="All Documents"
        >
          <FileText size={18} />
          {!collapsed && <span>All Documents</span>}
        </button>

        <button
          className={`nav-item ${activeFilter === 'recent' ? 'active' : ''}`}
          onClick={() => onFilterChange('recent')}
          title="Recently Opened"
        >
          <Clock size={18} />
          {!collapsed && <span>Recently Opened</span>}
        </button>

        <button
          className={`nav-item ${activeFilter === 'shared' ? 'active' : ''}`}
          onClick={() => onFilterChange('shared')}
          title="Shared with you"
        >
          <Users size={18} />
          {!collapsed && <span>Shared with you</span>}
        </button>
      </nav>

      <div className="sidebar-bottom">
        {user && (
          <div className="user-profile-tile">
            <div
              className="user-avatar"
              style={{ backgroundColor: user.color || '#3b82f6' }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            )}
            <button
              className="logout-btn"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

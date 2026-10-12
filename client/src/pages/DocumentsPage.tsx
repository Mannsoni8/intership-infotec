import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { WorkspaceHeader } from '../components/navigation/WorkspaceHeader';
import { DocumentGrid } from '../components/documents/DocumentGrid';
import { EmptyState } from '../components/documents/EmptyState';
import { LoadingSkeleton } from '../components/documents/LoadingSkeleton';
import { CreateDocumentDialog } from '../components/documents/CreateDocumentDialog';
import { ImportDocumentDialog } from '../components/documents/ImportDocumentDialog';
import { RenameDocumentDialog } from '../components/documents/RenameDocumentDialog';
import { ShareDialog } from '../components/sharing/ShareDialog';
import { api } from '../api';
import { DocSummary } from '../types';
import './DocumentsPage.css';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation & Filter state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [renameDoc, setRenameDoc] = useState<DocSummary | null>(null);
  const [shareDoc, setShareDoc] = useState<DocSummary | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.listDocs();
      setDocs(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, []);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    let list = [...docs];

    // Filter by category
    if (activeFilter === 'recent') {
      // Sort by recent and take top 8
      list = [...list].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 8);
    } else if (activeFilter === 'shared') {
      list = list.filter((d) => d.role === 'collaborator');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) => d.title.toLowerCase().includes(q) || d.ownerName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [docs, activeFilter, searchQuery]);

  // Actions
  const handleCreateDocument = async (title: string) => {
    const doc = await api.createDoc(title);
    navigate(`/doc/${doc._id}`);
  };

  const handleImportDocument = async (title: string, markdown: string) => {
    const doc = await api.importMarkdown(title, markdown);
    navigate(`/doc/${doc._id}`);
  };

  const handleRenameDocument = async (id: string, newTitle: string) => {
    await api.renameDoc(id, newTitle);
    await fetchDocuments();
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document permanently?')) return;
    try {
      await api.deleteDoc(id);
      await fetchDocuments();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleLeaveDocument = async (id: string) => {
    if (!window.confirm('Leave this shared document? You will lose access.')) return;
    try {
      // Find current user id from me or context
      const meRes = await api.me();
      await api.unshareDoc(id, meRes.user.id);
      await fetchDocuments();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="workspace-layout">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeFilter={activeFilter}
        onFilterChange={(f) => {
          setActiveFilter(f);
          setMobileMenuOpen(false);
        }}
        onNewDoc={() => setCreateDialogOpen(true)}
        onImportDoc={() => setImportDialogOpen(true)}
      />

      <div className="workspace-main-area">
        <WorkspaceHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewDoc={() => setCreateDialogOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="workspace-content">
          <div className="workspace-header-section">
            <div>
              <h2 className="section-title">
                {activeFilter === 'all'
                  ? 'All Documents'
                  : activeFilter === 'recent'
                  ? 'Recently Opened'
                  : 'Shared with You'}
              </h2>
              <p className="section-subtitle">
                {activeFilter === 'all'
                  ? 'Manage, organize and collaborate on living documents'
                  : activeFilter === 'recent'
                  ? 'Pick up where you left off recently'
                  : 'Documents owned by other team members'}
              </p>
            </div>
            <span className="doc-count-badge">
              {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
            </span>
          </div>

          {error && <div className="workspace-error-banner">{error}</div>}

          {loading ? (
            <LoadingSkeleton />
          ) : filteredDocs.length === 0 ? (
            <EmptyState
              title={searchQuery ? 'No documents match your query' : 'No documents in this view'}
              description={
                searchQuery
                  ? `Try clearing your search "${searchQuery}" or creating a new document.`
                  : activeFilter === 'shared'
                  ? 'Documents shared with you by other collaborators will appear here.'
                  : 'Start by creating your first document or importing a markdown file.'
              }
              onCreateNew={() => setCreateDialogOpen(true)}
              onImport={() => setImportDialogOpen(true)}
            />
          ) : (
            <DocumentGrid
              documents={filteredDocs}
              onRename={(doc) => setRenameDoc(doc)}
              onDelete={handleDeleteDocument}
              onLeave={handleLeaveDocument}
              onShare={(doc) => setShareDoc(doc)}
            />
          )}
        </main>
      </div>

      {/* Dialogs */}
      <CreateDocumentDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateDocument}
      />

      <ImportDocumentDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSubmit={handleImportDocument}
      />

      <RenameDocumentDialog
        isOpen={!!renameDoc}
        doc={renameDoc}
        onClose={() => setRenameDoc(null)}
        onSubmit={handleRenameDocument}
      />

      <ShareDialog
        isOpen={!!shareDoc}
        docSummary={shareDoc}
        onClose={() => setShareDoc(null)}
        onUpdated={fetchDocuments}
      />
    </div>
  );
};

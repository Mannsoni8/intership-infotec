import React from 'react';
import { Type, Heading, List, Quote, Code } from 'lucide-react';
import { BlockType } from '../../types';
import './BlockToolbar.css';

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void;
  disabled?: boolean;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({ onAddBlock, disabled }) => {
  const tools: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'paragraph', label: 'Text', icon: <Type size={15} /> },
    { type: 'heading', label: 'Heading', icon: <Heading size={15} /> },
    { type: 'listItem', label: 'List', icon: <List size={15} /> },
    { type: 'quote', label: 'Quote', icon: <Quote size={15} /> },
    { type: 'codeBlock', label: 'Code', icon: <Code size={15} /> },
  ];

  return (
    <div className="block-toolbar-strip animate-fade-in">
      <span className="toolbar-label">Add block:</span>
      <div className="toolbar-buttons-cluster">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className="toolbar-action-chip"
            disabled={disabled}
            onClick={() => onAddBlock(tool.type)}
            title={`Insert ${tool.label} block`}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

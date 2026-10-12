import React from 'react';
import './LoadingSkeleton.css';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="skeleton-grid">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-header">
            <div className="skeleton-tag shimmer" />
            <div className="skeleton-circle shimmer" />
          </div>
          <div className="skeleton-title shimmer" />
          <div className="skeleton-footer shimmer" />
        </div>
      ))}
    </div>
  );
};

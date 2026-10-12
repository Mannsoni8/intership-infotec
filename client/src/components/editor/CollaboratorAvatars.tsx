import React from 'react';
import { Peer, ConnectionStatus } from '../../types';
import './CollaboratorAvatars.css';

interface CollaboratorAvatarsProps {
  peers: Peer[];
  myClientId: number | null;
  status: ConnectionStatus;
}

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  peers,
  myClientId,
  status,
}) => {
  return (
    <div className="presence-avatars-cluster">
      <div className={`connection-pill ${status}`}>
        <span className="connection-dot" />
        <span className="connection-label">
          {status === 'connected'
            ? 'Live'
            : status === 'connecting'
            ? 'Connecting'
            : status === 'denied'
            ? 'Access denied'
            : 'Offline'}
        </span>
      </div>

      <div className="avatar-stack">
        {peers.map((peer) => (
          <div
            key={peer.clientId}
            className={`peer-avatar-bubble ${peer.clientId === myClientId ? 'is-me' : ''}`}
            style={{ backgroundColor: peer.color }}
            title={`${peer.name}${peer.clientId === myClientId ? ' (You)' : ''}`}
          >
            {peer.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      <span className="online-count-text">
        {peers.length} {peers.length === 1 ? 'collaborator' : 'collaborators'}
      </span>
    </div>
  );
};

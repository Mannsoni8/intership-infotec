import { Peer, ConnectionStatus } from '../types';

interface Props {
  peers: Peer[];
  myClientId: number | null;
  status: ConnectionStatus;
}

// shows the connection status and the users who are online
function PresenceBar({ peers, myClientId, status }: Props) {
  return (
    <div className="presence-bar">
      <span className={`status status-${status}`}>{status}</span>
      <div className="peers">
        {peers.map((peer) => (
          <span key={peer.clientId} className="peer" style={{ background: peer.color }} title={peer.name}>
            {peer.name}
            {peer.clientId === myClientId ? ' (you)' : ''}
          </span>
        ))}
      </div>
      <span className="muted">{peers.length} online</span>
    </div>
  );
}

export default PresenceBar;

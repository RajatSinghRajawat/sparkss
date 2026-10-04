import { Play } from 'lucide-react';
import Badge from './Badge';
import Modal from './Modal';
import { formatDuration } from '../../utils/media';

// Shared pieces for admin profile pages (teacher / student): media grids,
// play button, badges and the video player popup.

export const ContentGrid = ({ items, empty, min, children }) =>
  !items || items.length === 0 ? (
    <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>{empty}</div>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}, 1fr))`, gap: '18px' }}>
      {items.map(children)}
    </div>
  );

export const PlayButton = ({ onClick, color }) => (
  <button
    onClick={onClick}
    className="btn"
    title="Play"
    style={{
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: color,
      color: '#fff',
      position: 'relative',
      zIndex: 2,
      boxShadow: '0 0 16px rgba(0,0,0,0.5)',
    }}
  >
    <Play size={20} fill="currentColor" />
  </button>
);

export const DurationBadge = ({ seconds }) =>
  seconds > 0 ? (
    <span
      style={{
        position: 'absolute',
        right: '8px',
        bottom: '8px',
        zIndex: 2,
        padding: '2px 8px',
        borderRadius: '6px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '0.72rem',
        fontWeight: 600,
      }}
    >
      {formatDuration(seconds)}
    </span>
  ) : null;

export const HiddenBadge = () => (
  <span style={{ position: 'absolute', left: '8px', top: '8px', zIndex: 2 }}>
    <Badge variant="inactive">Hidden</Badge>
  </span>
);

/** Video player popup; `player` = { url, title, vertical } or null. */
export const VideoPlayerModal = ({ player, onClose }) => (
  <Modal
    isOpen={!!player}
    onClose={onClose}
    title={player?.title || 'Video'}
    maxWidth={player?.vertical ? '420px' : '820px'}
  >
    {player && (
      <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#000' }}>
        <video src={player.url} controls autoPlay style={{ width: '100%', maxHeight: '70vh', display: 'block' }} />
      </div>
    )}
  </Modal>
);

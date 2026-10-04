import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderTree, Plus, Search, Layers, PlaySquare } from 'lucide-react';
import Modal from '../components/common/Modal';
import MediaThumb from '../components/common/MediaThumb';
import { endpoints, safeList } from '../services/api';

const PlaylistsPage = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({ name: '', description: '' });
  // Real image file uploaded through the backend. The old "Banner Image URL"
  // was sent as an S3 key, so any pasted URL produced a broken banner; the
  // category field was never saved (playlists have no category).
  const [bannerFile, setBannerFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const playRes = await endpoints.playlists.getAll({ search: search || undefined });
      setPlaylists(safeList(playRes));
    } catch (err) {
      console.error('Failed to load playlists:', err);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchPlaylists, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let bannerKey;
      if (bannerFile) {
        const fd = new FormData();
        fd.append('banner', bannerFile);
        const up = await endpoints.playlists.uploadBanner(fd);
        bannerKey = up.data?.data?.banner?.key;
        if (!bannerKey) throw new Error('Banner upload failed.');
      }
      const res = await endpoints.playlists.create({
        name: formData.name.trim(),
        description: formData.description,
        bannerKey,
      });
      if (res.data?.success) {
        setShowAddModal(false);
        setFormData({ name: '', description: '' });
        setBannerFile(null);
        fetchPlaylists();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create playlist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderTree size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Curated Video Playlists
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Group video lessons into structured learning series ({playlists.length} playlists)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              className="input-control"
              placeholder="Search playlists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> New Playlist
          </button>
        </div>
      </div>

      {/* Playlists Grid */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading playlists...
        </div>
      ) : playlists.length === 0 ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <PlaySquare size={40} style={{ color: 'var(--text-dim)', marginBottom: '10px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No playlists found.</p>
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowAddModal(true)}>
            Create First Playlist
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {playlists.map((playlist) => (
            <div
              key={playlist._id}
              className="card card-hover"
              style={{ overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => navigate(`/playlists/${playlist._id}`)}
              title="Open playlist details"
            >
              <MediaThumb thumbnail={playlist.banner} height="140px" background="rgba(19, 28, 49, 0.8)">
                {!playlist.banner && (
                  <Layers size={32} style={{ color: 'var(--primary)', position: 'relative', zIndex: 1 }} />
                )}
              </MediaThumb>

              <div style={{ padding: '20px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  {playlist.teacherName ? `Instructor: ${playlist.teacherName}` : 'Admin Playlist'}
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '4px 0 8px' }}>
                  {playlist.name || playlist.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {playlist.description || 'Curated video syllabus series.'}
                </p>

                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--card-border)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Created {playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString() : 'Active'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Playlist Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create Curated Playlist">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Playlist Title *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Masterclass on Calculus"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              className="input-control"
              rows={3}
              placeholder="Outline what students will learn across this series..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Banner Image (optional, max 5MB)
            </label>
            <input
              type="file"
              className="input-control"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Save Playlist'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlaylistsPage;

import { useState, useEffect } from 'react';
import { Film, Plus, Play, Search, Eye, Heart } from 'lucide-react';
import Modal from '../components/common/Modal';
import MediaThumb from '../components/common/MediaThumb';
import { readVideoDuration } from '../utils/media';
import { endpoints, safeList } from '../services/api';

const EMPTY_FORM = { title: '', description: '', category: '', duration: 30 };

const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  // Real files, uploaded through the backend. The form used to ask for a raw
  // S3 key (defaulting to a sample that doesn't exist), creating broken reels.
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');

  const fetchReels = async () => {
    setLoading(true);
    try {
      const [reelsRes, catRes] = await Promise.all([
        endpoints.reels.getAll({ search: search || undefined }),
        // Admin reels must use the admin's own categories (the backend rejects
        // a teacher's category), so only list those.
        endpoints.categories.getAll({ teacherId: '__admin__', limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);
      setReels(safeList(reelsRes));
      setCategories(safeList(catRes));
    } catch (err) {
      console.error('Failed to load reels:', err);
      setReels([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchReels, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.category && categories.length === 0) {
      alert('Please create at least one category first before uploading reels.');
      return;
    }
    if (!videoFile) {
      alert('Please choose a video file.');
      return;
    }
    setSubmitting(true);
    try {
      setProgress('Uploading video...');
      const fd = new FormData();
      fd.append('video', videoFile);
      if (thumbFile) fd.append('thumbnail', thumbFile);
      const up = await endpoints.reels.upload(fd);
      const { videoKey, thumbnailKey } = up.data?.data ?? {};
      if (!videoKey) throw new Error('Upload failed: no video key returned.');

      setProgress('Saving reel...');
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim(),
        category: formData.category || categories[0]?._id,
        videoKey,
        thumbnailKey: thumbnailKey || undefined,
        duration: Number(formData.duration) || 0,
      };
      const res = await endpoints.reels.create(payload);
      if (res.data?.success) {
        setShowAddModal(false);
        setFormData(EMPTY_FORM);
        setVideoFile(null);
        setThumbFile(null);
        fetchReels();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create reel');
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  const handleVideoPick = async (file) => {
    setVideoFile(file || null);
    if (file) {
      const secs = await readVideoDuration(file);
      if (secs > 0) setFormData((f) => ({ ...f, duration: secs }));
    }
  };

  const handlePreviewVideo = async (reelId, fallbackUrl) => {
    if (fallbackUrl) {
      setActiveVideoUrl(fallbackUrl);
      return;
    }
    try {
      const res = await endpoints.reels.getVideoUrl(reelId);
      // Backend field is `videoUrl`; reading only `url` made every preview fail.
      const url = res.data?.data?.videoUrl || res.data?.data?.url;
      if (url) {
        setActiveVideoUrl(url);
      } else {
        alert('No playable stream URL available for this reel.');
      }
    } catch {
      alert('Could not generate presigned video stream for this reel.');
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
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#fb7185',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Film size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Short Educational Reels
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Bite-sized microlearning videos for the mobile student feed ({reels.length} reels)
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
              placeholder="Search reels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Upload Reel
          </button>
        </div>
      </div>

      {/* Reels Grid */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading reels...
        </div>
      ) : reels.length === 0 ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <Film size={40} style={{ color: 'var(--text-dim)', marginBottom: '10px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No short reels published yet.</p>
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowAddModal(true)}>
            Upload First Reel
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '18px' }}>
          {reels.map((reel) => (
            <div key={reel._id} className="card card-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <MediaThumb thumbnail={reel.thumbnail} videoUrl={reel.videoUrl} height="280px">
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.25)' }} />
                <button
                  onClick={() => handlePreviewVideo(reel._id, reel.videoUrl)}
                  className="btn"
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'rgba(244, 63, 94, 0.9)',
                    color: '#ffffff',
                    boxShadow: '0 0 15px rgba(244, 63, 94, 0.5)',
                    position: 'relative',
                    zIndex: 2,
                  }}
                  title="Watch Reel"
                >
                  <Play size={20} fill="currentColor" />
                </button>
              </MediaThumb>

              <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    <span>{reel.teacherName || 'Admin'}</span>
                    <span>{reel.duration ? `${reel.duration}s` : 'Short'}</span>
                  </div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', lineHeight: 1.3 }}>
                    {reel.title || 'Educational Short'}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {reel.description || 'Quick learning concept.'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--card-border)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={12} /> {reel.views || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Heart size={12} style={{ color: '#fb7185' }} /> {reel.likes || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Reel Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Upload Educational Short Reel">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Reel Title *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Quick Trick to Solve Thermodynamics"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Category *
            </label>
            <select
              className="input-control"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">{categories.length === 0 ? 'No admin categories (create one in Categories first)' : 'Select Category'}</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              className="input-control"
              rows={2}
              placeholder="Key formula or takeaway in this reel..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Video File * (max 100MB)
              </label>
              <input
                type="file"
                className="input-control"
                accept="video/mp4,video/quicktime,video/webm,video/3gpp"
                onChange={(e) => handleVideoPick(e.target.files?.[0])}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Duration (Seconds)
              </label>
              <input
                type="number"
                className="input-control"
                placeholder="30"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Thumbnail Image (optional — the video frame is shown if empty)
            </label>
            <input
              type="file"
              className="input-control"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? progress || 'Saving...' : 'Publish Reel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Video Player Modal */}
      <Modal isOpen={!!activeVideoUrl} onClose={() => setActiveVideoUrl(null)} title="Short Reel Player" maxWidth="420px">
        {activeVideoUrl && (
          <div style={{ width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#000' }}>
            <video src={activeVideoUrl} controls autoPlay style={{ width: '100%', maxHeight: '520px', display: 'block' }} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReelsPage;

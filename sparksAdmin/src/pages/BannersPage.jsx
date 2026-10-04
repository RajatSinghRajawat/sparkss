import { useState, useEffect } from 'react';
import { Image, Plus, Trash2, ExternalLink } from 'lucide-react';
import Modal from '../components/common/Modal';
import { endpoints, safeList } from '../services/api';

const BannersPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', image: '', link: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await endpoints.banners.getAll();
      setBanners(safeList(res));
    } catch (err) {
      console.error('Failed to load banners:', err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title?.trim() || undefined,
        imageKey: (formData.image || formData.imageKey || '').trim(),
        link: formData.link?.trim() || undefined,
      };
      const res = await endpoints.banners.create(payload);
      if (res.data?.success) {
        setShowAddModal(false);
        setFormData({ title: '', image: '', link: '' });
        fetchBanners();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this promotional banner?')) return;
    try {
      await endpoints.banners.delete(id);
      setBanners((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete banner');
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
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              App Home Banners
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Manage carousel advertisements and announcements on the student mobile app ({banners.length} banners)
            </span>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> New Banner
        </button>
      </div>

      {/* Banners Grid */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading promotional banners...
        </div>
      ) : banners.length === 0 ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center' }}>
          <Image size={40} style={{ color: 'var(--text-dim)', marginBottom: '10px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No banners published yet.</p>
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowAddModal(true)}>
            Add First Banner
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {banners.map((banner) => {
            const bannerImg = banner.imageUrl || banner.image?.url || banner.image || banner.imageKey;
            return (
              <div key={banner._id} className="card card-hover" style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    height: '180px',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backgroundImage: bannerImg ? `url(${bannerImg})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                  }}
                />
              <div style={{ padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {banner.title || 'Promotional Banner'}
                  </h4>
                  {banner.link && (
                    <a
                      href={banner.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}
                    >
                      Visit Destination <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  onClick={() => handleDelete(banner._id)}
                  title="Remove banner"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Add Banner Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Upload Home Banner">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Banner Title *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Special Discount on JEE Live Batch"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Banner Image URL *
            </label>
            <input
              type="url"
              className="input-control"
              placeholder="https://..."
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Destination / Action Link
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="https://... or app route"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Save Banner'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BannersPage;

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Film,
  BookOpen,
  Video,
  Layers,
  Tag,
  Eye,
  Heart,
  Users,
  RefreshCw,
} from 'lucide-react';
import Badge from '../components/common/Badge';
import MediaThumb from '../components/common/MediaThumb';
import { endpoints } from '../services/api';
import { ContentGrid, PlayButton, DurationBadge, HiddenBadge, VideoPlayerModal } from '../components/common/MediaCards';
import { formatDate } from '../utils/media';

const TABS = [
  { key: 'reels', label: 'Reels', icon: Film },
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'videos', label: 'Videos', icon: Video },
  { key: 'playlists', label: 'Playlists', icon: Layers },
  { key: 'categories', label: 'Categories', icon: Tag },
];

const infoTile = {
  padding: '12px 14px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--card-border)',
  minWidth: 0,
};
const tileLabel = {
  fontSize: '0.7rem',
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};
const tileValue = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'var(--text-main)',
  marginTop: '4px',
  wordBreak: 'break-word',
};

/** Full admin profile of one teacher: details, stats and everything they published. */
const TeacherDetailPage = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [stats, setStats] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('reels');
  const [statusLoading, setStatusLoading] = useState(false);
  const [player, setPlayer] = useState(null); // { url, title, vertical }

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([endpoints.teachers.getById(teacherId), endpoints.teachers.getContent(teacherId)])
      .then(([detailRes, contentRes]) => {
        if (cancelled) return;
        setTeacher(detailRes.data?.data?.teacher ?? null);
        setStats(detailRes.data?.data?.stats ?? null);
        setContent(contentRes.data?.data ?? null);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load this teacher.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const toggleStatus = async () => {
    if (!teacher) return;
    const next = !teacher.isActive;
    const verb = next ? 'Reactivate' : 'Deactivate';
    if (!window.confirm(`${verb} ${teacher.name}'s account?`)) return;
    setStatusLoading(true);
    try {
      await endpoints.teachers.update(teacher._id, { isActive: next });
      setTeacher((t) => ({ ...t, isActive: next }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update account status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const play = (item, vertical) => {
    if (!item.videoUrl) {
      alert('This video has no playable file.');
      return;
    }
    setPlayer({ url: item.videoUrl, title: item.title, vertical });
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading teacher profile...
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#fb7185', marginBottom: '16px' }}>{error || 'Teacher not found.'}</p>
        <div style={{ display: 'inline-flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/teachers')}>
            <ArrowLeft size={16} /> Back to Teachers
          </button>
          <button className="btn btn-primary" onClick={reload}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const counts = {
    reels: content?.reels?.length ?? 0,
    courses: content?.courses?.length ?? 0,
    videos: content?.videos?.length ?? 0,
    playlists: content?.playlists?.length ?? 0,
    categories: content?.categories?.length ?? 0,
  };

  const statTiles = [
    { label: 'Reels', value: stats?.reels, icon: Film, color: '#fb7185' },
    { label: 'Courses', value: stats?.courses, icon: BookOpen, color: '#f59e0b' },
    { label: 'Videos', value: stats?.videos, icon: Video, color: '#38bdf8' },
    { label: 'Playlists', value: stats?.playlists, icon: Layers, color: '#a78bfa' },
    { label: 'Followers', value: stats?.followers, icon: Users, color: '#34d399' },
    { label: 'Reel Views', value: stats?.reelViews, icon: Eye, color: '#60a5fa' },
    { label: 'Reel Likes', value: stats?.reelLikes, icon: Heart, color: '#f472b6' },
    { label: 'Categories', value: stats?.categories, icon: Tag, color: '#fbbf24' },
  ];

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back */}
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/teachers')}>
          <ArrowLeft size={16} /> Back to Teachers
        </button>
      </div>

      {/* Profile header */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <div
              style={{
                width: '76px',
                height: '76px',
                flexShrink: 0,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 800,
              }}
            >
              {teacher.avatar ? (
                <img src={teacher.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (teacher.name || 'T').charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                {teacher.name || 'Faculty Member'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Badge variant={teacher.isActive ? 'active' : 'inactive'}>
                  {teacher.isActive ? 'Active' : 'Deactivated'}
                </Badge>
                <Badge variant={teacher.isVerified ? 'success' : 'warning'}>
                  {teacher.isVerified ? 'Email verified' : 'Email not verified'}
                </Badge>
              </div>
            </div>
          </div>

          <button
            className={`btn ${teacher.isActive ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleStatus}
            disabled={statusLoading}
          >
            {teacher.isActive ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            {statusLoading ? 'Updating...' : teacher.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={infoTile}>
            <span style={tileLabel}><Mail size={12} /> Email</span>
            <div style={tileValue}>{teacher.email || '—'}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}><Phone size={12} /> Phone</span>
            <div style={tileValue}>{teacher.phone || '—'}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}><CalendarDays size={12} /> Joined</span>
            <div style={tileValue}>{formatDate(teacher.createdAt)}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}><RefreshCw size={12} /> Last Updated</span>
            <div style={tileValue}>{teacher.updatedAt ? new Date(teacher.updatedAt).toLocaleString() : '—'}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}>Teacher ID</span>
            <div style={{ ...tileValue, fontSize: '0.78rem', color: 'var(--primary)' }}>{teacher._id}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
        {statTiles.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: `${color}22`,
                color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{value ?? 0}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Content tabs */}
      <div className="card" style={{ padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: '1 1 120px', justifyContent: 'center' }}
            >
              <Icon size={15} /> {label} ({counts[key]})
            </button>
          );
        })}
      </div>

      {/* Reels */}
      {tab === 'reels' && (
        <ContentGrid empty="This teacher hasn't published any reels." min="200px" items={content?.reels}>
          {(r) => (
            <div key={r._id} className="card card-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <MediaThumb thumbnail={r.thumbnail} videoUrl={r.videoUrl} height="300px">
                <PlayButton onClick={() => play(r, true)} color="rgba(244, 63, 94, 0.9)" />
                <DurationBadge seconds={r.duration} />
                {!r.isActive && <HiddenBadge />}
              </MediaThumb>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>{r.title}</h4>
                {r.category && <span style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>{r.category}</span>}
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} /> {r.views}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={12} /> {r.likes}</span>
                  <span>{formatDate(r.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </ContentGrid>
      )}

      {/* Courses + Videos (16:9) */}
      {(tab === 'courses' || tab === 'videos') && (
        <ContentGrid
          empty={tab === 'courses' ? "This teacher hasn't added any courses." : "This teacher hasn't uploaded any videos."}
          min="280px"
          items={tab === 'courses' ? content?.courses : content?.videos}
        >
          {(v) => (
            <div key={v._id} className="card card-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <MediaThumb thumbnail={v.thumbnail} videoUrl={v.videoUrl} height="170px">
                <PlayButton onClick={() => play(v, false)} color="rgba(245, 158, 11, 0.9)" />
                <DurationBadge seconds={v.duration} />
                {!v.isActive && <HiddenBadge />}
              </MediaThumb>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {v.playlist && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    {v.playlist.name}
                  </span>
                )}
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>{v.title}</h4>
                {v.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{v.description}</p>
                )}
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{formatDate(v.createdAt)}</span>
              </div>
            </div>
          )}
        </ContentGrid>
      )}

      {/* Playlists */}
      {tab === 'playlists' && (
        <ContentGrid empty="This teacher hasn't created any playlists." min="280px" items={content?.playlists}>
          {(p) => (
            <div key={p._id} className="card card-hover" style={{ overflow: 'hidden' }}>
              <MediaThumb thumbnail={p.banner} height="140px" background="rgba(19, 28, 49, 0.8)">
                {!p.banner && <Layers size={32} style={{ color: 'var(--primary)', position: 'relative' }} />}
                {!p.isActive && <HiddenBadge />}
              </MediaThumb>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</h4>
                {p.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description}</p>
                )}
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                  <span>{p.videoCount} videos</span>
                  <span>{p.enrolledCount} enrolled</span>
                  <span>{formatDate(p.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </ContentGrid>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {counts.categories === 0 ? (
            <span style={{ color: 'var(--text-dim)' }}>No categories yet.</span>
          ) : (
            content.categories.map((c) => (
              <Badge key={c._id} variant="info">{c.name}</Badge>
            ))
          )}
        </div>
      )}

      <VideoPlayerModal player={player} onClose={() => setPlayer(null)} />
    </div>
  );
};

export default TeacherDetailPage;

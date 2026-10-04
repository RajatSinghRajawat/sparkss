import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Bookmark,
  Heart,
  Users,
  ClipboardCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import Badge from '../components/common/Badge';
import MediaThumb from '../components/common/MediaThumb';
import { ContentGrid, PlayButton, DurationBadge, VideoPlayerModal } from '../components/common/MediaCards';
import { endpoints } from '../services/api';
import { formatDate } from '../utils/media';

const TABS = [
  { key: 'enrolledPlaylists', label: 'Enrolled Playlists', icon: Layers },
  { key: 'testResults', label: 'Test Results', icon: ClipboardCheck },
  { key: 'savedReels', label: 'Saved Reels', icon: Bookmark },
  { key: 'likedReels', label: 'Liked Reels', icon: Heart },
  { key: 'following', label: 'Following', icon: Users },
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

/** Full admin profile of one student: details and everything they did in the app. */
const StudentDetailPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('enrolledPlaylists');
  const [statusLoading, setStatusLoading] = useState(false);
  const [player, setPlayer] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([endpoints.students.getById(studentId), endpoints.students.getActivity(studentId)])
      .then(([detailRes, activityRes]) => {
        if (cancelled) return;
        setStudent(detailRes.data?.data?.student ?? null);
        setActivity(activityRes.data?.data ?? null);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load this student.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const toggleStatus = async () => {
    if (!student) return;
    const next = !student.isActive;
    if (!window.confirm(`${next ? 'Reactivate' : 'Deactivate'} ${student.name}'s account?`)) return;
    setStatusLoading(true);
    try {
      await endpoints.students.update(student._id, { isActive: next });
      setStudent((s) => ({ ...s, isActive: next }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update account status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const playReel = (r) => {
    if (!r.videoUrl) {
      alert('This reel has no playable file.');
      return;
    }
    setPlayer({ url: r.videoUrl, title: r.title, vertical: true });
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading student profile...
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#fb7185', marginBottom: '16px' }}>{error || 'Student not found.'}</p>
        <div style={{ display: 'inline-flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/students')}>
            <ArrowLeft size={16} /> Back to Students
          </button>
          <button className="btn btn-primary" onClick={reload}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const counts = Object.fromEntries(TABS.map(({ key }) => [key, activity?.[key]?.length ?? 0]));
  const results = activity?.testResults ?? [];
  const completedResults = results.filter((r) => r.completed);
  const avgScore =
    completedResults.length > 0
      ? Math.round(completedResults.reduce((s, r) => s + r.scorePercent, 0) / completedResults.length)
      : null;

  const statTiles = [
    { label: 'Enrolled', value: counts.enrolledPlaylists, icon: Layers, color: '#a78bfa' },
    { label: 'Tests Taken', value: counts.testResults, icon: ClipboardCheck, color: '#38bdf8' },
    { label: 'Avg Score', value: avgScore === null ? '—' : `${avgScore}%`, icon: ClipboardCheck, color: '#34d399' },
    { label: 'Saved Reels', value: counts.savedReels, icon: Bookmark, color: '#f59e0b' },
    { label: 'Liked Reels', value: counts.likedReels, icon: Heart, color: '#f472b6' },
    { label: 'Following', value: counts.following, icon: Users, color: '#60a5fa' },
  ];

  const reelGrid = (items, empty) => (
    <ContentGrid empty={empty} min="200px" items={items}>
      {(r) => (
        <div key={r._id} className="card card-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <MediaThumb thumbnail={r.thumbnail} videoUrl={r.videoUrl} height="280px">
            <PlayButton onClick={() => playReel(r)} color="rgba(244, 63, 94, 0.9)" />
            <DurationBadge seconds={r.duration} />
          </MediaThumb>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>{r.title}</h4>
            <span style={{ fontSize: '0.74rem', color: 'var(--primary)' }}>by {r.teacherName}</span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} /> {r.views}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={12} /> {r.likes}</span>
              <span>{formatDate(r.at)}</span>
            </div>
          </div>
        </div>
      )}
    </ContentGrid>
  );

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/students')}>
          <ArrowLeft size={16} /> Back to Students
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
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 800,
              }}
            >
              {student.avatar ? (
                <img src={student.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (student.name || 'S').charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                {student.name || 'Unnamed Student'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Badge variant={student.isActive ? 'active' : 'inactive'}>
                  {student.isActive ? 'Active' : 'Deactivated'}
                </Badge>
                <Badge variant={student.isVerified ? 'success' : 'warning'}>
                  {student.isVerified ? 'Email verified' : 'Email not verified'}
                </Badge>
              </div>
            </div>
          </div>

          <button
            className={`btn ${student.isActive ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleStatus}
            disabled={statusLoading}
          >
            {student.isActive ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            {statusLoading ? 'Updating...' : student.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={infoTile}>
            <span style={tileLabel}><Mail size={12} /> Email</span>
            <div style={tileValue}>{student.email || '—'}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}><Phone size={12} /> Phone</span>
            <div style={tileValue}>{student.phone || '—'}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}><CalendarDays size={12} /> Joined</span>
            <div style={tileValue}>{formatDate(student.createdAt)}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}><RefreshCw size={12} /> Last Updated</span>
            <div style={tileValue}>{student.updatedAt ? new Date(student.updatedAt).toLocaleString() : '—'}</div>
          </div>
          <div style={infoTile}>
            <span style={tileLabel}>Student ID</span>
            <div style={{ ...tileValue, fontSize: '0.78rem', color: 'var(--primary)' }}>{student._id}</div>
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

      {/* Tabs */}
      <div className="card" style={{ padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: '1 1 140px', justifyContent: 'center' }}
          >
            <Icon size={15} /> {label} ({counts[key]})
          </button>
        ))}
      </div>

      {tab === 'enrolledPlaylists' && (
        <ContentGrid empty="Not enrolled in any playlist yet." min="280px" items={activity?.enrolledPlaylists}>
          {(p) => (
            <div key={p._id} className="card card-hover" style={{ overflow: 'hidden' }}>
              <MediaThumb thumbnail={p.banner} height="140px" background="rgba(19, 28, 49, 0.8)">
                {!p.banner && <Layers size={32} style={{ color: 'var(--primary)', position: 'relative' }} />}
              </MediaThumb>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  {p.teacherName}
                </span>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</h4>
                {p.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description}</p>
                )}
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                  <span>{p.videoCount} videos</span>
                  <span>Enrolled {formatDate(p.enrolledAt)}</span>
                </div>
              </div>
            </div>
          )}
        </ContentGrid>
      )}

      {tab === 'testResults' &&
        (results.length === 0 ? (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No tests attempted yet.
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Test</th>
                  <th style={{ padding: '14px 12px' }}>Score</th>
                  <th style={{ padding: '14px 12px' }}>Answered</th>
                  <th style={{ padding: '14px 12px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id} style={{ borderTop: '1px solid var(--card-border)', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>{r.testTitle}</td>
                    <td style={{ padding: '14px 12px' }}>
                      {r.correct}/{r.totalQuestions} <span style={{ color: 'var(--text-dim)' }}>({r.scorePercent}%)</span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>{r.answered}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <Badge variant={r.completed ? 'success' : 'warning'}>{r.completed ? 'Completed' : 'Left midway'}</Badge>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{formatDate(r.completedAt || r.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'savedReels' && reelGrid(activity?.savedReels, 'No saved reels.')}
      {tab === 'likedReels' && reelGrid(activity?.likedReels, 'No liked reels.')}

      {tab === 'following' && (
        <ContentGrid empty="Not following any teacher." min="240px" items={activity?.following}>
          {(t) => (
            <button
              key={t._id}
              className="card card-hover"
              onClick={() => navigate(`/teachers/${t._id}`)}
              title="Open teacher profile"
              style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', cursor: 'pointer', border: 'none' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  flexShrink: 0,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {t.avatar ? (
                  <img src={t.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (t.name || 'T').charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', wordBreak: 'break-all' }}>{t.email}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Since {formatDate(t.followedAt)}</div>
              </div>
            </button>
          )}
        </ContentGrid>
      )}

      <VideoPlayerModal player={player} onClose={() => setPlayer(null)} />
    </div>
  );
};

export default StudentDetailPage;

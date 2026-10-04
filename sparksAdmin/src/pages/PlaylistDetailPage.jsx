import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, RefreshCw, Users, PlaySquare, CalendarDays } from 'lucide-react';
import Badge from '../components/common/Badge';
import MediaThumb from '../components/common/MediaThumb';
import { ContentGrid, PlayButton, DurationBadge, VideoPlayerModal } from '../components/common/MediaCards';
import { endpoints } from '../services/api';
import { formatDate } from '../utils/media';

/** Full admin view of one playlist: banner, videos (playable) and enrolled students. */
const PlaylistDetailPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('videos');
  const [player, setPlayer] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    endpoints.playlists
      .getDetail(playlistId)
      .then((res) => {
        if (cancelled) return;
        setData(res.data?.data ?? null);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load this playlist.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playlistId, reloadKey]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading playlist...
      </div>
    );
  }

  const playlist = data?.playlist;
  if (error || !playlist) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#fb7185', marginBottom: '16px' }}>{error || 'Playlist not found.'}</p>
        <div style={{ display: 'inline-flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/playlists')}>
            <ArrowLeft size={16} /> Back to Playlists
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const courses = data.courses ?? [];
  const enrollees = data.enrollees ?? [];

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/playlists')}>
          <ArrowLeft size={16} /> Back to Playlists
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <MediaThumb thumbnail={playlist.banner} height="200px" background="rgba(19, 28, 49, 0.8)">
          {!playlist.banner && <Layers size={44} style={{ color: 'var(--primary)', position: 'relative' }} />}
        </MediaThumb>
        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{playlist.name}</h2>
            <Badge variant={playlist.isActive ? 'active' : 'inactive'}>{playlist.isActive ? 'Active' : 'Hidden'}</Badge>
          </div>
          {playlist.description && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{playlist.description}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '0.84rem', color: 'var(--text-dim)' }}>
            <span>
              By{' '}
              {playlist.teacherId ? (
                <button
                  onClick={() => navigate(`/teachers/${playlist.teacherId}`)}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {playlist.teacherName}
                </button>
              ) : (
                <strong style={{ color: 'var(--text-main)' }}>{playlist.teacherName}</strong>
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PlaySquare size={14} /> {courses.length} videos</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> {enrollees.length} enrolled</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} /> {formatDate(playlist.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button
          onClick={() => setTab('videos')}
          className={`btn ${tab === 'videos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: '1 1 160px', justifyContent: 'center' }}
        >
          <PlaySquare size={15} /> Videos ({courses.length})
        </button>
        <button
          onClick={() => setTab('students')}
          className={`btn ${tab === 'students' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: '1 1 160px', justifyContent: 'center' }}
        >
          <Users size={15} /> Enrolled Students ({enrollees.length})
        </button>
      </div>

      {tab === 'videos' && (
        <ContentGrid empty="No videos in this playlist yet." min="280px" items={courses}>
          {(c, i) => (
            <div key={c._id} className="card card-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <MediaThumb thumbnail={c.thumbnail} videoUrl={c.videoUrl} height="170px">
                <PlayButton
                  onClick={() =>
                    c.videoUrl ? setPlayer({ url: c.videoUrl, title: c.title }) : alert('This video has no playable file.')
                  }
                  color="rgba(245, 158, 11, 0.9)"
                />
                <DurationBadge seconds={c.duration} />
              </MediaThumb>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Lesson {i + 1}</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>{c.title}</h4>
                {c.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{c.description}</p>
                )}
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{formatDate(c.createdAt)}</span>
              </div>
            </div>
          )}
        </ContentGrid>
      )}

      {tab === 'students' &&
        (enrollees.length === 0 ? (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No students enrolled yet.
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px' }}>Student</th>
                  <th style={{ padding: '14px 12px' }}>Email</th>
                  <th style={{ padding: '14px 20px' }}>Enrolled On</th>
                </tr>
              </thead>
              <tbody>
                {enrollees.map((e) => (
                  <tr
                    key={e._id}
                    onClick={() => e.studentId && navigate(`/students/${e.studentId}`)}
                    title="Open student profile"
                    style={{ borderTop: '1px solid var(--card-border)', fontSize: '0.88rem', color: 'var(--text-main)', cursor: e.studentId ? 'pointer' : 'default' }}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>{e.studentName}</td>
                    <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{e.studentEmail}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{formatDate(e.enrolledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      <VideoPlayerModal player={player} onClose={() => setPlayer(null)} />
    </div>
  );
};

export default PlaylistDetailPage;

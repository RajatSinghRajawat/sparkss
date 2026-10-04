import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Eye, ShieldCheck, ShieldAlert, RefreshCw, BookOpen } from 'lucide-react';
import Badge from '../components/common/Badge';
import { endpoints, safeList } from '../services/api';

const TeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await endpoints.teachers.getAll({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTeachers(safeList(res));
    } catch (err) {
      console.error('Failed to load teachers:', err);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchTeachers, 300);
    return () => clearTimeout(delay);
  }, [search, statusFilter]);

  const handleToggleStatus = async (teacher) => {
    setActionLoading(true);
    try {
      const updatedStatus = !teacher.isActive;
      await endpoints.teachers.update(teacher._id, { isActive: updatedStatus });
      setTeachers((prev) =>
        prev.map((t) => (t._id === teacher._id ? { ...t, isActive: updatedStatus } : t))
      );
    } catch (err) {
      alert(err.message || 'Failed to update teacher status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Controls */}
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
              background: 'rgba(14, 165, 233, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Faculty & Instructors Directory
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Manage teachers, their content and account access ({teachers.length} found)
            </span>
          </div>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
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
              placeholder="Search faculty name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <select
            className="input-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '130px', height: '40px' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>

          <button className="btn-icon" onClick={fetchTeachers} title="Refresh directory">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--card-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-dim)',
                }}
              >
                <th style={{ padding: '16px 24px' }}>Instructor Profile</th>
                <th style={{ padding: '16px 20px' }}>Specialization</th>
                <th style={{ padding: '16px 20px' }}>Contact</th>
                <th style={{ padding: '16px 20px' }}>Faculty Status</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Loading faculty directory...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No faculty members found.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr
                    key={teacher._id}
                    style={{
                      borderBottom: '1px solid var(--card-border)',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                          }}
                        >
                          {teacher.name ? teacher.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {teacher.name || 'Faculty Member'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            {teacher.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={14} style={{ color: 'var(--primary)' }} />
                        {teacher.email || 'Faculty'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {teacher.phone || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={teacher.isActive !== false ? 'active' : 'inactive'}>
                        {teacher.isActive !== false ? 'Verified' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/teachers/${teacher._id}`)}
                          title="Open full teacher profile"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleToggleStatus(teacher)}
                          title={teacher.isActive !== false ? 'Deactivate faculty' : 'Activate faculty'}
                          style={{ color: teacher.isActive !== false ? '#fb7185' : '#34d399' }}
                          disabled={actionLoading}
                        >
                          {teacher.isActive !== false ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default TeachersPage;

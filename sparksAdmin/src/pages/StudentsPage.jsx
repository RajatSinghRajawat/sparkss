import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, ShieldCheck, ShieldAlert, GraduationCap, RefreshCw } from 'lucide-react';
import Badge from '../components/common/Badge';
import { endpoints, safeList } from '../services/api';

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await endpoints.students.getAll({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setStudents(safeList(res));
    } catch (err) {
      console.error('Failed to load students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchStudents, 300);
    return () => clearTimeout(delay);
  }, [search, statusFilter]);

  const handleToggleStatus = async (student) => {
    setActionLoading(true);
    try {
      const updatedStatus = !student.isActive;
      await endpoints.students.update(student._id, { isActive: updatedStatus });
      setStudents((prev) =>
        prev.map((s) => (s._id === student._id ? { ...s, isActive: updatedStatus } : s))
      );
    } catch (err) {
      alert(err.message || 'Failed to update student status');
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
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Learners Directory
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              View and manage registered student accounts ({students.length} found)
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
              placeholder="Search by name or email..."
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

          <button className="btn-icon" onClick={fetchStudents} title="Refresh directory">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Students Data Table */}
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
                <th style={{ padding: '16px 24px' }}>Student Profile</th>
                <th style={{ padding: '16px 20px' }}>Contact Phone</th>
                <th style={{ padding: '16px 20px' }}>Registered On</th>
                <th style={{ padding: '16px 20px' }}>Account Status</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student._id}
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
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                          }}
                        >
                          {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {student.name || 'Unnamed Student'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                            {student.email || 'No email provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      {student.phone || '—'}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={student.isActive !== false ? 'active' : 'inactive'}>
                        {student.isActive !== false ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/students/${student._id}`)}
                          title="View student profile"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleToggleStatus(student)}
                          title={student.isActive !== false ? 'Deactivate student' : 'Activate student'}
                          style={{ color: student.isActive !== false ? '#fb7185' : '#34d399' }}
                          disabled={actionLoading}
                        >
                          {student.isActive !== false ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
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

export default StudentsPage;

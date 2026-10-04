import { useState, useEffect } from 'react';
import { FileCheck, Plus, Search, Users, Clock } from 'lucide-react';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { endpoints, safeList } from '../services/api';

const TestsPage = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // all, new, complete
  const [showAddModal, setShowAddModal] = useState(false);
  const [enrolledModalTest, setEnrolledModalTest] = useState(null);
  const [enrolledUsers, setEnrolledUsers] = useState([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);

  // New Test Form
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    duration: 60,
    totalMarks: 100,
    startTime: '',
    endTime: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await endpoints.tests.getAll({
        search: search || undefined,
        tab: tab !== 'all' ? tab : undefined,
      });
      setTests(safeList(res));
    } catch (err) {
      console.error('Failed to load tests:', err);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchTests, 300);
    return () => clearTimeout(delay);
  }, [search, tab]);

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await endpoints.tests.create(formData);
      if (res.data?.success) {
        setShowAddModal(false);
        setFormData({ title: '', subject: '', duration: 60, totalMarks: 100, startTime: '', endTime: '' });
        fetchTests();
      }
    } catch (err) {
      alert(err.message || 'Failed to schedule test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewEnrolled = async (test) => {
    setEnrolledModalTest(test);
    setEnrolledLoading(true);
    try {
      const res = await endpoints.tests.getEnrolledUsers(test._id);
      const enrollees = res.data?.data?.enrollees;
      setEnrolledUsers(Array.isArray(enrollees) ? enrollees : (Array.isArray(res.data?.data) ? res.data.data : []));
    } catch {
      setEnrolledUsers([]);
    } finally {
      setEnrolledLoading(false);
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
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Examination & Assessment Engine
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Configure timed online tests, question banks, and enrolled candidates ({tests.length} tests)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Schedule Test
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { key: 'all', label: 'All Assessments' },
          { key: 'new', label: 'Upcoming / Active' },
          { key: 'complete', label: 'Completed' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              backgroundColor: tab === t.key ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
              border: `1px solid ${tab === t.key ? 'rgba(245, 158, 11, 0.3)' : 'var(--card-border)'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tests Table */}
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
                <th style={{ padding: '16px 24px' }}>Test Examination</th>
                <th style={{ padding: '16px 20px' }}>Subject</th>
                <th style={{ padding: '16px 20px' }}>Duration</th>
                <th style={{ padding: '16px 20px' }}>Marks</th>
                <th style={{ padding: '16px 20px' }}>Start Time</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Candidates</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Loading assessments...
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No examinations found in this view.
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr
                    key={test._id}
                    style={{
                      borderBottom: '1px solid var(--card-border)',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {test.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        ID: {test._id ? test._id.slice(-6) : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      <Badge variant="indigo">{test.subject || 'General'}</Badge>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} color="var(--primary)" />
                        {test.duration ? `${test.duration} min` : 'Unspecified'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {test.totalMarks ?? 100}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      {test.startTime ? new Date(test.startTime).toLocaleString() : 'Open Schedule'}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => handleViewEnrolled(test)}
                      >
                        <Users size={14} /> View Enrolled
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrolled Students Modal */}
      <Modal
        isOpen={!!enrolledModalTest}
        onClose={() => setEnrolledModalTest(null)}
        title={`Enrolled Candidates: ${enrolledModalTest?.title || ''}`}
        maxWidth="600px"
      >
        {enrolledLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
            Fetching enrolled student candidates...
          </div>
        ) : enrolledUsers.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No students currently registered or enrolled for this examination yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {enrolledUsers.map((u, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {u.student?.name || u.name || 'Candidate'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {u.student?.email || u.email || '—'}
                  </div>
                </div>
                <Badge variant="success">Registered</Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Schedule Test Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Schedule New Online Assessment">
        <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Test Examination Title *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Physics Weekly Assessment: Mechanics"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Subject *
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Mathematics"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Duration (Minutes)
              </label>
              <input
                type="number"
                className="input-control"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Start Window Date & Time
              </label>
              <input
                type="datetime-local"
                className="input-control"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                End Window Date & Time
              </label>
              <input
                type="datetime-local"
                className="input-control"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Scheduling...' : 'Save & Schedule Test'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TestsPage;

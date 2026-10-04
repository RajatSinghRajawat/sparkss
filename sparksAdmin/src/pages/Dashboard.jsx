import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  BookOpen,
  FileCheck,
  Film,
  Video,
  MessageSquare,
  Sparkles,
  Calendar,
  Clock,
  ArrowUpRight,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { endpoints, safeList } from '../services/api';
import { useAuth } from '../context/useAuth';

const Dashboard = () => {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayTests, setTodayTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, testsRes] = await Promise.all([
          endpoints.dashboard.getStats(),
          endpoints.dashboard.getTodayTests().catch(() => ({ data: { data: { tests: [] } } })),
        ]);

        if (statsRes.data?.success) {
          setStats(statsRes.data.data);
        }
        const tList = testsRes.data?.data?.tests;
        setTodayTests(Array.isArray(tList) ? tList : safeList(testsRes));
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setTodayTests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(26, 38, 66, 0.75) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-warning">
              <Sparkles size={12} /> Console Live
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            Welcome back, <span style={{ color: 'var(--primary)' }}>{admin?.name || 'Administrator'}</span>!
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '600px' }}>
            Here is what's happening across the Sparks ecosystem today. You have full control over courses, live tests, and student support.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', zIndex: 1 }}>
          <Link to="/courses" className="btn btn-primary">
            <PlusCircle size={16} /> Add New Course
          </Link>
          <Link to="/tests" className="btn btn-secondary">
            <FileCheck size={16} /> Manage Tests
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading dashboard...
        </div>
      ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}
      >
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          icon={GraduationCap}
          color="#10b981"
          description="Registered learners"
        />
        <StatCard
          title="Active Instructors"
          value={stats?.totalTeachers ?? 0}
          icon={Users}
          color="#0ea5e9"
          description="Faculty & teachers"
        />
        <StatCard
          title="Curated Courses"
          value={stats?.totalCourses ?? 0}
          icon={BookOpen}
          color="#f59e0b"
          description="Interactive courses"
        />
        <StatCard
          title="Active Tests"
          value={stats?.totalTests ?? 0}
          icon={FileCheck}
          color="#a855f7"
          description={`${stats?.todayTestCount ?? 0} scheduled today`}
        />
      </div>
      )}

      {/* Secondary Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Video size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats?.totalVideos ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Course Videos</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats?.totalReels ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Short Reels</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats?.studentSupportChatCount ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Student Queries</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{stats?.teacherSupportChatCount ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Teacher Queries</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Today Tests & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Today's Scheduled Tests Widget */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Today's Live Tests</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Examinations scheduled for current window</span>
              </div>
            </div>
            <Link to="/tests" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          {todayTests.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--card-border)',
              }}
            >
              <Clock size={32} style={{ color: 'var(--text-dim)', marginBottom: '10px' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                No active tests scheduled for today
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px', maxWidth: '280px' }}>
                Create or schedule upcoming assessments to evaluate student performance.
              </p>
              <Link to="/tests" className="btn btn-secondary" style={{ marginTop: '14px', fontSize: '0.8rem' }}>
                Schedule a Test
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayTests.map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {t.testName || t.title || 'Scheduled Test'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {t.teacher ? `Faculty: ${t.teacher}` : (t.subject || 'General')} • {t.time || (t.duration ? `${t.duration} min` : 'Scheduled')}
                    </div>
                  </div>
                  <Badge variant={t.status === 'live' ? 'active' : 'warning'}>
                    {t.status || 'Scheduled'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Administration Hub */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Administrative Hub</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Direct access to critical platform modules</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <Link
              to="/students"
              className="card card-hover"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ color: '#10b981' }}><GraduationCap size={22} /></div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Students</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Manage learner enrollment</span>
            </Link>

            <Link
              to="/teachers"
              className="card card-hover"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ color: '#0ea5e9' }}><Users size={22} /></div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Teachers</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Manage faculty accounts</span>
            </Link>

            <Link
              to="/categories"
              className="card card-hover"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ color: '#a855f7' }}><BookOpen size={22} /></div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Categories</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Class & subject taxonomy</span>
            </Link>

            <Link
              to="/support/students"
              className="card card-hover"
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ color: '#f59e0b' }}><MessageSquare size={22} /></div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Support</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Student & teacher chat</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

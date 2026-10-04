import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { endpoints } from '../services/api';

const routeTitles = {
  '/': 'Executive Dashboard',
  '/courses': 'Courses Management',
  '/playlists': 'Curated Playlists',
  '/tests': 'Tests & Online Quizzes',
  '/categories': 'Academic Categories',
  '/students': 'Registered Students Directory',
  '/teachers': 'Instructors & Faculty Directory',
  '/reels': 'Educational Short Reels',
  '/banners': 'Homepage Promotional Banners',
  '/support/students': 'Student Support Messenger',
  '/support/teachers': 'Teacher Support Messenger',
};

const Navbar = () => {
  const location = useLocation();
  const [apiOnline, setApiOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      await endpoints.dashboard.getStats();
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setTimeout(() => setChecking(false), 400);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 45000);
    return () => clearInterval(interval);
  }, []);

  const pageTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith('/teachers/')
      ? 'Teacher Profile'
      : location.pathname.startsWith('/students/')
        ? 'Student Profile'
        : location.pathname.startsWith('/playlists/')
          ? 'Playlist Details'
          : 'Admin Console');

  return (
    <header
      style={{
        height: 'var(--navbar-height)',
        backgroundColor: 'rgba(8, 12, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--card-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
      }}
    >
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {pageTitle}
        </h1>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Sparks Global Learning Ecosystem • v1.0
        </span>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Backend API Status Pill */}
        <div
          onClick={checkHealth}
          title="Click to ping local API"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '9999px',
            backgroundColor: apiOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            border: `1px solid ${apiOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <span
            className="pulse-dot"
            style={{
              backgroundColor: apiOnline ? '#10b981' : '#f43f5e',
              boxShadow: apiOnline ? '0 0 8px #10b981' : '0 0 8px #f43f5e',
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: apiOnline ? '#34d399' : '#fb7185',
            }}
          >
            {apiOnline ? 'API Connected (5000)' : 'API Offline'}
          </span>
          <RefreshCw
            size={12}
            style={{
              color: 'var(--text-dim)',
              animation: checking ? 'spin 0.6s linear infinite' : 'none',
            }}
          />
        </div>

        {/* Global Security Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--card-border)',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={16} color="var(--primary)" />
          <span>Admin Authenticated</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

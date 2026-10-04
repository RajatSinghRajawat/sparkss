import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  FolderTree,
  FileCheck,
  Tag,
  Film,
  Image,
  MessageSquare,
  MessagesSquare,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Academic Hub',
    items: [
      { name: 'Courses', path: '/courses', icon: BookOpen },
      { name: 'Playlists', path: '/playlists', icon: FolderTree },
      { name: 'Tests & Quizzes', path: '/tests', icon: FileCheck },
      { name: 'Categories', path: '/categories', icon: Tag },
    ],
  },
  {
    title: 'Directory',
    items: [
      { name: 'Students', path: '/students', icon: GraduationCap },
      { name: 'Teachers', path: '/teachers', icon: Users },
    ],
  },
  {
    title: 'Media & Feed',
    items: [
      { name: 'Reels', path: '/reels', icon: Film },
      { name: 'Home Banners', path: '/banners', icon: Image },
    ],
  },
  {
    title: 'Live Support',
    items: [
      { name: 'Student Chat', path: '/support/students', icon: MessageSquare },
      { name: 'Teacher Chat', path: '/support/teachers', icon: MessagesSquare },
    ],
  },
];

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        width: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--card-border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Top Header / Brand */}
      <div>
        <div
          style={{
            height: 'var(--navbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '0' : '0 20px',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#090d16',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <div>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  Edu<span style={{ color: 'var(--primary)' }}>Spark</span>
                </span>
                <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Admin Suite
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              className="btn-icon"
              onClick={() => setIsCollapsed(true)}
              title="Collapse Sidebar"
              style={{ width: '28px', height: '28px' }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <button
              className="btn-icon"
              onClick={() => setIsCollapsed(false)}
              title="Expand Sidebar"
              style={{ width: '28px', height: '28px' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Groups */}
        <div style={{ padding: isCollapsed ? '10px 8px' : '16px 12px' }}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '16px' }}>
              {!isCollapsed && (
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-dim)',
                    padding: '6px 12px',
                  }}
                >
                  {group.title}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      title={isCollapsed ? item.name : undefined}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: isCollapsed ? '10px 0' : '10px 12px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.88rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                        backgroundColor: isActive ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                        border: isActive ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent',
                        transition: 'var(--transition)',
                      })}
                    >
                      <Icon size={19} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Footer Profile & Logout */}
      <div
        style={{
          padding: isCollapsed ? '16px 8px' : '16px 14px',
          borderTop: '1px solid var(--card-border)',
          backgroundColor: 'rgba(9, 13, 22, 0.6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.88rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {admin?.name?.charAt(0) || 'A'}
            </div>
            {!isCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {admin?.name || 'Administrator'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {admin?.email || 'admin@sparks.com'}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="btn-icon"
              title="Logout from console"
              style={{ color: '#fb7185' }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

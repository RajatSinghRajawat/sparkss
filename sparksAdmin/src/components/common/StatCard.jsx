
const StatCard = ({ title, value, icon: Icon, color = '#f59e0b', change, description, onClick }) => {
  return (
    <div
      className="card card-hover"
      onClick={onClick}
      style={{
        padding: '24px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '140px',
      }}
    >
      {/* Subtle top-right ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: `${color}18`,
            border: `1px solid ${color}35`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {Icon && <Icon size={22} />}
        </div>
      </div>

      <div style={{ marginTop: '14px' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
          {value ?? '0'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          {change !== undefined && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: change >= 0 ? '#34d399' : '#fb7185',
              }}
            >
              {change >= 0 ? `+${change}%` : `${change}%`}
            </span>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {description || 'Total recorded'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;

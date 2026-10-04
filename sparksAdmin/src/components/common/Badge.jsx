
const Badge = ({ variant = 'active', children, style = {} }) => {
  const getStyle = () => {
    switch (variant) {
      case 'active':
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.25)',
        };
      case 'inactive':
      case 'danger':
        return {
          background: 'rgba(244, 63, 94, 0.12)',
          color: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.25)',
        };
      case 'warning':
      case 'pending':
        return {
          background: 'rgba(245, 158, 11, 0.12)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        };
      case 'indigo':
      default:
        return {
          background: 'rgba(99, 102, 241, 0.12)',
          color: '#818cf8',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        };
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'capitalize',
        ...getStyle(),
        ...style,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }}
      />
      {children}
    </span>
  );
};

export default Badge;

import React from 'react'

const AdminLogo: React.FC = () => (
  <div
    style={{
      alignItems: 'baseline',
      display: 'flex',
      gap: 10,
    }}
  >
    <span
      style={{
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}
    >
      Unave
    </span>
    <span
      style={{
        fontSize: 11,
        letterSpacing: '0.18em',
        opacity: 0.55,
        textTransform: 'uppercase',
      }}
    >
      Cloud kitchen
    </span>
  </div>
)

export default AdminLogo

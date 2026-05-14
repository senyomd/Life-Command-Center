import React from 'react'

function Button({ children, variant = 'primary', className = '', disabled, ...props }) {
  const variantClass = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    danger:    'btn-danger',
    ghost:     'btn-ghost',
  }[variant] || 'btn-primary'

  return (
    <button
      className={`btn ${variantClass} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button

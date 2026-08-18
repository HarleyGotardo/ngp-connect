import React from 'react'

export default function LogoIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <img
      src="/NGP2.png"
      alt="NGP Logo"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}

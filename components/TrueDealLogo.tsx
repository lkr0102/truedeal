// True Deal · Logo Components (web/Next.js — pure SVG, no react-native-svg)

const GREEN    = '#16A34A'
const WHITE    = '#FFFFFF'
const DARK     = '#0D0D14'
const OFF_WHITE= '#EEEEFF'

const SEAL_D = "M70 10 L78 4 L86 10 L96 8 L101 17 L111 19 L113 29 L122 34 L120 44 L128 51 L122 60 L128 70 L122 80 L128 89 L120 96 L122 106 L113 111 L111 121 L101 123 L96 132 L86 130 L78 136 L70 130 L62 136 L54 130 L44 132 L39 123 L29 121 L27 111 L18 106 L20 96 L12 89 L18 80 L12 70 L18 60 L12 51 L20 44 L18 34 L27 29 L29 19 L39 17 L44 8 L54 10 L62 4 Z"

interface IconProps {
  size?: number
  sealColor?: string
  checkColor?: string
  showDots?: boolean
  className?: string
}

export function TrueDealIcon({
  size = 60,
  className,
}: IconProps) {
  return (
    <img
      src="/brand/app-icon-logo.png"
      width={size}
      height={size}
      alt="True Deal Icon"
      className={className}
      style={{ borderRadius: "50%" }}
    />
  )
}

export function TrueDealAppIcon({ size = 100, className }: { size?: number; className?: string }) {
  return (
    <div 
      className={`relative flex items-center justify-center overflow-hidden rounded-[22%] ${className}`}
      style={{ width: size, height: size, background: DARK }}
    >
      <img
        src="/brand/app-icon-logo.png"
        width={size * 0.85}
        height={size * 0.85}
        alt="True Deal App Icon"
      />
    </div>
  )
}

interface LockupProps {
  iconSize?: number
  fontSize?: number
  variant?: 'dark' | 'light'
  className?: string
}

export function TrueDealLockup({
  iconSize = 40,
  fontSize = 24,
  variant = 'dark',
  className,
}: LockupProps) {
  const textColor = variant === 'dark' ? OFF_WHITE : '#111122'
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <TrueDealIcon size={iconSize} />
      <span style={{ fontSize, fontWeight: 300, color: textColor, letterSpacing: '-0.5px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        true<span style={{ color: GREEN }}>deal</span>
      </span>
    </div>
  )
}

export default TrueDealIcon

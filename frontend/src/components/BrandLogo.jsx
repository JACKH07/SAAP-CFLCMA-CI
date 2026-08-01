export default function BrandLogo({ size = 56, className = '', alt = 'Logo CFLCMA-CI' }) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`brand-logo ${className}`.trim()}
      decoding="async"
    />
  );
}

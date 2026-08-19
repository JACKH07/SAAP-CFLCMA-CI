import { useEffect, useState } from 'react';
import { mediaUrl } from '../utils/mediaUrl';

function initials(prenom, nom) {
  return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || '?';
}

/**
 * Avatar membre : affiche la photo stockée en base, sinon les initiales.
 * Le Super Admin n’a pas de photo de profil.
 */
export default function MemberAvatar({
  photoUrl,
  prenom,
  nom,
  isSuperAdmin = false,
  className = 'avatar-sm',
  alt = '',
}) {
  const [step, setStep] = useState(0);
  const hidePhoto = isSuperAdmin;
  const resolved = hidePhoto ? '' : mediaUrl(photoUrl);
  const raw = hidePhoto || !photoUrl ? '' : String(photoUrl).trim();
  const fallback = raw && raw !== resolved ? raw : '';
  const src = step === 0 ? resolved : step === 1 ? fallback : '';

  useEffect(() => {
    setStep(0);
  }, [photoUrl]);

  if (!src) {
    return (
      <span className={`${className} avatar-sm--ph`} aria-hidden={!alt}>
        {initials(prenom, nom)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt || `${prenom || ''} ${nom || ''}`.trim()}
      className={className}
      loading="lazy"
      onError={() => setStep((current) => (current === 0 && fallback ? 1 : 2))}
    />
  );
}

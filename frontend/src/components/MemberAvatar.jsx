import { useState } from 'react';
import { mediaUrl } from '../utils/mediaUrl';

function initials(prenom, nom) {
  return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || '?';
}

/**
 * Avatar membre : charge la photo depuis l’API, sinon initiales.
 * Les comptes admin n’affichent jamais de photo (initiales uniquement).
 */
export default function MemberAvatar({
  photoUrl,
  prenom,
  nom,
  isAdmin = false,
  isSuperAdmin = false,
  className = 'avatar-sm',
  alt = '',
}) {
  const [failed, setFailed] = useState(false);
  const hidePhoto = isAdmin || isSuperAdmin;
  const src = hidePhoto ? null : mediaUrl(photoUrl);

  if (!src || failed) {
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
      onError={() => setFailed(true)}
    />
  );
}

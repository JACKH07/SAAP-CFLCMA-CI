import { useEffect, useId, useRef, useState } from 'react';
import './ProfilePhotoCapture.css';

/**
 * Capture / sélection de photo pour l’inscription membre (mobile : caméra).
 * Réservé aux comptes utilisateur — ne pas utiliser pour les admins.
 */
export default function ProfilePhotoCapture({ value, onChange, onError }) {
  const cameraId = useId();
  const galleryId = useId();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function applyFile(file, inputEl) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Veuillez choisir une image (JPG, PNG, WEBP)');
      if (inputEl) inputEl.value = '';
      return;
    }
    onError?.('');
    onChange(file);
  }

  function clearPhoto() {
    onChange(null);
    onError?.('');
    if (cameraRef.current) cameraRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  return (
    <div className="photo-capture">
      <p className="photo-capture__label">Photo de profil</p>
      <p className="muted photo-capture__hint">
        Sur mobile, utilisez la caméra pour prendre votre photo (environ 150×150 px).
      </p>

      <div className="photo-capture__box">
        {previewUrl ? (
          <div className="photo-capture__preview-wrap">
            <img
              src={previewUrl}
              alt="Aperçu de la photo"
              className="photo-capture__preview"
            />
            <button type="button" className="btn btn-secondary photo-capture__clear" onClick={clearPhoto}>
              Supprimer
            </button>
          </div>
        ) : (
          <div className="photo-capture__placeholder" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M5 19a7 7 0 0 1 14 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>Aucune photo</span>
          </div>
        )}

        <div className="photo-capture__actions">
          <label htmlFor={cameraId} className="btn photo-capture__btn">
            Prendre une photo
          </label>
          <input
            ref={cameraRef}
            id={cameraId}
            type="file"
            accept="image/*"
            capture="user"
            className="photo-capture__input"
            onChange={(e) => applyFile(e.target.files?.[0], e.target)}
          />

          <label htmlFor={galleryId} className="btn btn-secondary photo-capture__btn">
            Galerie
          </label>
          <input
            ref={galleryRef}
            id={galleryId}
            type="file"
            accept="image/*"
            className="photo-capture__input"
            onChange={(e) => applyFile(e.target.files?.[0], e.target)}
          />
        </div>

        {value && (
          <p className="muted file-chosen photo-capture__filename">{value.name}</p>
        )}
      </div>
    </div>
  );
}

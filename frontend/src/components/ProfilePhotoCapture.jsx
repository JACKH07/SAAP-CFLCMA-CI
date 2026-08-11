import { useEffect, useId, useRef, useState } from 'react';
import './ProfilePhotoCapture.css';

const MAX_EDGE_PX = 800;
const JPEG_QUALITY = 0.85;

/**
 * Réduit la taille de la photo (mobile → upload plus fiable).
 */
async function normalizeImageFile(file) {
  if (!file || !file.type?.startsWith('image/')) return file;
  // HEIC / formats non décodables par canvas : laisser tel quel
  if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name || '')) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob) return file;

    const base = (file.name || 'photo').replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

function isLikelyImage(file) {
  if (!file) return false;
  if (file.type?.startsWith('image/')) return true;
  // Caméra Android : parfois type vide
  if (!file.type && file.size > 0) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || '');
}

/**
 * Capture / sélection de photo d’identité (inscription membre).
 * Caméra arrière par défaut (plus fiable que la selfie sur Android).
 */
export default function ProfilePhotoCapture({ value, onChange, onError }) {
  const rearId = useId();
  const selfieId = useId();
  const galleryId = useId();
  const rearRef = useRef(null);
  const selfieRef = useRef(null);
  const galleryRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function applyFile(file, inputEl) {
    if (!file) return;
    if (!isLikelyImage(file)) {
      onError?.('Veuillez choisir une image (JPG, PNG, WEBP)');
      if (inputEl) inputEl.value = '';
      return;
    }
    setBusy(true);
    onError?.('');
    try {
      const normalized = await normalizeImageFile(file);
      onChange(normalized);
    } catch {
      onChange(file);
    } finally {
      setBusy(false);
      // Permet de reprendre une nouvelle photo ensuite
      if (inputEl) inputEl.value = '';
    }
  }

  function clearPhoto() {
    onChange(null);
    onError?.('');
    if (rearRef.current) rearRef.current.value = '';
    if (selfieRef.current) selfieRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  return (
    <div className="photo-capture">
      <p className="photo-capture__label">Photo d&apos;identité</p>
      <p className="muted photo-capture__hint">
        Utilisez la <strong>caméra arrière</strong> (recommandé). Si l&apos;écran reste noir,
        fermez et choisissez <strong>Galerie</strong>, ou autorisez l&apos;accès à l&apos;appareil photo
        dans les paramètres du téléphone.
      </p>

      <div className="photo-capture__box">
        {previewUrl ? (
          <div className="photo-capture__preview-wrap">
            <img
              src={previewUrl}
              alt="Aperçu de la photo"
              className="photo-capture__preview"
            />
            <button
              type="button"
              className="btn btn-secondary photo-capture__clear"
              onClick={clearPhoto}
              disabled={busy}
            >
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
            <span>{busy ? 'Traitement…' : 'Aucune photo'}</span>
          </div>
        )}

        <div className="photo-capture__actions">
          <label htmlFor={rearId} className={`btn photo-capture__btn ${busy ? 'is-disabled' : ''}`}>
            Prendre une photo
          </label>
          <input
            ref={rearRef}
            id={rearId}
            type="file"
            accept="image/*"
            capture="environment"
            className="photo-capture__input"
            disabled={busy}
            onChange={(e) => applyFile(e.target.files?.[0], e.target)}
          />

          <label
            htmlFor={selfieId}
            className={`btn btn-secondary photo-capture__btn ${busy ? 'is-disabled' : ''}`}
          >
            Selfie
          </label>
          <input
            ref={selfieRef}
            id={selfieId}
            type="file"
            accept="image/*"
            capture="user"
            className="photo-capture__input"
            disabled={busy}
            onChange={(e) => applyFile(e.target.files?.[0], e.target)}
          />

          <label
            htmlFor={galleryId}
            className={`btn btn-secondary photo-capture__btn ${busy ? 'is-disabled' : ''}`}
          >
            Galerie
          </label>
          <input
            ref={galleryRef}
            id={galleryId}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp"
            className="photo-capture__input"
            disabled={busy}
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

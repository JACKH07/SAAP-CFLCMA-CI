import { useEffect, useId, useRef, useState } from 'react';
import IdPhotoCamera from './IdPhotoCamera';
import './ProfilePhotoCapture.css';

const MAX_EDGE_PX = 800;
const JPEG_QUALITY = 0.85;

async function normalizeImageFile(file) {
  if (!file || !file.type?.startsWith('image/')) return file;
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
  if (!file.type && file.size > 0) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || '');
}

/**
 * Photo d’identité : caméra intégrée (getUserMedia) + galerie + secours natif.
 */
export default function ProfilePhotoCapture({ value, onChange, onError }) {
  const galleryId = useId();
  const nativeId = useId();
  const galleryRef = useRef(null);
  const nativeRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

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
      if (inputEl) inputEl.value = '';
    }
  }

  function clearPhoto() {
    onChange(null);
    onError?.('');
    if (galleryRef.current) galleryRef.current.value = '';
    if (nativeRef.current) nativeRef.current.value = '';
  }

  function openCamera() {
    onError?.('');
    if (!window.isSecureContext) {
      onError?.('La caméra nécessite HTTPS. Utilisez Galerie ou l’appareil photo du téléphone.');
      return;
    }
    setCameraOpen(true);
  }

  return (
    <div className="photo-capture">
      <p className="photo-capture__label">Photo d&apos;identité</p>
      <p className="muted photo-capture__hint">
        Utilisez <strong>Photo identité (caméra)</strong> pour un aperçu en direct avec cadre visage.
        Autorisez l&apos;accès caméra lorsque le navigateur le demande.
      </p>

      <div className="photo-capture__box">
        {previewUrl ? (
          <div className="photo-capture__preview-wrap">
            <img
              src={previewUrl}
              alt="Aperçu de la photo"
              className="photo-capture__preview photo-capture__preview--id"
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
          <button
            type="button"
            className={`btn photo-capture__btn ${busy ? 'is-disabled' : ''}`}
            onClick={openCamera}
            disabled={busy}
          >
            Photo identité (caméra)
          </button>

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

          <label
            htmlFor={nativeId}
            className={`btn btn-secondary photo-capture__btn ${busy ? 'is-disabled' : ''}`}
          >
            Appareil photo
          </label>
          <input
            ref={nativeRef}
            id={nativeId}
            type="file"
            accept="image/*"
            capture="user"
            className="photo-capture__input"
            disabled={busy}
            onChange={(e) => applyFile(e.target.files?.[0], e.target)}
          />
        </div>

        {value && (
          <p className="muted file-chosen photo-capture__filename">{value.name}</p>
        )}
      </div>

      <IdPhotoCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => applyFile(file)}
        onError={onError}
      />
    </div>
  );
}

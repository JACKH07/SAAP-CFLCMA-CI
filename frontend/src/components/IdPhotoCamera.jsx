import { useCallback, useEffect, useRef, useState } from 'react';
import './IdPhotoCamera.css';

const JPEG_QUALITY = 0.88;
const MAX_EDGE = 800;

function permissionMessage(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Accès caméra refusé. Autorisez la caméra pour ce site dans les paramètres du téléphone ou du navigateur, puis réessayez.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Aucune caméra détectée sur cet appareil.';
  }
  if (name === 'NotReadableError') {
    return 'La caméra est utilisée par une autre application. Fermez-la puis réessayez.';
  }
  if (name === 'SecurityError') {
    return 'La caméra nécessite une connexion sécurisée (HTTPS).';
  }
  return 'Impossible d\'ouvrir la caméra. Utilisez Galerie ou l\'appareil photo du téléphone.';
}

function stopStream(streamRef) {
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;
}

/**
 * Prise de vue photo identité via getUserMedia (aperçu live + cadre visage).
 */
export default function IdPhotoCamera({ open, onClose, onCapture, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState('user');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const startCamera = useCallback(async () => {
    if (!open) return;
    setReady(false);
    stopStream(streamRef);

    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.('Caméra non disponible sur ce navigateur. Utilisez Galerie.');
      onClose?.();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        setReady(true);
      }
    } catch (err) {
      onError?.(permissionMessage(err));
      onClose?.();
    }
  }, [open, facing, onClose, onError]);

  useEffect(() => {
    if (!open) {
      stopStream(streamRef);
      setReady(false);
      return undefined;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    startCamera();
    return () => {
      document.body.style.overflow = prevOverflow;
      stopStream(streamRef);
    };
  }, [open, startCamera]);

  function toggleFacing() {
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  }

  async function shoot() {
    const video = videoRef.current;
    if (!video || !ready || busy) return;

    setBusy(true);
    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) throw new Error('no frame');

      // Recadrage portrait 3:4 centré (format photo identité)
      const targetRatio = 3 / 4;
      let sw = vw;
      let sh = vh;
      const currentRatio = vw / vh;

      if (currentRatio > targetRatio) {
        sw = Math.round(vh * targetRatio);
      } else {
        sh = Math.round(vw / targetRatio);
      }
      const sx = Math.round((vw - sw) / 2);
      const sy = Math.round((vh - sh) / 2);

      const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
      const cw = Math.max(1, Math.round(sw * scale));
      const ch = Math.max(1, Math.round(sh * scale));

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');

      if (facing === 'user') {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
      } else {
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
      }

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
      );
      if (!blob) throw new Error('blob');

      const file = new File([blob], `photo-identite-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      onCapture?.(file);
      onClose?.();
    } catch {
      onError?.('Échec de la capture. Réessayez ou choisissez Galerie.');
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    stopStream(streamRef);
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="id-camera" role="dialog" aria-modal="true" aria-label="Photo identité">
      <div className="id-camera__backdrop" onClick={handleClose} aria-hidden="true" />

      <div className="id-camera__panel">
        <header className="id-camera__head">
          <strong>Photo identité</strong>
          <button type="button" className="id-camera__close" onClick={handleClose} aria-label="Fermer">
            ×
          </button>
        </header>

        <p className="id-camera__hint">
          Placez votre visage dans le cadre, fond clair, regard face à l&apos;objectif.
        </p>

        <div className="id-camera__viewport">
          <video
            ref={videoRef}
            className={`id-camera__video${facing === 'user' ? ' id-camera__video--mirror' : ''}`}
            playsInline
            muted
            autoPlay
          />
          <div className="id-camera__overlay" aria-hidden="true">
            <div className="id-camera__frame" />
          </div>
          {!ready && <div className="id-camera__loading">Ouverture caméra…</div>}
        </div>

        <div className="id-camera__controls">
          <button
            type="button"
            className="btn btn-secondary id-camera__flip"
            onClick={toggleFacing}
            disabled={!ready || busy}
          >
            {facing === 'user' ? 'Caméra arrière' : 'Selfie'}
          </button>
          <button
            type="button"
            className="btn id-camera__shoot"
            onClick={shoot}
            disabled={!ready || busy}
          >
            {busy ? '…' : 'Capturer'}
          </button>
        </div>
      </div>
    </div>
  );
}

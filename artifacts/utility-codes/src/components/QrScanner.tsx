import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import {
  X,
  Upload,
  Loader2,
  SwitchCamera,
  ScanQrCode,
  LockKeyhole,
  AlertCircle,
  Image as ImageIcon,
  Zap,
  ZapOff,
} from "lucide-react";
import { playScanSuccessSound } from "@/lib/scanner-audio";

export interface QrScannerProps {
  onScan: (result: string) => void;
  onClose?: () => void;
  embedded?: boolean;
}

/**
 * Helper to decode a QR code from an image file using ZXing
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a valid image file.");
  }
  const reader = new BrowserMultiFormatReader();
  const objectUrl = URL.createObjectURL(file);

  try {
    const result = await reader.decodeFromImageUrl(objectUrl);
    URL.revokeObjectURL(objectUrl);
    return result.getText();
  } catch {
    // Canvas fallback for high-res images
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const res = await reader.decodeFromImageElement(img);
          resolve(res.getText());
        } catch {
          reject(new Error("No QR code detected. Try a clearer image."));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image."));
      };
      img.src = objectUrl;
    });
  }
}

export function QrScanner({ onScan, onClose, embedded = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch { }
      controlsRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch { }
      });
      activeStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const decodeImageFile = useCallback(
    async (file: File) => {
      setIsDecodingFile(true);
      setError("");
      try {
        const text = await decodeQrFromImageFile(file);
        playScanSuccessSound();
        onScan(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read QR code.");
      } finally {
        setIsDecodingFile(false);
      }
    },
    [onScan]
  );

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopCamera();
      setError("");
      setLoading(true);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera not supported on this device or requires HTTPS.");
        setLoading(false);
        return;
      }

      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
        setCameras(videoInputs);

        if (!videoRef.current) return;

        const codeReader = new BrowserMultiFormatReader();
        const constraints: MediaStreamConstraints = deviceId
          ? { video: { deviceId: { exact: deviceId } } }
          : { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } };

        let controls: IScannerControls;
        try {
          controls = await codeReader.decodeFromConstraints(
            constraints,
            videoRef.current,
            (result, _err, ctrl) => {
              if (result) {
                playScanSuccessSound();
                onScan(result.getText());
                ctrl.stop();
              }
            }
          );
        } catch {
          controls = await codeReader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result, _err, ctrl) => {
              if (result) {
                playScanSuccessSound();
                onScan(result.getText());
                ctrl.stop();
              }
            }
          );
        }

        controlsRef.current = controls;

        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          activeStreamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          if (track) {
            const caps = track.getCapabilities?.() as { torch?: boolean } | undefined;
            if (caps?.torch) setTorchAvailable(true);
          }
        }
        setLoading(false);
      } catch (e) {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Camera access failed. Please check permissions.");
      }
    },
    [onScan, stopCamera]
  );

  const toggleTorch = async () => {
    if (!activeStreamRef.current) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as any);
      setTorchOn(!torchOn);
    } catch { }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    if (nextCamera) {
      setSelectedCameraId(nextCamera.deviceId);
      startCamera(nextCamera.deviceId);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => startCamera(selectedCameraId || undefined), 200);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [selectedCameraId, startCamera, stopCamera]);

  useEffect(() => {
    if (embedded || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { stopCamera(); onClose(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [embedded, onClose, stopCamera]);

  const content = (
    <div
      className={`scanner-card ${isDragOver ? "drag-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault(); setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) decodeImageFile(file);
      }}
    >
      {/* Header */}
      <div className="scanner-header">
        <div className="scanner-title-wrap">
          <span className="scanner-tile" aria-hidden="true">
            <ScanQrCode size={20} />
          </span>
          <div>
            <h3 className="scanner-title">Scan a QR code</h3>
            <p className="scanner-subtitle">Line the code up inside the frame</p>
          </div>
        </div>

        <div className="scanner-header-actions">
          {torchAvailable && (
            <button
              type="button"
              className={`scanner-icon-btn ${torchOn ? "active" : ""}`}
              onClick={toggleTorch}
              title="Toggle flash"
            >
              {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
            </button>
          )}
          {cameras.length > 1 && (
            <button type="button" className="scanner-icon-btn" onClick={switchCamera} title="Switch camera">
              <SwitchCamera size={18} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="scanner-icon-btn scanner-close-btn"
              onClick={() => { stopCamera(); onClose(); }}
              title="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Viewfinder */}
      <div className="scanner-viewfinder">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`scanner-video-feed ${loading || error ? "hidden" : ""}`}
        />

        {/* Loading Spinner */}
        {loading && !error && (
          <div className="scanner-state-overlay">
            <Loader2 className="scanner-spinner" size={32} />
            <p>Starting camera...</p>
          </div>
        )}

        {/* Decoding Image File State */}
        {isDecodingFile && (
          <div className="scanner-state-overlay">
            <Loader2 className="scanner-spinner" size={32} />
            <p>Reading QR code...</p>
          </div>
        )}

        {/* Reticle */}
        {!error && !loading && (
          <div className="scanner-reticle" aria-hidden="true">
            <div className="reticle-corner reticle-tl" />
            <div className="reticle-corner reticle-tr" />
            <div className="reticle-corner reticle-bl" />
            <div className="reticle-corner reticle-br" />
            <div className="scanner-laser" />
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="scanner-error-card">
            <AlertCircle size={40} className="scanner-error-icon" />
            <h4>Camera Error</h4>
            <p>{error}</p>
            <div className="scanner-error-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => startCamera(selectedCameraId || undefined)}
              >
                Try Again
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Image
              </button>
            </div>
          </div>
        )}

        {/* Drag Over Overlay */}
        {isDragOver && (
          <div className="scanner-drag-overlay">
            <ImageIcon size={40} />
            <p>Drop image to scan</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="scanner-footer">
        <div className="scanner-hints">
          <LockKeyhole size={14} />
          <span>Decoded on your device — nothing is uploaded</span>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) decodeImageFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="scanner-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} /> Scan from image
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) return <div className="scanner-embedded-wrap">{content}</div>;

  return (
    <div
      className="scanner-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="QR code scanner"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) { stopCamera(); onClose(); }
      }}
    >
      <div className="scanner-modal">{content}</div>
    </div>
  );
}

export default QrScanner;
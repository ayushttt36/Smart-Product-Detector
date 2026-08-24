import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, Image as ImageIcon, Loader2, ScanLine, Search } from "lucide-react";

type Props = {
  onCode: (code: string) => void;
  busy: boolean;
  statusText?: string | undefined;
};

/** Camera / image-upload / manual entry QR capture. Decoding happens on the captured pixels. */
export function QrScanner({ onCode, busy, statusText }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => stopCamera, []);

  function decodeFrom(source: HTMLVideoElement | HTMLImageElement, w: number, h: number) {
    const canvas = canvasRef.current;
    if (!canvas || !w || !h) return null;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    return jsQR(image.data, w, h, { inversionAttempts: "attemptBoth" })?.data ?? null;
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const tick = () => {
        if (!streamRef.current || !videoRef.current) return;
        const v = videoRef.current;
        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          const code = decodeFrom(v, v.videoWidth, v.videoHeight);
          if (code) {
            stopCamera();
            onCode(code);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Camera access was blocked. Upload a QR image or enter the code manually.");
      stopCamera();
    }
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    const img = new Image();
    img.onload = () => {
      const code = decodeFrom(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(img.src);
      if (code) onCode(code);
      else setError("No QR code could be read from that image. Try a clearer photo.");
    };
    img.onerror = () => setError("That file could not be opened as an image.");
    img.src = URL.createObjectURL(file);
  }

  return (
    <div className="panel p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        <ScanLine className="size-4 text-primary" /> QR Product Verification
      </div>

      <div className="scanner-frame flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`size-full object-cover ${scanning ? "" : "hidden"}`}
        />
        {!scanning && (
          <div className="px-6 text-center">
            <Camera className="mx-auto size-10 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              Point the product QR code at your camera, upload a photo of it, or type the code.
            </p>
          </div>
        )}
        {scanning && <div className="scan-line" />}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-5 flex flex-wrap gap-3">
        {scanning ? (
          <button onClick={stopCamera} className="btn btn-ghost">
            <CameraOff className="size-4" /> Stop camera
          </button>
        ) : (
          <button onClick={startCamera} className="btn btn-primary" disabled={busy}>
            <Camera className="size-4" /> Scan QR code
          </button>
        )}
        <label className="btn btn-ghost cursor-pointer">
          <ImageIcon className="size-4" /> Upload QR image
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!manual.trim()) {
            setError("Enter a product code first.");
            return;
          }
          setError(null);
          onCode(manual.trim());
        }}
      >
        <input
          className="field-input font-mono"
          placeholder="Or enter the product code manually"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn btn-ghost" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Verify
        </button>
      </form>

      {(error || statusText) && (
        <p
          className={`mt-4 text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
          role="status"
        >
          {error ?? statusText}
        </p>
      )}
    </div>
  );
}

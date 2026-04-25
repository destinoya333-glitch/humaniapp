"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onAudioReady: (audio: Blob, durationSeconds: number) => void;
  disabled?: boolean;
};

/**
 * Push-to-talk voice recorder using MediaRecorder API.
 * - Hold the button to record
 * - Release to send
 * - Mobile: tap to start, tap again to stop
 */
export default function VoiceRecorder({ onAudioReady, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [hasMic, setHasMic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      setHasMic(true);
    } else {
      setHasMic(false);
    }
  }, []);

  async function start() {
    if (disabled || recording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        const dur = (Date.now() - startedAtRef.current) / 1000;
        onAudioReady(blob, dur);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
    } catch (e) {
      setError("Couldn't access microphone. Please grant permission.");
      setRecording(false);
      console.error(e);
    }
  }

  function stop() {
    if (!recording) return;
    mediaRecRef.current?.stop();
    setRecording(false);
  }

  if (hasMic === false) {
    return (
      <div className="text-sm text-red-600">
        Your browser doesn&apos;t support microphone access.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onMouseDown={start}
        onMouseUp={stop}
        onMouseLeave={() => recording && stop()}
        onTouchStart={(e) => {
          e.preventDefault();
          start();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stop();
        }}
        disabled={disabled}
        className={`w-24 h-24 rounded-full text-white font-semibold transition-all select-none ${
          recording
            ? "bg-red-500 scale-110 animate-pulse"
            : disabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {recording ? "🎙️ REC" : "🎤 Hold"}
      </button>
      <p className="text-xs text-gray-500">
        {recording ? "Speaking..." : "Press and hold to speak"}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

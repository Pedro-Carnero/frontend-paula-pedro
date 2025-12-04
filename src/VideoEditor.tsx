// src/VideoEditor.tsx
import React, { useState, useRef, useEffect } from "react";

type Id = string;

type VideoAsset = {
  id: Id;
  name: string;
  url: string;
  duration?: number;
};

type AudioAsset = {
  id: Id;
  name: string;
  url: string;
  duration?: number;
};

type VideoSegment = {
  id: Id;
  assetId: Id;
  sourceStart: number;
  duration: number;
  timelineStart: number;
};

type AudioSegment = {
  id: Id;
  assetId: Id;
  sourceStart: number;
  duration: number;
  timelineStart: number;
};

function createId(): Id {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
const PIXELS_PER_SECOND = 80;

// Devuelve el segundo donde termina la timeline de video
const getVideoTimelineEnd = (segments: VideoSegment[]) => {
  return segments.reduce((end, s) => {
    const segmentEnd = s.timelineStart + s.duration;
    return segmentEnd > end ? segmentEnd : end;
  }, 0);
};


const safePlay = (media: HTMLMediaElement | null) => {
  if (!media) return;
  const p = media.play();
  if (p && typeof p.then === "function") {
    p.catch((err) => {
      // Evita que reviente cuando el play es interrumpido por un cambio de src
      console.warn("Playback interrupted:", err);
    });
  }
};

const VideoEditor: React.FC = () => {
  const [videoAssets, setVideoAssets] = useState<VideoAsset[]>([]);
  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [videoAspect, setVideoAspect] = useState<"vertical" | "horizontal">("vertical");


  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const [selectedVideoSegmentId, setSelectedVideoSegmentId] = useState<Id | null>(null);
  const [selectedAudioSegmentId, setSelectedAudioSegmentId] = useState<Id | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const selectedVideoSegment =
    videoSegments.find(s => s.id === selectedVideoSegmentId) || null;
  const selectedAudioSegment =
    audioSegments.find(s => s.id === selectedAudioSegmentId) || null;

  const selectedVideoAsset =
    selectedVideoSegment ? videoAssets.find(a => a.id === selectedVideoSegment.assetId) || null : null;
  const selectedAudioAsset =
    selectedAudioSegment ? audioAssets.find(a => a.id === selectedAudioSegment.assetId) || null : null;

  // UPLOAD HANDLERS
  const handleVideoUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files;
    if (!files) return;

    const newAssets: VideoAsset[] = [];
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      newAssets.push({ id: createId(), name: file.name, url });
    });

    setVideoAssets(prev => [...prev, ...newAssets]);
  };

  const handleAudioUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files;
    if (!files) return;

    const newAssets: AudioAsset[] = [];
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      newAssets.push({ id: createId(), name: file.name, url });
    });

    setAudioAssets(prev => [...prev, ...newAssets]);
  };

const addVideoToTimeline = (asset: VideoAsset) => {
  const defaultDuration = asset.duration ?? 10;
  const newId = createId();

  const segment: VideoSegment = {
    id: newId,
    assetId: asset.id,
    sourceStart: 0,
    duration: defaultDuration,
    timelineStart: 0,   // igual que AutoCut
  };

  setVideoSegments(prev => [...prev, segment]);
  setSelectedVideoSegmentId(newId);
};
// AutoCut para un asset concreto (botón al lado de cada vídeo)
const handleAutoCutForAsset = (asset: VideoAsset) => {
  // Aquí simulas la respuesta del backend:
  const HIGHLIGHTS: { start: number; end: number }[] = [
    { start: 2, end: 4 },
    { start: 6, end: 7 },
    { start: 9, end: 10 },
  ];



  const newSegments: VideoSegment[] = HIGHLIGHTS.map((h) => {
    const duration = h.end - h.start;

    return {
      id: createId(),
      assetId: asset.id,
      sourceStart: h.start,   // respeta inicio en el raw
      duration,               // respeta duración en el raw
      timelineStart: 0,       // igual que cuando lo añades a mano
    };
  });

  if (newSegments.length === 0) return;

  setVideoSegments((prev) => [...prev, ...newSegments]);
  setSelectedVideoSegmentId(newSegments[0].id);
};

// AutoCut para TODOS los vídeos subidos
const handleAutoCutAll = () => {
  if (videoAssets.length === 0) {
    alert("Primero sube al menos un vídeo para poder usar AutoCut");
    return;
  }

  // Simulamos la respuesta del backend: mismos HIGHLIGHTS para todos
  const HIGHLIGHTS: { start: number; end: number }[] = [
    { start: 2, end: 4 },
    { start: 6, end: 7 },
    { start: 9, end: 10 },
  ];

  const allNewSegments: VideoSegment[] = [];

  videoAssets.forEach((asset) => {
    const newSegmentsForAsset: VideoSegment[] = HIGHLIGHTS.map((h) => {
      const duration = h.end - h.start;

      return {
        id: createId(),
        assetId: asset.id,
        sourceStart: h.start,
        duration,
        timelineStart: 0, // igual que cuando añades o autocutas uno solo
      };
    });

    allNewSegments.push(...newSegmentsForAsset);
  });

  if (allNewSegments.length === 0) return;

  setVideoSegments((prev) => [...prev, ...allNewSegments]);
  setSelectedVideoSegmentId(allNewSegments[0].id);
};


  const addAudioToTimeline = (asset: AudioAsset) => {
    const defaultDuration = asset.duration ?? 10;
    const segment: AudioSegment = {
      id: createId(),
      assetId: asset.id,
      sourceStart: 0,
      duration: defaultDuration,
      timelineStart: 0
    };
    setAudioSegments(prev => [...prev, segment]);
    setSelectedAudioSegmentId(segment.id);
  };

  // AUTOCUT: crea segmentos desde un JSON de highlights
const handleAutoCut = () => {
  if (videoAssets.length === 0) {
    alert("Primero sube un video para poder usar AutoCut");
    return;
  }
  const handleAutoCutForAsset = (asset: VideoAsset) => {
  // Highlights simulados — luego lo cambiarás por tu JSON real
  const HIGHLIGHTS: { start: number; end: number }[] = [
    { start: 2, end: 4 },
    { start: 6, end: 7 },
    { start: 9, end: 10 },
  ];

  const newSegments: VideoSegment[] = HIGHLIGHTS.map((h) => {
    const duration = h.end - h.start;

    return {
      id: createId(),
      assetId: asset.id,
      sourceStart: h.start,
      duration,
      timelineStart: 0, // igual que cuando añades a mano
    };
  });

  setVideoSegments((prev) => [...prev, ...newSegments]);
  setSelectedVideoSegmentId(newSegments[0].id);
};


  const baseAsset = videoAssets[0];

  // Simulamos la respuesta del backend:
  // trozos buenos en el raw video
  const HIGHLIGHTS: { start: number; end: number }[] = [
    { start: 2, end: 4 },
    { start: 6, end: 7 },
    { start: 9, end: 10 },
  ];

  // Creamos segmentos igual que si el usuario hiciera +Timeline,
  // pero usando start/end del raw
  const newSegments: VideoSegment[] = HIGHLIGHTS.map(h => {
    const duration = h.end - h.start;

    return {
      id: createId(),
      assetId: baseAsset.id,
      sourceStart: h.start,      // respeta inicio en el raw
      duration,                  // respeta duración en el raw
      timelineStart: 0,          // EXACTAMENTE igual que los manuales
    };
  });

  if (newSegments.length === 0) return;

  // Flex se encarga de ponerlos uno detrás de otro
  setVideoSegments(prev => [...prev, ...newSegments]);

  // seleccionamos el primer segmento nuevo
  setSelectedVideoSegmentId(newSegments[0].id);
};


  // Capture metadata durations
  const handleVideoLoadedMetadata = (assetId: Id, duration: number) => {
    setVideoAssets(prev => prev.map(a => (a.id === assetId ? { ...a, duration } : a)));
  };

  const handleAudioLoadedMetadata = (assetId: Id, duration: number) => {
    setAudioAssets(prev => prev.map(a => (a.id === assetId ? { ...a, duration } : a)));
  };

  // Returns the next segment in time after the current one
  const getNextVideoSegment = () => {
    if (!selectedVideoSegment) return null;

    // Order segments by timelineStart
    const sorted = [...videoSegments].sort((a, b) => a.timelineStart - b.timelineStart);

    // Find next segment after this one
    const idx = sorted.findIndex(s => s.id === selectedVideoSegment.id);
    return sorted[idx + 1] ?? null;
  };

  // Play/pause toggle
  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isPlaying) {
      // Elegimos segmento de inicio
      let startSegment = selectedVideoSegment;

      // Si no hay seleccionado, cogemos el primero en la timeline
      if (!startSegment && videoSegments.length > 0) {
        const sorted = [...videoSegments].sort((a, b) => a.timelineStart - b.timelineStart);
        startSegment = sorted[0];
        setSelectedVideoSegmentId(startSegment.id);
      }

      if (!startSegment) return;

      // Marcamos que estamos reproduciendo
      setIsPlaying(true);
      // El efecto de abajo se encargara de posicionar y hacer play
    } else {
      setIsPlaying(false);
      video.pause();
    }
  };

  const toggleAudioPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isAudioPlaying) {
      // Elegimos segmento de inicio
      let startSegment = selectedAudioSegment;

      // Si no hay seleccionado, cogemos el primero en la timeline
      if (!startSegment && audioSegments.length > 0) {
        const sorted = [...audioSegments].sort((a, b) => a.timelineStart - b.timelineStart);
        startSegment = sorted[0];
        setSelectedAudioSegmentId(startSegment.id);
      }

      if (!startSegment) return;

      setIsAudioPlaying(true);
      // El efecto de abajo se encargara de posicionar y hacer play
    } else {
      setIsAudioPlaying(false);
      audio.pause();
    }
  };

  // Cuando cambia el segmento de video seleccionado y estamos en modo isPlaying,
  // recolocamos el video y le damos a play
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedVideoSegment || !isPlaying) return;

    video.currentTime = selectedVideoSegment.sourceStart;
    safePlay(video);
  }, [selectedVideoSegment, selectedVideoAsset, isPlaying]);

  // Cuando cambia el segmento de audio seleccionado y estamos en modo isAudioPlaying
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedAudioSegment || !isAudioPlaying) return;

    audio.currentTime = selectedAudioSegment.sourceStart;
    safePlay(audio);
  }, [selectedAudioSegment, selectedAudioAsset, isAudioPlaying]);

  // Stop playback when segment duration ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedVideoSegment) return;

    const stopAt = selectedVideoSegment.sourceStart + selectedVideoSegment.duration;

    const onTimeUpdate = () => {
      if (!isPlaying) return;

      if (video.currentTime >= stopAt) {
        const next = getNextVideoSegment();

        if (next) {
          // Cambiamos el segmento; el efecto de arriba recoloca y da play
          setSelectedVideoSegmentId(next.id);
        } else {
          setIsPlaying(false);
          video.pause();
        }
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [selectedVideoSegment, isPlaying, videoSegments]);

  // Auto play next audio segment
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedAudioSegment) return;

    const stopAt = selectedAudioSegment.sourceStart + selectedAudioSegment.duration;

    const onTimeUpdate = () => {
      if (!isAudioPlaying) return;

      if (audio.currentTime >= stopAt) {
        const sorted = [...audioSegments].sort((a, b) => a.timelineStart - b.timelineStart);
        const idx = sorted.findIndex(s => s.id === selectedAudioSegment.id);
        const next = sorted[idx + 1];

        if (next) {
          setSelectedAudioSegmentId(next.id);
        } else {
          setIsAudioPlaying(false);
          audio.pause();
        }
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [selectedAudioSegment, audioSegments, isAudioPlaying]);

  // Segment editing helpers
  const updateVideoSegment = (id: Id, patch: Partial<VideoSegment>) => {
    setVideoSegments(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const updateAudioSegment = (id: Id, patch: Partial<AudioSegment>) => {
    setAudioSegments(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const deleteVideoSegment = (id: Id) => {
    setVideoSegments(prev => prev.filter(s => s.id !== id));
    if (selectedVideoSegmentId === id) setSelectedVideoSegmentId(null);
  };

  const deleteAudioSegment = (id: Id) => {
    setAudioSegments(prev => prev.filter(s => s.id !== id));
    if (selectedAudioSegmentId === id) setSelectedAudioSegmentId(null);
  };

  // Drag state
  const dragState = useRef<{
    id: string | null;
    initialX: number;
    initialOffset: number;
  } | null>(null);

  const resizeState = useRef<{
    id: string | null;
    edge: "left" | "right";
    initialX: number;
    initialSourceStart: number;
    initialDuration: number;
  } | null>(null);

  // Start drag
  const onSegmentMouseDown = (
    e: React.MouseEvent,
    segmentId: string,
    initialTimelineStart: number
  ) => {
    dragState.current = {
      id: segmentId,
      initialX: e.clientX,
      initialOffset: initialTimelineStart,
    };
  };

  // Handle drag movement globally
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragState.current) {
        const deltaPx = e.clientX - dragState.current.initialX;
        const deltaSec = deltaPx / PIXELS_PER_SECOND;

        const updated = dragState.current.initialOffset + deltaSec;

        setVideoSegments(prev =>
          prev.map(seg =>
            seg.id === dragState.current!.id ? { ...seg, timelineStart: Math.max(0, updated) } : seg
          )
        );

        setAudioSegments(prev =>
          prev.map(seg =>
            seg.id === dragState.current!.id ? { ...seg, timelineStart: Math.max(0, updated) } : seg
          )
        );
      }

      if (resizeState.current) {
        onResize(e);
      }
    };

    // Resize logic
    const onResize = (e: MouseEvent) => {
      if (!resizeState.current) return;

      const deltaPx = e.clientX - resizeState.current.initialX;
      const deltaSecs = deltaPx / PIXELS_PER_SECOND;

      setVideoSegments(prev =>
        prev.map(seg => {
          if (seg.id !== resizeState.current!.id) return seg;

          let newStart = resizeState.current!.initialSourceStart;
          let newDuration = resizeState.current!.initialDuration;

          if (resizeState.current!.edge === "left") {
            newStart = Math.max(0, resizeState.current!.initialSourceStart + deltaSecs);
            newDuration = resizeState.current!.initialDuration - deltaSecs;
          } else {
            newDuration = resizeState.current!.initialDuration + deltaSecs;
          }

          // Clamp duration
          const asset = videoAssets.find(a => a.id === seg.assetId);
          const max = asset?.duration ?? Infinity;
          newDuration = Math.max(0.1, Math.min(newDuration, max - newStart));

          return { ...seg, sourceStart: newStart, duration: newDuration };
        })
      );

      setAudioSegments(prev =>
        prev.map(seg => {
          if (seg.id !== resizeState.current!.id) return seg;

          let newStart = resizeState.current!.initialSourceStart;
          let newDuration = resizeState.current!.initialDuration;

          if (resizeState.current!.edge === "left") {
            newStart = Math.max(0, resizeState.current!.initialSourceStart + deltaSecs);
            newDuration = resizeState.current!.initialDuration - deltaSecs;
          } else {
            newDuration = resizeState.current!.initialDuration + deltaSecs;
          }

          const asset = audioAssets.find(a => a.id === seg.assetId);
          const max = asset?.duration ?? Infinity;
          newDuration = Math.max(0.1, Math.min(newDuration, max - newStart));

          return { ...seg, sourceStart: newStart, duration: newDuration };
        })
      );
    };

    const onMouseUp = () => {
      dragState.current = null;
      resizeState.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* LEFT PANEL */}
      <aside style={{ width: 260, borderRight: "1px solid #ddd", padding: 12 }}>
        <h2>Assets</h2>

        {/* Video Upload */}
        <h3>Videos</h3>
        <input type="file" accept="video/*" multiple onChange={handleVideoUpload} />
        <ul style={{ maxHeight: 150, overflowY: "auto", padding: 0 }}>
  {videoAssets.map(asset => (
    <li
      key={asset.id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
      }}
    >
      {/* Portada del video */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          overflow: "hidden",
          background: "#000",
          flexShrink: 0,
        }}
      >
        <video
          src={asset.url}
          muted
          playsInline
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Texto y botones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Nombre opcional, recortado para que no quede feo */}
        <span
          style={{
            fontSize: "0.75rem",
            maxWidth: 150,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "#444",
          }}
          title={asset.name}
        >
          {asset.name}
        </span>

        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => addVideoToTimeline(asset)}>+ Timeline</button>
          <button onClick={() => handleAutoCutForAsset(asset)}>AutoCut</button>
        </div>
      </div>

      {/* Video oculto para leer duración, igual que antes */}
      {!asset.duration && (
        <video
          src={asset.url}
          style={{ display: "none" }}
          onLoadedMetadata={(e) =>
            handleVideoLoadedMetadata(asset.id, e.currentTarget.duration)
          }
        />
      )}
    </li>
  ))}
</ul>

        {/* Audio upload */}
        <h3>Audios</h3>
        <input type="file" accept="audio/*" multiple onChange={handleAudioUpload} />
        <ul style={{ maxHeight: 150, overflowY: "auto", padding: 0 }}>
          {audioAssets.map(asset => (
            <li key={asset.id}>
              {asset.name}
              <button onClick={() => addAudioToTimeline(asset)}>+ Timeline</button>
              {!asset.duration && (
                <audio
                  src={asset.url}
                  style={{ display: "none" }}
                  onLoadedMetadata={(e) => handleAudioLoadedMetadata(asset.id, e.currentTarget.duration)}
                />
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
       <header
  style={{
    padding: 10,
    borderBottom: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  }}
>
  <strong>Proyecto sin nombre</strong>

  {/* Controles arriba a la derecha */}
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <select
      value={videoAspect}
      onChange={(e) => setVideoAspect(e.target.value as any)}
    >
      <option value="vertical">9:16 (Vertical)</option>
      <option value="horizontal">16:9 (Horizontal)</option>
    </select>

    <button onClick={handleAutoCutAll}>
      AutoCut todos los vídeos
    </button>
  </div>
</header>




        {/* Preview */}
        <section style={{ display: "flex", padding: 12, gap: 16, borderBottom: "1px solid #eee" }}>
          {/* Video preview */}
          <div style={{ flex: 2 }}>
            <h3>Preview</h3>
            <div
  style={{
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: videoAspect === "vertical" ? "270px" : "480px",
    height: videoAspect === "vertical" ? "480px" : "270px",
    margin: "0 auto",
    borderRadius: "8px",
    overflow: "hidden",
  }}
>

              {selectedVideoAsset ? (
                <video ref={videoRef} src={selectedVideoAsset.url} style={{ maxWidth: "100%", maxHeight: "100%" }} />
              ) : (
                <span style={{ color: "#aaa" }}>Selecciona un segmento</span>
              )}
            </div>

            <button onClick={togglePlayback} disabled={videoSegments.length === 0}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>

          </div>

          {/* Audio preview */}
          <div style={{ flex: 1 }}>
            <h3>Audio seleccionado</h3>
            {selectedAudioAsset ? (
              <>
                <p>{selectedAudioAsset.name}</p>
                <audio ref={audioRef} src={selectedAudioAsset.url} controls style={{ width: "100%" }} />
                <div style={{ marginTop: 8 }}>
                  <button onClick={toggleAudioPlayback} disabled={audioSegments.length === 0}>
                    {isAudioPlaying ? "⏸ Pause audio" : "▶ Play audio"}
                  </button>
                </div>
              </>
            ) : (
              <span style={{ color: "#aaa" }}>Selecciona audio</span>
            )}
          </div>
        </section>

        {/* TIMELINE */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12 }}>
          {/* VIDEO TRACK */}
          <h4>Video</h4>
          <div style={{ border: "1px solid #ccc", minHeight: 60, display: "flex", gap: 8, overflowX: "auto" }}>
            {videoSegments.map(seg => {
              const asset = videoAssets.find(a => a.id === seg.assetId);
              const isSelected = seg.id === selectedVideoSegmentId;
              return (
                <div
                  key={seg.id}
                  onMouseDown={(e) => onSegmentMouseDown(e, seg.id, seg.timelineStart)}
                  onClick={() => setSelectedVideoSegmentId(seg.id)}
                  style={{
                    position: "relative",
                    marginLeft: `${seg.timelineStart * PIXELS_PER_SECOND}px`,
                    width: `${seg.duration * PIXELS_PER_SECOND}px`,
                    padding: "4px",
                    borderRadius: "4px",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #ccc",
                    background: isSelected ? "#eff6ff" : "#f9fafb",
                    cursor: "grab",
                    fontSize: "0.8rem",
                  }}
                >
                  {/* LEFT resize handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      resizeState.current = {
                        id: seg.id,
                        edge: "left",
                        initialX: e.clientX,
                        initialSourceStart: seg.sourceStart,
                        initialDuration: seg.duration,
                      };
                    }}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "6px",
                      background: "rgba(0,0,0,0.2)",
                      cursor: "ew-resize",
                    }}
                  />

                  {/* RIGHT resize handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      resizeState.current = {
                        id: seg.id,
                        edge: "right",
                        initialX: e.clientX,
                        initialSourceStart: seg.sourceStart,
                        initialDuration: seg.duration,
                      };
                    }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: "6px",
                      background: "rgba(0,0,0,0.2)",
                      cursor: "ew-resize",
                    }}
                  />

                  <strong>{asset?.name ?? "Clip"}</strong>
                        {/* Botón borrar */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // para que no seleccione el segmento al borrar
          deleteVideoSegment(seg.id);
        }}
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          border: "none",
          background: "rgba(0,0,0,0.6)",
          color: "white",
          borderRadius: "50%",
          width: 18,
          height: 18,
          fontSize: 10,
          cursor: "pointer",
        }}
      >
        ✕
      </button>

                </div>

              );
            })}
          </div>

          {selectedVideoSegment && (
            <div style={{ border: "1px solid #ddd", padding: 8, marginTop: 8 }}>
              <strong>Editar segmento video</strong>
              <label>
                Source start:
                <input
                  type="number"
                  step="0.1"
                  value={selectedVideoSegment.sourceStart}
                  onChange={(e) =>
                    updateVideoSegment(selectedVideoSegment.id, { sourceStart: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Duration:
                <input
                  type="number"
                  step="0.1"
                  value={selectedVideoSegment.duration}
                  onChange={(e) =>
                    updateVideoSegment(selectedVideoSegment.id, { duration: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Timeline start:
                <input
                  type="number"
                  step="0.1"
                  value={selectedVideoSegment.timelineStart}
                  onChange={(e) =>
                    updateVideoSegment(selectedVideoSegment.id, { timelineStart: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          )}

          {/* AUDIO TRACK */}
          <h4>Audio</h4>
          <div style={{ border: "1px solid #ccc", minHeight: 60, display: "flex", gap: 8, overflowX: "auto" }}>
            {audioSegments.map(seg => {
              const asset = audioAssets.find(a => a.id === seg.assetId);
              const isSelected = seg.id === selectedAudioSegmentId;
              return (
                <div
                  key={seg.id}
                  onMouseDown={(e) => onSegmentMouseDown(e, seg.id, seg.timelineStart)}
                  onClick={() => setSelectedAudioSegmentId(seg.id)}
                  style={{
                    position: "relative",
                    marginLeft: `${seg.timelineStart * PIXELS_PER_SECOND}px`,
                    width: `${seg.duration * PIXELS_PER_SECOND}px`,
                    padding: "4px",
                    borderRadius: "4px",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #ccc",
                    background: isSelected ? "#eff6ff" : "#f9fafb",
                    cursor: "grab",
                    fontSize: "0.8rem",
                  }}
                >
                  {/* LEFT resize handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      resizeState.current = {
                        id: seg.id,
                        edge: "left",
                        initialX: e.clientX,
                        initialSourceStart: seg.sourceStart,
                        initialDuration: seg.duration,
                      };
                    }}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "6px",
                      background: "rgba(0,0,0,0.2)",
                      cursor: "ew-resize",
                    }}
                  />

                  {/* RIGHT resize handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      resizeState.current = {
                        id: seg.id,
                        edge: "right",
                        initialX: e.clientX,
                        initialSourceStart: seg.sourceStart,
                        initialDuration: seg.duration,
                      };
                    }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: "6px",
                      background: "rgba(0,0,0,0.2)",
                      cursor: "ew-resize",
                    }}
                  />

                  <strong>{asset?.name ?? "Clip"}</strong>
                  <button
        onClick={(e) => {
          e.stopPropagation();
          deleteAudioSegment(seg.id);
        }}
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          border: "none",
          background: "rgba(0,0,0,0.6)",
          color: "white",
          borderRadius: "50%",
          width: 18,
          height: 18,
          fontSize: 10,
          cursor: "pointer",
        }}
      >
        ✕
      </button>
                </div>
              );
            })}
          </div>

          {selectedAudioSegment && (
            <div style={{ border: "1px solid #ddd", padding: 8, marginTop: 8 }}>
              <strong>Editar segmento audio</strong>
              <label>
                Source start:
                <input
                  type="number"
                  step="0.1"
                  value={selectedAudioSegment.sourceStart}
                  onChange={(e) =>
                    updateAudioSegment(selectedAudioSegment.id, { sourceStart: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Duration:
                <input
                  type="number"
                  step="0.1"
                  value={selectedAudioSegment.duration}
                  onChange={(e) =>
                    updateAudioSegment(selectedAudioSegment.id, { duration: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Timeline start:
                <input
                  type="number"
                  step="0.1"
                  value={selectedAudioSegment.timelineStart}
                  onChange={(e) =>
                    updateAudioSegment(selectedAudioSegment.id, { timelineStart: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default VideoEditor;

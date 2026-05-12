import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { ColorContext } from "../contexts/ColorContext";
import { itemAPI } from "../services/api";
import useNotification from "../hooks/useNotification";
import { pickReadableTextColor } from "../utils/colorUtils";
import ConstellationBackground from "./ConstellationBackground";
import spinAudio from "../../audio/audio.mp3";

const FULL_ROTATIONS = 12;
const SPIN_DURATION = 15000; // 15 giây
const AUTO_SPIN_SPEED = 0.0015; // Tốc độ quay tự động

// Fixed vibrant colors
const FIXED_COLORS = [
  "#f44336", // red
  "#e91e63", // pink
  "#9c27b0", // purple
  "#673ab7", // deep purple
  "#3f51b5", // indigo
  "#2196f3", // blue
  "#03a9f4", // light blue
  "#00bcd4", // cyan
  "#009688", // teal
  "#4caf50", // green
  "#8bc34a", // light green
  "#cddc39", // lime
  "#ffeb3b", // yellow
  "#ffc107", // amber
  "#ff9800", // orange
  "#ff5722", // deep orange
];

const Wheel = ({
  items,
  isSpinning,
  onSpinStateChange,
  onSpinComplete,
  size = 540,
  isFullscreen = false,
}) => {
  const { setPointerColor } = useContext(ColorContext);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [pixelSize, setPixelSize] = useState(size);
  const [localSpinning, setLocalSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const lastSegmentRef = useRef(-1);
  const audioRef = useRef(null);
  const { notify, contextHolder } = useNotification();

  const sliceAngle = useMemo(() => {
    return items.length ? 360 / items.length : 0;
  }, [items.length]);

  const sectorColors = useMemo(() => {
    return items.map((_, index) => FIXED_COLORS[index % FIXED_COLORS.length]);
  }, [items.length]);

  const currentPointerColor = useMemo(() => {
    if (!items.length) return "#ef4444";

    const arc = (2 * Math.PI) / items.length;
    let segmentIndex = Math.floor(
      (((3 * Math.PI) / 2 - currentRotation) / arc) % items.length,
    );

    if (segmentIndex < 0) {
      segmentIndex += items.length;
    }

    return sectorColors[segmentIndex] || "#ef4444";
  }, [currentRotation, items.length, sectorColors]);

  // Update shared pointer color in context when it changes
  useEffect(() => {
    try {
      setPointerColor?.(currentPointerColor);
    } catch (e) { }
  }, [currentPointerColor, setPointerColor]);

  // Remove old particles useMemo - using ConstellationBackground component instead

  // Draw canvas with pie slices (logic from index.html)
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;

    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssSize = pixelSize;

    // set actual canvas pixel size for crisp rendering
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centerX = cssSize / 2;
    const centerY = cssSize / 2;
    const outerRadius = cssSize / 2;

    ctx.clearRect(0, 0, cssSize, cssSize);

    // Save context and rotate by currentRotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    // Draw outer ring (vòng ngoài quay được)
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#f39c12"; // Orange
    ctx.fill();
    ctx.lineWidth = Math.max(8, cssSize * 0.03);
    ctx.strokeStyle = "#f39c12";
    ctx.stroke();

    // Draw 30 yellow dots around outer ring
    const dotCount = 30;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i * 2 * Math.PI) / dotCount;
      const dotX =
        Math.cos(angle) * (outerRadius - Math.max(8, cssSize * 0.02));
      const dotY =
        Math.sin(angle) * (outerRadius - Math.max(8, cssSize * 0.02));

      ctx.beginPath();
      ctx.arc(dotX, dotY, Math.max(2, cssSize * 0.008), 0, 2 * Math.PI);
      ctx.fillStyle = "#ffeb3b";
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(255, 235, 59, 0.55)";
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Draw inner sectors
    const arc = (2 * Math.PI) / items.length;
    const innerRadius = outerRadius - Math.max(20, cssSize * 0.06);

    for (let i = 0; i < items.length; i++) {
      const angle = currentRotation + i * arc;

      ctx.beginPath();
      ctx.fillStyle = sectorColors[i];
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, innerRadius, angle, angle + arc);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = Math.max(1, cssSize * 0.0025);
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = Math.max(2, cssSize * 0.006);

      const label = (items[i].name || "").slice(0, 25);
      const maxWidth = innerRadius - 40; // Max width for text
      let fontSize = Math.max(10, Math.floor(cssSize * 0.036));
      ctx.font = `normal ${fontSize}px Roboto, sans-serif`;
      let textWidth = ctx.measureText(label).width;

      // Auto-shrink text if too long
      while (textWidth > maxWidth && fontSize > 8) {
        fontSize -= 1;
        ctx.font = `normal ${fontSize}px Roboto, sans-serif`;
        textWidth = ctx.measureText(label).width;
      }

      ctx.fillText(label, innerRadius - 20, Math.max(6, cssSize * 0.012));
      ctx.restore();
    }

    // Track current segment for rotation logic
    let currentSegment = Math.floor(
      (((3 * Math.PI) / 2 - currentRotation) / arc) % items.length,
    );
    if (currentSegment < 0) currentSegment += items.length;

    if (currentSegment !== lastSegmentRef.current && localSpinning && items.length > 0) {
      lastSegmentRef.current = currentSegment;
    }
  }, [items, sectorColors, currentRotation, localSpinning, pixelSize]);

  // Setup canvas on mount and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ro = new ResizeObserver(() => {
      const cw = Math.floor(container.clientWidth) || Math.floor(size);
      const maxAllowed = Math.floor(Math.min(size, window.innerWidth - 32));
      const finalSize = Math.max(200, Math.min(cw, maxAllowed));
      setPixelSize(finalSize);
    });

    ro.observe(container);
    // initial
    const cw = Math.floor(container.clientWidth) || Math.floor(size);
    const maxAllowed = Math.floor(Math.min(size, window.innerWidth - 32));
    setPixelSize(Math.max(200, Math.min(cw, maxAllowed)));

    return () => {
      try {
        ro.disconnect();
      } catch (e) { }
    };
  }, [drawWheel, size]);

  // Redraw when rotation changes
  useEffect(() => {
    drawWheel();
  }, [currentRotation, drawWheel]);

  // Auto-spin loop (tạo hiệu ứng quay liên tục khi idle)
  useEffect(() => {
    let animFrameId;

    const autoSpinLoop = () => {
      if (!localSpinning && items.length > 0) {
        setCurrentRotation((prev) => prev + AUTO_SPIN_SPEED);
      }
      animFrameId = requestAnimationFrame(autoSpinLoop);
    };

    animFrameId = requestAnimationFrame(autoSpinLoop);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [localSpinning, items.length]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(spinAudio);
      audioRef.current.preload = "auto";
      audioRef.current.volume = 0.25;
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(spinAudio);
      audioRef.current.preload = "auto";
      audioRef.current.volume = 0.25;
    }
  }, []);

  const playSpinAudio = useCallback(() => {
    try {
      if (!audioRef.current) return;
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.25;
      audioRef.current.play().catch(() => { });
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }, []);

  const stopSpinAudio = useCallback(() => {
    const stopSpinAudio = useCallback(() => {
      try {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {
        console.warn("Audio stop failed:", e);
      }
    }, []);

    // Ease-in-out-quart animation (from index.html)
    const easeInOutQuart = (t) => {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    };

    // Calculate target rotation
    const calculateTargetRotation = useCallback(
      (selectedIndex) => {
        const arc = (2 * Math.PI) / items.length;
        const targetAngle = (3 * Math.PI) / 2 - (selectedIndex * arc + arc / 2);

        let currentMod = currentRotation % (2 * Math.PI);
        let angleDiff = targetAngle - currentMod;
        if (angleDiff < 0) angleDiff += 2 * Math.PI;

        const spins = FULL_ROTATIONS * 2 * Math.PI;
        return angleDiff + spins;
      },
      [currentRotation, items.length],
    );

    // Handle spin (logic from index.html)
    const handleSpin = async () => {
      if (localSpinning || items.length === 0) return;

      try {
        playSpinAudio();
        setLocalSpinning(true);
        onSpinStateChange?.(true);
        lastSegmentRef.current = -1;

        const response = await itemAPI.spinWheel();
        if (!response.data.success) {
          throw new Error(response.data.message || "Lỗi khi quay vòng");
        }

        const selectedItem = response.data.data.item;
        const selectedIndex = Math.max(
          0,
          items.findIndex((item) => item._id === selectedItem._id),
        );
        const spinAngle = calculateTargetRotation(selectedIndex);

        // Animate spin with easeInOutQuart
        return new Promise((resolve) => {
          const startTime = performance.now();
          const startRotation = currentRotation;

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            let progress = elapsed / SPIN_DURATION;

            if (progress > 1) progress = 1;

            const eased = easeInOutQuart(progress);
            const newRotation = startRotation + spinAngle * eased;

            setCurrentRotation(newRotation);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              // Done spinning - ResultDisplay will show the result popup
              onSpinComplete?.(response.data.data);
              onSpinStateChange?.(false);
              setLocalSpinning(false);
              stopSpinAudio();
              resolve();
            }
          };

          requestAnimationFrame(animate);
        });

      } catch (error) {
        console.error("Spin error:", error);
        notify({
          type: "error",
          message: "Lỗi quay vòng",
          description: error.message || "Có lỗi xảy ra.",
        });
        stopSpinAudio();
        onSpinStateChange?.(false);
        setLocalSpinning(false);
      }
    };


    // Draw light bulbs around border (now drawn on canvas, so we can remove the DOM-based bulbs)
    // const getLightBulbs = () => {
    //   const count = Math.max(8, items.length);
    //   const bulbs = [];
    //   for (let i = 0; i < count; i++) {
    //     const angle = (i / count) * Math.PI * 2;
    //     const x = Math.cos(angle) * 180 + 240;
    //     const y = Math.sin(angle) * 180 + 240;
    //     bulbs.push({ x, y, angle: (angle * 180) / Math.PI });
    //   }
    //   return bulbs;
    // };

    // const bulbs = getLightBulbs();

  }, []);
  return (
    <>
      {contextHolder}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={!isFullscreen ? {
          backgroundImage: `conic-gradient(from 90deg, rgb(223, 48, 0) 0deg, rgb(223, 48, 0) 27.692deg, rgb(254, 96, 0) 27.692deg, rgb(254, 96, 0) 55.385deg, rgb(255, 145, 37) 55.385deg, rgb(255, 145, 37) 83.077deg, rgb(251, 187, 95) 83.077deg, rgb(251, 187, 95) 110.769deg, rgb(218, 217, 154) 110.769deg, rgb(218, 217, 154) 138.462deg, rgb(169, 230, 202) 138.462deg, rgb(169, 230, 202) 166.154deg, rgb(114, 224, 232) 166.154deg, rgb(114, 224, 232) 193.846deg, rgb(62, 201, 236) 193.846deg, rgb(62, 201, 236) 221.538deg, rgb(20, 163, 214) 221.538deg, rgb(20, 163, 214) 249.231deg, rgb(0, 116, 171) 249.231deg, rgb(0, 116, 171) 276.923deg, rgb(0, 67, 115) 276.923deg, rgb(0, 67, 115) 304.615deg, rgb(18, 22, 55) 304.615deg, rgb(18, 22, 55) 332.308deg, rgb(58, 0, 5) 332.308deg, rgb(58, 0, 5) 360deg)`,
        } : {}}
      >
        {/* Constellation Background Component */}
        <ConstellationBackground />

        {/* Radial rays effect */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ filter: "opacity(0.3)", zIndex: 1 }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360;
            const rad = (angle * Math.PI) / 180;
            const x2 = 50 + 50 * Math.cos(rad);
            const y2 = 50 + 50 * Math.sin(rad);
            return (
              <line
                key={i}
                x1="50%"
                y1="50%"
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="3"
              />
            );
          })}
        </svg>

        {/* Wheel container */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div
              className="w-0 h-0 border-l-transparent border-r-transparent border-t-yellow-300 drop-shadow-2xl"
              style={{
                borderLeftWidth: "28px",
                borderRightWidth: "28px",
                borderTopWidth: "56px",
                filter: "drop-shadow(0 0 8px rgba(255, 235, 59, 0.8))",
              }}
            />
          </div>

          <div
            className="relative"
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <div className="w-full h-full rounded-full overflow-hidden wheel-outer-shadow shadow-2xl">
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-full wheel-canvas"
              />
            </div>

            <button
              onClick={handleSpin}
              disabled={localSpinning || items.length === 0}
              className={`absolute inset-1/2 w-28 h-28 md:w-32 md:h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white font-bold text-2xl md:text-3xl text-white z-20 flex items-center justify-center shadow-xl transition-all ${localSpinning || items.length === 0
                ? "cursor-not-allowed"
                : "hover:bg-red-600 active:scale-95 cursor-pointer"
                }`}
              style={{
                backgroundColor:
                  items.length === 0
                    ? "#9ca3af"
                    : "var(--pointer-color)",
                boxShadow: `0 0 0 4px rgba(255,255,255,0.35), 0 8px 22px var(--pointer-color, #ef4444)66`,
                opacity: 1,
              }}
            >
              <span className="drop-shadow-lg">Quay</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
export default Wheel;

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
import ConstellationBackground from "./ConstellationBackground";
import spinAudio from "../../audio/audio.mp3";

const FULL_ROTATIONS = 12;
const SPIN_DURATION = 15000;
const AUTO_SPIN_SPEED = 0.0015;

const FIXED_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
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
  const spinAudioPoolRef = useRef([]);
  const spinAudioIndexRef = useRef(0);
  const resultPauseTimerRef = useRef(null);
  const { notify, contextHolder } = useNotification();

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

  useEffect(() => {
    try {
      setPointerColor?.(currentPointerColor);
    } catch {
      // noop
    }
  }, [currentPointerColor, setPointerColor]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;

    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssSize = pixelSize;

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

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#f39c12";
    ctx.fill();
    ctx.lineWidth = Math.max(4, cssSize * 0.02);
    ctx.strokeStyle = "#f39c12";
    ctx.stroke();

    const dotCount = 30;

    // 1. Lấy độ dày của viền vàng (giống với công thức ở innerRadius)
    const rimWidth = Math.max(12, cssSize * 0.045);
    // 2. Tính bán kính đặt chấm tròn sao cho nằm ngay chính giữa viền
    const dotRadius = outerRadius - rimWidth / 2;

    for (let i = 0; i < dotCount; i++) {
      const angle = (i * 2 * Math.PI) / dotCount;
      // 3. Truyền dotRadius vào thay cho công thức cũ
      const dotX = Math.cos(angle) * dotRadius;
      const dotY = Math.sin(angle) * dotRadius;
      ctx.beginPath();
      ctx.arc(dotX, dotY, Math.max(2, cssSize * 0.008), 0, 2 * Math.PI);
      ctx.fillStyle = "#ffeb3b";
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(255, 235, 59, 0.55)";
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    const arc = (2 * Math.PI) / items.length;
    const innerRadius = outerRadius - Math.max(12, cssSize * 0.045);

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

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = Math.max(2, cssSize * 0.006);

      const label = (items[i].name || "").slice(0, 25);
      const maxWidth = innerRadius - 40;
      let fontSize = Math.max(10, Math.floor(cssSize * 0.03));
      ctx.font = `500 ${fontSize}px Roboto, sans-serif`;
      let textWidth = ctx.measureText(label).width;

      while (textWidth > maxWidth && fontSize > 6) {
        fontSize -= 1;
        ctx.font = `500 ${fontSize}px Roboto, sans-serif`;
        textWidth = ctx.measureText(label).width;
      }

      ctx.fillText(label, innerRadius - 20, Math.max(6, cssSize * 0.012));
      ctx.restore();
    }

    let currentSegment = Math.floor(
      (((3 * Math.PI) / 2 - currentRotation) / arc) % items.length,
    );
    if (currentSegment < 0) currentSegment += items.length;

    if (
      currentSegment !== lastSegmentRef.current &&
      localSpinning &&
      items.length > 0
    ) {
      lastSegmentRef.current = currentSegment;
    }
  }, [items, sectorColors, currentRotation, localSpinning, pixelSize]);

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

    const cw = Math.floor(container.clientWidth) || Math.floor(size);
    const maxAllowed = Math.floor(Math.min(size, window.innerWidth - 32));
    setPixelSize(Math.max(200, Math.min(cw, maxAllowed)));

    return () => {
      try {
        ro.disconnect();
      } catch {
        // noop
      }
    };
  }, [size]);

  useEffect(() => {
    drawWheel();
  }, [currentRotation, drawWheel]);

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
    // Preload multiple players so first spin and repeated spins play instantly.
    const players = Array.from({ length: 2 }, () => {
      const audio = new Audio(spinAudio);
      audio.preload = "auto";
      audio.volume = 0.25;
      audio.load();
      return audio;
    });

    spinAudioPoolRef.current = players;

    return () => {
      players.forEach((player) => {
        try {
          player.pause();
          player.src = "";
        } catch {
          // noop
        }
      });
      spinAudioPoolRef.current = [];
    };
  }, []);

  const playSpinAudio = useCallback(() => {
    try {
      const players = spinAudioPoolRef.current;
      if (!players.length) return;

      spinAudioIndexRef.current =
        (spinAudioIndexRef.current + 1) % players.length;
      const player = players[spinAudioIndexRef.current];
      player.currentTime = 0;
      player.volume = 0.25;
      const playPromise = player.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }, []);

  const stopSpinAudio = useCallback(() => {
    try {
      spinAudioPoolRef.current.forEach((player) => {
        player.pause();
        player.currentTime = 0;
      });
    } catch (e) {
      console.warn("Audio stop failed:", e);
    }
  }, []);

  const easeInOutQuart = (t) => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  };

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

  const handleSpin = async () => {
    if (localSpinning || items.length === 0) return;

    if (resultPauseTimerRef.current) {
      clearTimeout(resultPauseTimerRef.current);
      resultPauseTimerRef.current = null;
    }

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
            onSpinComplete?.(response.data.data);
            stopSpinAudio();
            resultPauseTimerRef.current = setTimeout(() => {
              setLocalSpinning(false);
              onSpinStateChange?.(false);
              resultPauseTimerRef.current = null;
            }, 10000);
            resolve();
          }
        };

        requestAnimationFrame(animate);
      });
    } catch (error) {
      console.error("Spin error:", error);
      if (resultPauseTimerRef.current) {
        clearTimeout(resultPauseTimerRef.current);
        resultPauseTimerRef.current = null;
      }
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

  return (
    <>
      {contextHolder}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={
          !isFullscreen
            ? {
                backgroundImage: `conic-gradient(from 90deg, rgb(223, 48, 0) 0deg, rgb(223, 48, 0) 27.692deg, rgb(254, 96, 0) 27.692deg, rgb(254, 96, 0) 55.385deg, rgb(255, 145, 37) 55.385deg, rgb(255, 145, 37) 83.077deg, rgb(251, 187, 95) 83.077deg, rgb(251, 187, 95) 110.769deg, rgb(218, 217, 154) 110.769deg, rgb(218, 217, 154) 138.462deg, rgb(169, 230, 202) 138.462deg, rgb(169, 230, 202) 166.154deg, rgb(114, 224, 232) 166.154deg, rgb(114, 224, 232) 193.846deg, rgb(62, 201, 236) 193.846deg, rgb(62, 201, 236) 221.538deg, rgb(20, 163, 214) 221.538deg, rgb(20, 163, 214) 249.231deg, rgb(0, 116, 171) 249.231deg, rgb(0, 116, 171) 276.923deg, rgb(0, 67, 115) 276.923deg, rgb(0, 67, 115) 304.615deg, rgb(18, 22, 55) 304.615deg, rgb(18, 22, 55) 332.308deg, rgb(58, 0, 5) 332.308deg, rgb(58, 0, 5) 360deg)`,
              }
            : {}
        }
      >
        <ConstellationBackground />

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

        <div className="relative z-10 flex flex-col items-center justify-center">
          <div
            className="relative"
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <div className="absolute left-1/2 top-[-30px] -translate-x-1/2 z-20 pointer-events-none">
              <div
                className="w-0 h-0 border-l-[28px] border-r-[28px] border-t-[58px] border-l-transparent border-r-transparent border-t-yellow-300"
                style={{
                  filter: "drop-shadow(0 0 20px rgba(253, 224, 71, 0.95))",
                }}
              />
            </div>
            <div className="w-full h-full rounded-full overflow-hidden wheel-outer-shadow shadow-[0_0_40px_0.5px_rgba(0,0,0,0.7)]">
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-full wheel-canvas"
              />
            </div>

            <button
              onClick={handleSpin}
              disabled={localSpinning || items.length === 0}
              className={`absolute top-1/2 left-1/2 w-24 h-24 md:w-28 md:h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-[8px] border-white font-bold text-2xl md:text-2xl text-white z-20 flex items-center justify-center shadow-xl transition-all ${
                localSpinning || items.length === 0
                  ? "cursor-not-allowed"
                  : "hover:bg-red-600 active:scale-95 "
              }`}
              style={{
                backgroundColor:
                  items.length === 0 ? "#9ca3af" : "var(--pointer-color)",
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
};

export default Wheel;

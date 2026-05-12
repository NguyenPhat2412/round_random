import confetti from "canvas-confetti";

export const triggerFireworks = (preferredColor) => {
  const baseColors = [
    "#F97316",
    "#10B981",
    "#60A5FA",
    "#F472B6",
    "#FDE68A",
    "#A855F7",
  ];
  const colors = preferredColor
    ? [preferredColor, ...baseColors.filter((c) => c !== preferredColor)]
    : baseColors;

  const defaults = {
    ticks: 160,
    startVelocity: 52,
    spread: 72,
    gravity: 0.88,
    decay: 0.9,
    scalar: 1.08,
    zIndex: 3000,
    colors,
    shapes: ["square", "circle"],
  };

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const particleCount = 42;

    confetti({
      ...defaults,
      particleCount,
      spread: 100,
      origin: { x: 0.5, y: 0.58 },
    });

    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount * 0.9),
      spread: 80,
      origin: { x: randomInRange(0.08, 0.32), y: randomInRange(0.12, 0.34) },
    });

    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount * 0.9),
      spread: 80,
      origin: { x: randomInRange(0.68, 0.92), y: randomInRange(0.12, 0.34) },
    });

    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount * 0.7),
      spread: 85,
      origin: { x: randomInRange(0.2, 0.8), y: randomInRange(0.08, 0.18) },
    });
  }, 300);

  return interval;
};

import confetti from "canvas-confetti";

export const triggerFireworks = () => {
  const colors = [
    "#F97316",
    "#10B981",
    "#60A5FA",
    "#F472B6",
    "#FDE68A",
    "#A855F7",
  ];

  const defaults = {
    ticks: 110,
    startVelocity: 42,
    spread: 60,
    gravity: 0.95,
    decay: 0.91,
    scalar: 1.05,
    zIndex: 100,
    colors,
    shapes: ["square", "circle"],
  };

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const particleCount = 30;

    confetti({
      ...defaults,
      particleCount,
      spread: 90,
      origin: { x: 0.5, y: 0.55 },
    });

    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount * 0.8),
      spread: 70,
      origin: { x: randomInRange(0.1, 0.35), y: randomInRange(0.15, 0.35) },
    });

    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount * 0.8),
      spread: 70,
      origin: { x: randomInRange(0.65, 0.9), y: randomInRange(0.15, 0.35) },
    });
  }, 300);

  return interval;
};

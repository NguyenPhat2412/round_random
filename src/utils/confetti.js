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
    ticks: 140,
    startVelocity: 48,
    spread: 68,
    gravity: 0.88,
    decay: 0.9,
    scalar: 1.02,
    zIndex: 3000,
    colors,
    shapes: ["square", "circle"],
  };

  const randomInRange = (min, max) => Math.random() * (max - min) + min;
  let pulse = 0;

  const interval = setInterval(() => {
    pulse += 1;
    const particleCount = 26;

    confetti({
      ...defaults,
      particleCount,
      spread: 88,
      origin: { x: 0.5, y: 0.58 },
    });

    // Keep only one side burst each pulse to avoid too many fireworks at once.
    const isLeftPulse = pulse % 2 === 0;
    confetti({
      ...defaults,
      particleCount: Math.floor(particleCount * 0.7),
      spread: 76,
      origin: isLeftPulse
        ? { x: randomInRange(0.12, 0.32), y: randomInRange(0.14, 0.34) }
        : { x: randomInRange(0.68, 0.88), y: randomInRange(0.14, 0.34) },
    });
  }, 620);

  return interval;
};

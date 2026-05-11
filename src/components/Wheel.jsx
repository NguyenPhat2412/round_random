import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "antd";
import { itemAPI } from "../services/api";
import useNotification from "../hooks/useNotification";
import {
  generateDistinctColors,
  pickReadableTextColor,
} from "../utils/colorUtils";

const FULL_ROTATIONS = 6;

const Wheel = ({ items, isSpinning, onSpinStateChange, onSpinComplete }) => {
  const canvasRef = useRef(null);
  const wheelRef = useRef(null);
  const [localLoading, setLocalLoading] = useState(false);
  const { notify, contextHolder } = useNotification();

  const sliceAngle = useMemo(() => {
    return items.length ? 360 / items.length : 0;
  }, [items.length]);

  const sectorColors = useMemo(
    () => generateDistinctColors(items, items.length),
    [items],
  );

  useEffect(() => {
    if (items.length === 0) return;
    drawWheel();
    if (wheelRef.current) {
      wheelRef.current.style.transform = "rotate(0deg)";
    }
  }, [items, sectorColors]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;

    const ctx = canvas.getContext("2d");
    const radius = 150;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sliceRadian = (2 * Math.PI) / items.length;

    items.forEach((item, index) => {
      const startAngle = index * sliceRadian - Math.PI / 2;
      const endAngle = (index + 1) * sliceRadian - Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const bg = sectorColors[index] || item.color || "#2563eb";
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceRadian / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = pickReadableTextColor(bg);
      ctx.font = "700 14px Inter, system-ui, sans-serif";
      const label = `${item.name || ""}`.slice(0, 22);
      ctx.fillText(label, radius - 18, 6);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const calculateFinalRotation = (selectedIndex) => {
    const normalized = (360 - (selectedIndex + 0.5) * sliceAngle) % 360;
    return FULL_ROTATIONS * 360 + normalized;
  };

  const handleSpin = async () => {
    if (isSpinning || localLoading || items.length === 0) return;

    try {
      setLocalLoading(true);
      onSpinStateChange?.(true);

      const response = await itemAPI.spinWheel();
      if (!response.data.success) {
        throw new Error(response.data.message || "Lỗi khi quay vòng");
      }

      const selectedItem = response.data.data.item;
      const selectedIndex = Math.max(
        0,
        items.findIndex((item) => item._id === selectedItem._id),
      );

      const wheelElement = wheelRef.current;
      if (wheelElement) {
        const finalRotation = calculateFinalRotation(selectedIndex);
        wheelElement.style.transition =
          "transform 4.6s cubic-bezier(0.16, 1, 0.3, 1)";
        wheelElement.style.transform = `rotate(${finalRotation}deg)`;
      }

      window.setTimeout(() => {
        onSpinComplete?.(response.data.data);
        onSpinStateChange?.(false);
        setLocalLoading(false);
        notify({
          type: "success",
          message: "🎉 Chúc mừng!",
          description: `Người chiến thắng: ${selectedItem.name}`,
        });
      }, 4600);
    } catch (error) {
      console.error("Spin error:", error);
      notify({
        type: "error",
        message: "Lỗi quay vòng",
        description: error.message || "Có lỗi xảy ra. Vui lòng thử lại.",
      });
      onSpinStateChange?.(false);
      setLocalLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-3 py-4 sm:px-6">
        <div className="relative flex aspect-square w-full max-w-[560px] items-center justify-center">
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2">
            <div className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-rose-400 drop-shadow-[0_6px_12px_rgba(244,63,94,0.45)]" />
          </div>
          <div
            ref={wheelRef}
            className="relative h-full w-full rounded-full border border-gray-200 bg-white p-3 shadow-sm"
          >
            <canvas
              ref={canvasRef}
              width={520}
              height={520}
              className="block rounded-full"
            />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-gray-100" />
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          onClick={handleSpin}
          disabled={isSpinning || localLoading || items.length === 0}
          loading={isSpinning || localLoading}
          className="!h-12 !px-8 !text-base !font-bold !uppercase"
        >
          {isSpinning || localLoading ? "Đang quay..." : "Bấm để bắt đầu"}
        </Button>
      </div>
    </>
  );
};

export default Wheel;

import React, { useRef, useEffect, useCallback } from "react";

// --- Cấu hình hiệu ứng ---
const CONFIG = {
  particleCount: 100, // Số lượng hạt (tăng nếu muốn dày đặc hơn)
  particleColor: "#ffffff", // Màu của hạt (trắng)
  lineColor: "#ffffff", // Màu đường nối
  particleRadius: 1.5, // Kích thước hạt tối đa
  linkDistance: 120, // Khoảng cách tối đa để 2 hạt nối với nhau
  velocity: 0.3, // Tốc độ di chuyển (0.3 - 0.5 là vừa phải)
};

const ConstellationBackground = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameId = useRef(null);

  // 1. Hàm khởi tạo danh sách các hạt ngẫu nhiên
  const initParticles = useCallback((width, height) => {
    const newParticles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      newParticles.push({
        // Vị trí ngẫu nhiên trên màn hình
        x: Math.random() * width,
        y: Math.random() * height,
        // Vận tốc ngẫu nhiên (tạo hướng bay khác nhau)
        vx: (Math.random() - 0.5) * CONFIG.velocity,
        vy: (Math.random() - 0.5) * CONFIG.velocity,
        // Kích thước ngẫu nhiên một chút để tạo chiều sâu
        r: Math.random() * CONFIG.particleRadius + 0.5,
      });
    }
    particlesRef.current = newParticles;
  }, []);

  // 2. Hàm vẽ chính (Animation Loop)
  const draw = useCallback((ctx, width, height) => {
    // 2a. Xóa canvas cũ trước khi vẽ khung hình mới
    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;

    // 2b. Duyệt qua từng hạt để cập nhật vị trí và vẽ
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Cập nhật vị trí dựa trên vận tốc
      p.x += p.vx;
      p.y += p.vy;

      // Xử lý va chạm viền: Nếu chạm cạnh thì bật ngược lại
      if (p.x < 0 || p.x > width) p.vx = -p.vx;
      if (p.y < 0 || p.y > height) p.vy = -p.vy;

      // Vẽ hạt bụi sao
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.particleColor;
      // Thêm một chút glow cho hạt
      ctx.shadowBlur = 5;
      ctx.shadowColor = CONFIG.particleColor;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow cho các nét vẽ sau

      // 2c. Logic nối đường kẻ (Chòm sao) - Thuật toán O(n^2)
      // Duyệt qua các hạt còn lại để so sánh khoảng cách
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];

        // Tính khoảng cách Pitago giữa 2 hạt p và p2
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Nếu khoảng cách nhỏ hơn giới hạn cấu hình thì vẽ đường nối
        if (dist < CONFIG.linkDistance) {
          ctx.beginPath();
          // Độ đậm của đường kẻ phụ thuộc vào khoảng cách (càng xa càng mờ)
          const opacity = 1 - dist / CONFIG.linkDistance;
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`; // Độ đậm 0.5
          ctx.lineWidth = 0.8;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // Tiếp tục vòng lặp animation
    animationFrameId.current = requestAnimationFrame(() =>
      draw(ctx, width, height),
    );
  }, []);

  // 3. Setup Canvas và xử lý Resize màn hình
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Hàm set kích thước canvas bằng kích thước thật của element cha
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;

      // Set internal resolution của canvas
      canvas.width = width;
      canvas.height = height;

      // Khởi tạo lại hạt khi resize để rải đều lại màn hình
      initParticles(width, height);
    };

    // Gọi lần đầu khi mount
    handleResize();

    // Bắt đầu vẽ
    draw(ctx, canvas.width, canvas.height);

    // Lắng nghe sự kiện resize màn hình
    window.addEventListener("resize", handleResize);

    // Lắng nghe fullscreen change để resize canvas
    document.addEventListener("fullscreenchange", handleResize);

    // Cleanup function khi component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [initParticles, draw]);

  return (
    // Canvas luôn chiếm full element cha
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ display: "block" }} // Tránh vạch kẻ mờ phía dưới của thẻ canvas mặc định
    />
  );
};

export default ConstellationBackground;

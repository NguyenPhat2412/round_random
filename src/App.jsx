import React, { useState, useEffect, useRef } from "react";
import { Spin } from "antd";
import Wheel from "./components/Wheel";
import Sidebar from "./components/Sidebar";
import ItemManager from "./components/ItemManager";
import ResultDisplay from "./components/ResultDisplay";
import useNotification from "./hooks/useNotification";
import { ColorProvider } from "./contexts/ColorContext";
import { itemAPI } from "./services/api";

function App() {
  const [items, setItems] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [originalItems, setOriginalItems] = useState([]);
  const [quickAdd, setQuickAdd] = useState({ name: "" });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previousFullscreenRef = useRef(false);
  const wheelSize = isFullscreen ? 700 : 620;
  const [maxWheelSize, setMaxWheelSize] = useState(wheelSize);
  const { notify, contextHolder } = useNotification();

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (previousFullscreenRef.current && !isFullscreen) {
      setLatestResult(null);
    } else if (!previousFullscreenRef.current && isFullscreen) {
      setLatestResult(null);
    }
    previousFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      let base = isFullscreen ? 650 : 500;  // Giảm từ 700 xuống 650 cho fullscreen, từ 620 xuống 500 cho không fullscreen
      if (vw < 640) {
        base = Math.min(320, Math.max(240, vw - 48));  // Giảm size tối đa từ 360 xuống 320, tối thiểu từ 260 xuống 240
      } else if (vw < 1024) {
        base = Math.min(450, Math.max(380, vw - 200));  // Giảm size tối đa từ 520 xuống 450, tối thiểu từ 420 xuống 380
      } else if (vw < 1440) {  // Thêm điều kiện cho màn hình như MacBook 13 (dưới 1440px)
        base = Math.min(480, base);  // Giới hạn tối đa 480px cho màn hình dưới 1440px
      }
      setMaxWheelSize(base);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      notify({
        type: "error",
        message: "Không thể bật toàn màn hình",
        description:
          error.message || "Trình duyệt đã chặn chế độ toàn màn hình.",
      });
    }
  };

  const triggerRefresh = () => setRefreshKey((value) => value + 1);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemAPI.getAllItems();
      if (response.data.success) {
        setItems(response.data.data);
        setOriginalItems(response.data.data);
      }
    } catch (err) {
      notify({
        type: "error",
        message: "Lỗi kết nối",
        description: "Không thể kết nối với server. Vui lòng kiểm tra backend!",
      });
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpinComplete = (result) => {
    setIsSpinning(false);
    setLatestResult(result);
    triggerRefresh();
  };

  const handleImportSuccess = (importedItems) => {
    // Backend handles deactivation of items not in import
    setItems(importedItems);
    triggerRefresh();
  };

  const handleManualUpdate = (newItems) => {
    setItems(newItems);
    triggerRefresh();
  };

  const handleItemDeleted = (deletedId) => {
    setItems((current) => current.filter((item) => item._id !== deletedId));
    setOriginalItems((current) =>
      current.filter((item) => item._id !== deletedId),
    );
    setLatestResult((current) => {
      if (!current) return current;
      const currentItemId = current?.item?._id || current?.result?.itemId;
      return currentItemId === deletedId ? null : current;
    });
  };

  const handleQuickAdd = async (event) => {
    event?.preventDefault?.();
    if (!quickAdd.name.trim()) {
      notify({
        type: "warning",
        message: "Nhập liệu không hợp lệ",
        description: "Vui lòng nhập họ tên hoặc tên dữ liệu.",
      });
      return;
    }

    try {
      const response = await itemAPI.addItem(quickAdd);
      if (response.data.success) {
        setItems((current) => [...current, response.data.data]);
        setQuickAdd({ name: "" });
        notify({
          type: "success",
          message: "Thêm thành công",
          description: `Đã thêm "${quickAdd.name}" vào danh sách.`,
        });
        triggerRefresh();
      }
    } catch (err) {
      notify({
        type: "error",
        message: "Lỗi",
        description: err.response?.data?.message || err.message,
      });
    }
  };

  return (
    <ColorProvider>
      <div
        className={`h-screen w-screen flex flex-col text-slate-800 overflow-hidden ${isFullscreen ? "" : "bg-slate-50"}`}
        style={isFullscreen ? {
          backgroundImage: `conic-gradient(from 90deg, rgb(223, 48, 0) 0deg, rgb(223, 48, 0) 27.692deg, rgb(254, 96, 0) 27.692deg, rgb(254, 96, 0) 55.385deg, rgb(255, 145, 37) 55.385deg, rgb(255, 145, 37) 83.077deg, rgb(251, 187, 95) 83.077deg, rgb(251, 187, 95) 110.769deg, rgb(218, 217, 154) 110.769deg, rgb(218, 217, 154) 138.462deg, rgb(169, 230, 202) 138.462deg, rgb(169, 230, 202) 166.154deg, rgb(114, 224, 232) 166.154deg, rgb(114, 224, 232) 193.846deg, rgb(62, 201, 236) 193.846deg, rgb(62, 201, 236) 221.538deg, rgb(20, 163, 214) 221.538deg, rgb(20, 163, 214) 249.231deg, rgb(0, 116, 171) 249.231deg, rgb(0, 116, 171) 276.923deg, rgb(0, 67, 115) 276.923deg, rgb(0, 67, 115) 304.615deg, rgb(18, 22, 55) 304.615deg, rgb(18, 22, 55) 332.308deg, rgb(58, 0, 5) 332.308deg, rgb(58, 0, 5) 360deg)`
        } : {}}
      >
        {contextHolder}
        {!isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="fixed right-4 top-4 z-50 rounded-full bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-slate-800"
            title="Toàn màn hình"
          >
            ⛶ Toàn màn hình
          </button>
        )}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="fixed right-4 top-4 z-50 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white/25"
            title="Thoát toàn màn hình"
          >
            ⛶ Thoát
          </button>
        )}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spin size="large" description="Đang tải dữ liệu..." />
            </div>
          ) : (
            <>
              {isFullscreen && (
                <div className="pointer-events-none fixed inset-0 z-40">
                  <div className="pointer-events-auto">
                    <ResultDisplay
                      latestResult={latestResult}
                      refreshKey={refreshKey}
                      onDataChanged={triggerRefresh}
                      onItemDeleted={handleItemDeleted}
                      showResultsList={false}
                    />
                  </div>
                </div>
              )}

              {/* Content Grid */}
              <div
                className={`flex-1 grid gap-4 ${isFullscreen ? "place-items-center" : "grid-cols-1 lg:grid-cols-[320px_1fr]"}`}
              >
                {/* Left Sidebar (keeps first column) */}
                {!isFullscreen && (
                  <div className="w-full border-r border-gray-200 bg-white overflow-y-auto shadow-md">
                    <Sidebar
                      items={items}
                      originalItems={originalItems}
                      onImportSuccess={handleImportSuccess}
                      onManualUpdate={handleManualUpdate}
                      onItemDeleted={handleItemDeleted}
                      latestResult={latestResult}
                      refreshKey={refreshKey}
                      onDataChanged={triggerRefresh}
                      showResultDisplay={true}
                    />
                  </div>
                )}

                {/* Main Wheel Area */}
                <div
                  className={`${isFullscreen ? "w-full h-full" : "w-full h-full"} flex items-center justify-center`}
                >
                  {items.length > 0 ? (
                    <div
                      className={`flex items-center justify-center ${isFullscreen ? "w-full h-full bg-transparent" : "w-full h-full"}`}
                    >
                      <div
                        className="w-full max-w-[100%] h-full"
                        style={{ display: "grid", placeItems: "center" }}
                      >
                        <Wheel
                          items={items}
                          isSpinning={isSpinning}
                          onSpinStateChange={setIsSpinning}
                          onSpinComplete={handleSpinComplete}
                          size={maxWheelSize}
                          isFullscreen={isFullscreen}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-800">
                          Chưa có dữ liệu để quay
                        </p>
                        <p className="text-sm text-slate-600 mt-2">
                          Hãy nhập Excel hoặc thêm thủ công ở bên trái.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ColorProvider>
  );
}

export default App;

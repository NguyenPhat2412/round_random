import React, { useState, useEffect } from "react";
import { Spin } from "antd";
import Wheel from "./components/Wheel";
import Sidebar from "./components/Sidebar";
import ItemManager from "./components/ItemManager";
import useNotification from "./hooks/useNotification";
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
  const wheelSize = isFullscreen ? 600 : 540;
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
    setItems(importedItems);
    triggerRefresh();
  };

  const handleManualUpdate = (newItems) => {
    setItems(newItems);
    triggerRefresh();
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
    <div
      className={`h-screen w-screen flex flex-col text-slate-800 overflow-hidden ${
        isFullscreen
          ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_30%),conic-gradient(from_180deg_at_50%_50%,_#1e3a8a,_#0f766e,_#16a34a,_#ea580c,_#dc2626,_#7c3aed,_#1e3a8a)]"
          : "bg-slate-50"
      }`}
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
            {/* Left Sidebar */}
            {!isFullscreen && (
              <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto shadow-md">
                <Sidebar
                  items={items}
                  originalItems={originalItems}
                  onImportSuccess={handleImportSuccess}
                  onManualUpdate={handleManualUpdate}
                  latestResult={latestResult}
                  refreshKey={refreshKey}
                  onDataChanged={triggerRefresh}
                />
              </div>
            )}

            {/* Main Content */}
            <div
              className={`flex-1 ${isFullscreen ? "flex items-center justify-center" : ""}`}
            >
              {items.length > 0 ? (
                <div
                  className={`auto-rows-auto grid h-full ${isFullscreen ? "w-full" : ""}`}
                >
                  {/* Wheel */}
                  <div
                    className={`rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-center min-h-[420px] ${isFullscreen ? "w-full h-full border-0 rounded-none bg-transparent shadow-none" : ""}`}
                  >
                    <div className="w-full h-full">
                      <Wheel
                        items={items}
                        isSpinning={isSpinning}
                        onSpinStateChange={setIsSpinning}
                        onSpinComplete={handleSpinComplete}
                        size={wheelSize}
                      />
                    </div>
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
          </>
        )}
      </div>
    </div>
  );
}

export default App;

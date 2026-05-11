import React, { useState, useEffect } from "react";
import { Spin } from "antd";
import Wheel from "./components/Wheel";
import Sidebar from "./components/Sidebar";
import useNotification from "./hooks/useNotification";
import { itemAPI } from "./services/api";

function App() {
  const [items, setItems] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [originalItems, setOriginalItems] = useState([]);
  const { notify, contextHolder } = useNotification();

  useEffect(() => {
    fetchItems();
  }, []);

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

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
      {contextHolder}
      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spin size="large" description="Đang tải dữ liệu..." />
          </div>
        ) : (
          <>
            {/* Left Sidebar */}
            <div className="w-100 border-r border-gray-200 bg-white overflow-y-auto shadow-md">
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

            {/* Right Content - Full Wheel */}
            <div className="flex-1 overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-3 sm:p-5">
              {items.length > 0 ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-white/70 bg-white/60 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                  <Wheel
                    items={items}
                    isSpinning={isSpinning}
                    onSpinStateChange={setIsSpinning}
                    onSpinComplete={handleSpinComplete}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border-2 border-dashed border-cyan-200 bg-white/70 p-8 text-center shadow-sm">
                  <div>
                    <p className="text-xl font-bold text-cyan-900">
                      Chưa có tên nào để quay
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Nhập danh sách bạn nhỏ ở bên trái rồi bắt đầu nhé.
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

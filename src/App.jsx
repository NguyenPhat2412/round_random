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

  const handleQuickAdd = async (event) => {
    event.preventDefault();
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

            {/* Right Content - Wheel + Manager */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-700">
                      Lucky Wheel
                    </p>
                    <h1 className="mt-1 text-2xl font-black text-slate-900">
                      Vòng quay may mắn
                    </h1>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-800">
                      {items.length}
                    </div>
                    <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                      Mục
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {items.length > 0 ? (
                  <div className="space-y-6">
                    {/* Wheel */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-800">
                          Bảng quay
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Mũi tên ở trên cùng đứng yên
                        </p>
                      </div>
                      <Wheel
                        items={items}
                        isSpinning={isSpinning}
                        onSpinStateChange={setIsSpinning}
                        onSpinComplete={handleSpinComplete}
                      />
                    </div>

                    {/* Item Manager */}
                    <div>
                      <ItemManager
                        items={items}
                        onItemsChange={(nextItems) => {
                          setItems(nextItems);
                          triggerRefresh();
                        }}
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
  );
}

export default App;

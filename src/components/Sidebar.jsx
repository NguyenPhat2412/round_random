import React, { useMemo, useState, useContext } from "react";
import ImportExcel from "./ImportExcel";
import ResultDisplay from "./ResultDisplay";
import { generateDistinctColors } from "../utils/colorUtils";
import { Button, Modal, Input, Space } from "antd";
import useNotification from "../hooks/useNotification";
import { ColorContext } from "../contexts/ColorContext";

const Sidebar = ({
  items,
  onImportSuccess,
  onManualUpdate,
  onItemDeleted,
  originalItems,
  latestResult,
  refreshKey,
  onDataChanged,
  showResultDisplay = true,
}) => {
  const [activeTab, setActiveTab] = useState("items");

  // Load last manual list from localStorage, fallback to current items
  const [textValue, setTextValue] = useState(() => {
    const saved = localStorage.getItem("lastManualList");
    if (saved) return saved;
    return items.map((i) => i.name).join("\n");
  });

  // initialSnapshot = last saved manual list (for reset functionality)
  const [initialSnapshot] = useState(() => {
    const saved = localStorage.getItem("lastManualList");
    if (saved)
      return saved
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    return originalItems?.map((i) => i.name) ?? items.map((i) => i.name);
  });

  const latestResultKey =
    latestResult?.result?._id ||
    latestResult?.result?.spinTime ||
    latestResult?.item?._id ||
    latestResult?.itemName ||
    null;

  // keep textarea in sync when items prop changes
  React.useEffect(() => {
    setTextValue(items.map((i) => i.name).join("\n"));
  }, [items]);

  const names = useMemo(
    () =>
      textValue
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [textValue],
  );

  const { notify, contextHolder } = useNotification();
  const { pointerColor } = useContext(ColorContext);

  const handleUpdate = () => {
    // Save manual list to localStorage as "last manual list"
    localStorage.setItem("lastManualList", textValue);

    // Build lightweight item objects for wheel (not persisting to backend here)
    const colors = generateDistinctColors(items, names.length);
    const newItems = names.map((name, idx) => ({
      _id: `local-${idx}-${name.replace(/\s+/g, "")}`,
      name,
      color: colors[idx],
      icon: "🎁",
      isActive: true,
    }));
    onManualUpdate(newItems);
    notify({
      type: "success",
      message: "Cập nhật vòng quay",
      description: `Đã cập nhật ${newItems.length} mục.`,
    });
  };

  const shuffleList = () => {
    const arr = [...names];
    arr.sort(() => Math.random() - 0.5);
    setTextValue(arr.join("\n"));
    notify({ type: "open", message: "Đã trộn danh sách" });
  };

  const sortAZ = () => {
    const arr = [...names].sort((a, b) => a.localeCompare(b));
    setTextValue(arr.join("\n"));
    notify({ type: "open", message: "Đã sắp xếp A→Z" });
  };

  const clearList = () => {
    Modal.confirm({
      title: "Xác nhận xoá",
      content: "Bạn có chắc muốn xóa toàn bộ danh sách?",
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk() {
        setTextValue("");
        notify({ type: "success", message: "Đã xóa danh sách" });
      },
    });
  };

  const resetList = () => {
    if (
      !initialSnapshot ||
      (Array.isArray(initialSnapshot) && initialSnapshot.length === 0)
    )
      return;
    const snapText = Array.isArray(initialSnapshot)
      ? initialSnapshot.join("\n")
      : initialSnapshot;
    setTextValue(snapText);
    notify({ type: "open", message: "Đã khôi phục danh sách cuối cùng" });
  };

  return (
    <div className="sidebar">
      <div className="tabs">
        <div
          className={`tab ${activeTab === "items" ? "active" : ""}`}
          onClick={() => setActiveTab("items")}
          style={
            activeTab === "items"
              ? { borderColor: pointerColor || undefined }
              : undefined
          }
        >
          Danh sách <span className="badge">{items.length}</span>
        </div>
        <div
          className={`tab ${activeTab === "results" ? "active" : ""}`}
          onClick={() => setActiveTab("results")}
          style={
            activeTab === "results"
              ? { borderColor: pointerColor || undefined }
              : undefined
          }
        >
          Kết quả vui <span className="badge"></span>
        </div>
      </div>

      {contextHolder}
      {showResultDisplay && (
        <ResultDisplay
          latestResult={latestResult}
          refreshKey={refreshKey}
          onDataChanged={onDataChanged}
          onItemDeleted={onItemDeleted}
          showResultsList={activeTab === "results"}
        />
      )}

      {activeTab === "items" ? (
        <div className="tab-content">
          <div className="toolbar">
            <Space wrap>
              <Button onClick={shuffleList}>🔀 Trộn</Button>
              <Button onClick={sortAZ}>🔤 A đến Z</Button>
              <Button danger onClick={clearList}>
                ✖ Xóa hết
              </Button>
              <Button
                onClick={resetList}
                style={{
                  backgroundColor: pointerColor,
                  borderColor: pointerColor,
                  color: pointerColor ? "#fff" : undefined,
                }}
              >
                🔄 Danh sách gốc
              </Button>
            </Space>
          </div>

          <div className="px-4 py-2">
            <ImportExcel onImportSuccess={onImportSuccess} />
          </div>

          <div className="px-4 py-2 flex-1">
            <Input.TextArea
              id="nameList"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={"Nhập tên từng bạn ở đây...\nMỗi dòng là 1 bạn."}
              rows={8}
              className="h-full"
            />
          </div>

          <div className="px-4 py-2">
            <Button type="primary" block onClick={handleUpdate}>
              Cập nhật danh sách
            </Button>
          </div>
        </div>
      ) : (
        <div className="tab-content px-4">
          <div className="py-2">
            <Button
              danger
              block
              onClick={() =>
                Modal.confirm({
                  title: "Xóa hết kết quả",
                  content: "Bạn có muốn xóa sạch các lượt quay không?",
                  okText: "Xóa hết",
                  okType: "danger",
                  cancelText: "Hủy",
                  onOk() {
                    /* ResultDisplay handles deletion via its own controls */
                  },
                })
              }
            >
              Xóa lịch sử quay
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

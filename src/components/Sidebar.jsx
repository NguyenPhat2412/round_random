import React, { useMemo, useState } from "react";
import ImportExcel from "./ImportExcel";
import ResultDisplay from "./ResultDisplay";
import { generateDistinctColors } from "../utils/colorUtils";
import { Button, Modal, Input, Space } from "antd";
import useNotification from "../hooks/useNotification";

const Sidebar = ({
  items,
  onImportSuccess,
  onManualUpdate,
  originalItems,
  latestResult,
  refreshKey,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState("items");
  const [acknowledgedResultKey, setAcknowledgedResultKey] = useState(null);
  const [textValue, setTextValue] = useState(() =>
    items.map((i) => i.name).join("\n"),
  );
  const [initialSnapshot] = useState(
    () => originalItems?.map((i) => i.name) ?? items.map((i) => i.name),
  );

  const latestResultKey =
    latestResult?.result?._id ||
    latestResult?.result?.spinTime ||
    latestResult?.item?._id ||
    latestResult?.itemName ||
    null;

  React.useEffect(() => {
    setAcknowledgedResultKey(null);
  }, [latestResultKey]);

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

  const handleUpdate = () => {
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
    if (!initialSnapshot || initialSnapshot.length === 0) return;
    setTextValue(initialSnapshot.join("\n"));
    notify({ type: "open", message: "Đã khôi phục danh sách gốc" });
  };

  return (
    <div className="sidebar">
      <div className="tabs">
        <div
          className={`tab ${activeTab === "items" ? "active" : ""}`}
          onClick={() => setActiveTab("items")}
        >
          Mục <span className="badge">{items.length}</span>
        </div>
        <div
          className={`tab ${activeTab === "results" ? "active" : ""}`}
          onClick={() => setActiveTab("results")}
        >
          Kết quả <span className="badge"></span>
        </div>
      </div>

      {contextHolder}
      {activeTab === "items" ? (
        <div className="tab-content">
          <div className="toolbar">
            <Space wrap>
              <Button onClick={shuffleList}>🔀 Trộn</Button>
              <Button onClick={sortAZ}>⬇️ AZ</Button>
              <Button danger onClick={clearList}>
                ✖ Xoá
              </Button>
              <Button onClick={resetList}>🔄 Reset</Button>
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
              placeholder={
                "Nhập tên người tham gia tại đây...\nMỗi người 1 dòng."
              }
              rows={8}
              className="h-full"
            />
          </div>

          <div className="px-4 py-2">
            <Button type="primary" block onClick={handleUpdate}>
              Cập nhật vòng quay
            </Button>
          </div>
        </div>
      ) : (
        <div className="tab-content px-4">
          <ResultDisplay
            latestResult={latestResult}
            refreshKey={refreshKey}
            onDataChanged={onDataChanged}
            resultKey={latestResultKey}
            acknowledgedResultKey={acknowledgedResultKey}
            onAcknowledgeResult={setAcknowledgedResultKey}
          />
          <div className="py-2">
            <Button
              danger
              block
              onClick={() =>
                Modal.confirm({
                  title: "Xóa lịch sử kết quả",
                  content: "Bạn có chắc muốn xóa toàn bộ lịch sử kết quả?",
                  okText: "Xóa",
                  okType: "danger",
                  cancelText: "Hủy",
                  onOk() {
                    /* ResultDisplay handles deletion via its own controls */
                  },
                })
              }
            >
              Xóa lịch sử kết quả
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

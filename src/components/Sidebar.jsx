import React, { useMemo, useState, useContext } from "react";
import ImportExcel from "./ImportExcel";
import ResultDisplay from "./ResultDisplay";
import { generateDistinctColors } from "../utils/colorUtils";
import { Button, Modal, Input, Space } from "antd";
import useNotification from "../hooks/useNotification";
import { ColorContext } from "../contexts/ColorContext";
import { itemAPI } from "../services/api";

const Sidebar = ({
  items,
  onImportSuccess,
  onManualUpdate,
  onItemDeleted,
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
    return items.map((i) => i.name);
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

  const handleUpdate = async () => {
    // Save manual list to localStorage as "last manual list"
    localStorage.setItem("lastManualList", textValue);

    const colors = generateDistinctColors(items, names.length);

    // Find items to deactivate (in current items but not in new list)
    const newNamesSet = new Set(names.map((n) => n.toLowerCase().trim()));
    const itemsToDeactivate = items.filter(
      (item) => !newNamesSet.has(item.name?.toLowerCase().trim()),
    );

    try {
      // Deactivate items that are no longer in the list
      if (itemsToDeactivate.length > 0) {
        await itemAPI.deactivateItems(
          itemsToDeactivate.map((item) => item._id),
        );
      }

      // Create any new items that don't exist on the backend
      const existingNamesSet = new Set(
        items.map((i) => i.name?.toLowerCase().trim()),
      );
      const createPromises = [];
      names.forEach((name, idx) => {
        const normalized = name.toLowerCase().trim();
        if (!existingNamesSet.has(normalized)) {
          createPromises.push(
            itemAPI.addItem({
              name,
              color: colors[idx],
              icon: "🎁",
            }),
          );
        }
      });

      if (createPromises.length > 0) {
        await Promise.all(createPromises);
      }

      // Fetch fresh list from backend and pass to parent
      const resp = await itemAPI.getAllItems();
      const serverItems = resp.data.success ? resp.data.data : [];

      onManualUpdate(
        serverItems.map((i) => ({
          _id: i._id,
          name: i.name,
          color: i.color,
          icon: i.icon || "🎁",
          isActive: i.isActive !== false,
        })),
      );

      notify({
        type: "success",
        message: "Cập nhật vòng quay",
        description: `Đã lưu ${names.length} mục trên server.`,
      });
    } catch (err) {
      console.error("Error updating manual list:", err);
      notify({
        type: "error",
        message: "Lỗi cập nhật",
        description: err.message,
      });
    }
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
      ) : null}
    </div>
  );
};

export default Sidebar;

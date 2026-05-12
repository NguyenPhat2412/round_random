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
  const [resultsCount, setResultsCount] = useState(0);
  const [savedLists, setSavedLists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("savedLists") || "[]");
    } catch {
      return [];
    }
  });
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [isAddingSavedList, setIsAddingSavedList] = useState(false);
  const [newSavedListName, setNewSavedListName] = useState("");
  const [newSavedListText, setNewSavedListText] = useState("");

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

  const handleOpenSavedLists = () => {
    setShowSavedModal(true);
    setIsAddingSavedList(false);
  };

  const handleCloseSavedModal = () => {
    setShowSavedModal(false);
    setIsAddingSavedList(false);
    setNewSavedListName("");
    setNewSavedListText("");
  };

  const handleStartAddSavedList = () => {
    setIsAddingSavedList(true);
    setNewSavedListName("");
    setNewSavedListText("");
  };

  const handleSaveSavedList = () => {
    const name = newSavedListName.trim();
    const content = newSavedListText.trim();
    if (!name) {
      notify({ type: "warning", message: "Vui lòng nhập tên danh sách" });
      return;
    }
    if (!content) {
      notify({ type: "warning", message: "Vui lòng nhập nội dung danh sách" });
      return;
    }

    const listItems = content
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!listItems.length) {
      notify({ type: "warning", message: "Danh sách không được để trống" });
      return;
    }

    const existing = savedLists.some((list) => list.name === name);
    const updatedLists = existing
      ? savedLists.map((list) =>
          list.name === name ? { ...list, items: listItems } : list,
        )
      : [...savedLists, { name, items: listItems }];

    localStorage.setItem("savedLists", JSON.stringify(updatedLists));
    setSavedLists(updatedLists);
    notify({
      type: "success",
      message: "Đã lưu danh sách",
      description: `Danh sách "${name}" đã được lưu.`,
    });
    setIsAddingSavedList(false);
    setNewSavedListName("");
    setNewSavedListText("");
  };

  const handleCancelAddSavedList = () => {
    setIsAddingSavedList(false);
    setNewSavedListName("");
    setNewSavedListText("");
  };

  const handleUseSavedList = (list) => {
    setTextValue(list.items.join("\n"));
    notify({
      type: "success",
      message: "Đã tải danh sách",
      description: `Danh sách "${list.name}" đã được tải.`,
    });
    setShowSavedModal(false);
  };

  const handleDeleteSavedList = (name) => {
    const filtered = savedLists.filter((list) => list.name !== name);
    localStorage.setItem("savedLists", JSON.stringify(filtered));
    setSavedLists(filtered);
    notify({ type: "success", message: `Đã xóa danh sách "${name}"` });
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
      {contextHolder}
      <div className="tabs">
        <div
          className={`tab ${activeTab === "items" ? "active" : ""}`}
          onClick={() => setActiveTab("items")}
        >
          Danh sách <span className="badge">{items.length}</span>
        </div>
        <div
          className={`tab ${activeTab === "results" ? "active" : ""}`}
          onClick={() => setActiveTab("results")}
        >
          Kết quả <span className="badge">{resultsCount}</span>
        </div>
      </div>

      {showResultDisplay && (
        <ResultDisplay
          latestResult={latestResult}
          refreshKey={refreshKey}
          onDataChanged={onDataChanged}
          onItemDeleted={onItemDeleted}
          showResultsList={activeTab === "results"}
          onResultsCountChange={setResultsCount}
        />
      )}

      {activeTab === "items" ? (
        <div className="tab-content">
          <div className="toolbar">
            <Space wrap>
              <Button onClick={shuffleList}>🔀 Trộn</Button>
              <Button onClick={sortAZ}>🔤 A đến Z</Button>
              <Button
                onClick={handleOpenSavedLists}
                style={{
                  backgroundColor: "#8bc34a",
                  borderColor: "#8bc34a",
                  color: "#fff",
                }}
              >
                🔄 Danh sách đã lưu
              </Button>
            </Space>
          </div>

          <div className="px-4 py-2">
            <ImportExcel onImportSuccess={onImportSuccess} />
          </div>

          <Modal
            title="Danh sách đã lưu"
            open={showSavedModal}
            onCancel={handleCloseSavedModal}
            footer={null}
          >
            {!isAddingSavedList ? (
              <div>
                <div className="mb-4">
                  {savedLists.length > 0 ? (
                    savedLists.map((list) => (
                      <div
                        key={list.name}
                        className="flex items-center justify-between gap-2 mb-2"
                      >
                        <span>{list.name}</span>
                        <Space>
                          <Button
                            size="small"
                            onClick={() => handleUseSavedList(list)}
                          >
                            Mở
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => handleDeleteSavedList(list.name)}
                          >
                            Xóa
                          </Button>
                        </Space>
                      </div>
                    ))
                  ) : (
                    <div>Chưa có danh sách đã lưu.</div>
                  )}
                </div>
                <Button type="primary" onClick={handleStartAddSavedList} block>
                  Thêm danh sách lớp
                </Button>
              </div>
            ) : (
              <div>
                <Input
                  placeholder="Tên danh sách lớp"
                  value={newSavedListName}
                  onChange={(e) => setNewSavedListName(e.target.value)}
                  className="mb-3"
                />
                <Input.TextArea
                  placeholder="Nhập danh sách lớp ở đây..."
                  value={newSavedListText}
                  onChange={(e) => setNewSavedListText(e.target.value)}
                  rows={6}
                />
                <Space className="mt-3">
                  <Button type="primary" onClick={handleSaveSavedList}>
                    Thêm
                  </Button>
                  <Button onClick={handleCancelAddSavedList}>Huỷ</Button>
                </Space>
              </div>
            )}
          </Modal>

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
            <Button
              type="primary"
              block
              onClick={handleUpdate}
              style={{
                fontWeight: 700,
                fontSize: "1.05rem",
                padding: "0.9rem 1rem",
              }}
            >
              Cập nhật vòng quay
            </Button>
          </div>
        </div>
      ) : (
        <div className="tab-content px-4">
          <div className="py-2">
            <Button
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
              style={{
                backgroundColor: "#dc2626",
                borderColor: "#dc2626",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1.05rem",
                padding: "0.9rem 1rem",
              }}
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

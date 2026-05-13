import React, { useMemo, useState, useContext } from "react";
import ImportExcel from "./ImportExcel";
import ResultDisplay from "./ResultDisplay";
import { generateDistinctColors } from "../utils/colorUtils";
import { Button, Modal, Input, Space } from "antd";
import useNotification from "../hooks/useNotification";
import { ColorContext } from "../contexts/ColorContext";
import { itemAPI, savedListAPI } from "../services/api";

const Sidebar = ({
  items,
  onImportSuccess,
  onManualUpdate,
  onItemDeleted,
  latestResult,
  refreshKey,
  onDataChanged,
  showResultDisplay = true,
  isAuthenticated = false,
  currentUser = null,
  onLoginClick,
  onLogout,
  displayedResultKey,
  onResultShown,
}) => {
  const [activeTab, setActiveTab] = useState("items");
  const [resultsCount, setResultsCount] = useState(0);
  const [savedLists, setSavedLists] = useState([]);
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

  const requireEditPermission = () => {
    if (isAuthenticated) return true;

    notify({
      type: "warning",
      message: "Bạn cần đăng nhập",
      description: "Đăng nhập để chỉnh sửa danh sách và xóa kết quả.",
    });
    onLoginClick?.();
    return false;
  };

  const fetchSavedLists = async ({ showError = false } = {}) => {
    try {
      const response = await savedListAPI.getAllSavedLists();
      if (response.data.success) {
        setSavedLists(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching saved lists:", error);
      if (showError) {
        notify({
          type: "error",
          message: "Không tải được danh sách đã lưu",
          description: error.response?.data?.message || error.message,
        });
      }
    }
  };

  React.useEffect(() => {
    fetchSavedLists();
  }, []);

  const handleUpdate = async () => {
    if (!requireEditPermission()) return;

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
        description: `Đã lưu ${names.length} mục trên hệ thống.`,
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
    if (!requireEditPermission()) return;

    setShowSavedModal(true);
    setIsAddingSavedList(false);
    fetchSavedLists({ showError: true });
  };

  const handleCloseSavedModal = () => {
    setShowSavedModal(false);
    setIsAddingSavedList(false);
    setNewSavedListName("");
    setNewSavedListText("");
  };

  const handleStartAddSavedList = () => {
    if (!requireEditPermission()) return;

    setIsAddingSavedList(true);
    setNewSavedListName("");
    setNewSavedListText("");
  };

  const handleSaveSavedList = async () => {
    if (!requireEditPermission()) return;

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

    try {
      await savedListAPI.upsertSavedList({ name, items: listItems });
      await fetchSavedLists();
      notify({
        type: "success",
        message: "Đã lưu danh sách",
        description: `Danh sách "${name}" đã được lưu.`,
      });
      setIsAddingSavedList(false);
      setNewSavedListName("");
      setNewSavedListText("");
    } catch (error) {
      notify({
        type: "error",
        message: "Lưu danh sách thất bại",
        description: error.response?.data?.message || error.message,
      });
    }
  };

  const handleCancelAddSavedList = () => {
    setIsAddingSavedList(false);
    setNewSavedListName("");
    setNewSavedListText("");
  };

  const handleUseSavedList = (list) => {
    if (!requireEditPermission()) return;

    setTextValue(list.items.join("\n"));
    notify({
      type: "success",
      message: "Đã tải danh sách",
      description: `Danh sách "${list.name}" đã được tải.`,
    });
    setShowSavedModal(false);
  };

  const handleDeleteSavedList = async (list) => {
    if (!requireEditPermission()) return;

    try {
      await savedListAPI.deleteSavedList(list._id);
      setSavedLists((prev) => prev.filter((saved) => saved._id !== list._id));
      notify({ type: "success", message: `Đã xóa danh sách "${list.name}"` });
    } catch (error) {
      notify({
        type: "error",
        message: "Xóa danh sách thất bại",
        description: error.response?.data?.message || error.message,
      });
    }
  };

  const shuffleList = () => {
    if (!requireEditPermission()) return;

    const arr = [...names];
    arr.sort(() => Math.random() - 0.5);
    setTextValue(arr.join("\n"));
    notify({ type: "open", message: "Đã trộn danh sách" });
  };

  const sortAZ = () => {
    if (!requireEditPermission()) return;

    const arr = [...names].sort((a, b) => a.localeCompare(b));
    setTextValue(arr.join("\n"));
    notify({ type: "open", message: "Đã sắp xếp A→Z" });
  };

  const clearList = () => {
    if (!requireEditPermission()) return;

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
    if (!requireEditPermission()) return;

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
    <div className="sidebar flex flex-col h-full max-h-screen overflow-hidden">
      {" "}
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
          canManageResults={isAuthenticated}
          displayedResultKey={displayedResultKey}
          onResultShown={onResultShown}
        />
      )}
      {activeTab === "items" ? (
        <div className="tab-content flex-1 overflow-y-auto pb-6">
          <div className="toolbar justify-center">
            <Space wrap className="justify-center">
              <Button onClick={shuffleList} disabled={!isAuthenticated}>
                🔀 Trộn
              </Button>
              <Button onClick={sortAZ} disabled={!isAuthenticated}>
                🔤 A đến Z
              </Button>
              <Button
                onClick={handleOpenSavedLists}
                disabled={!isAuthenticated}
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

          <div className="px-4 py-2 flex justify-center">
            <ImportExcel
              onImportSuccess={onImportSuccess}
              disabled={!isAuthenticated}
            />
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
                        key={list._id || list.name}
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
                            onClick={() => handleDeleteSavedList(list)}
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
                  disabled={!isAuthenticated}
                />
                <Input.TextArea
                  placeholder="Nhập danh sách lớp ở đây..."
                  value={newSavedListText}
                  onChange={(e) => setNewSavedListText(e.target.value)}
                  rows={6}
                  disabled={!isAuthenticated}
                />
                <Space className="mt-3">
                  <Button
                    type="primary"
                    onClick={handleSaveSavedList}
                    disabled={!isAuthenticated}
                  >
                    Thêm
                  </Button>
                  <Button onClick={handleCancelAddSavedList}>Huỷ</Button>
                </Space>
              </div>
            )}
          </Modal>

          <div className="px-4 py-2">
            <Input.TextArea
              id="nameList"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={"Nhập tên từng bạn ở đây...\nMỗi dòng là 1 bạn."}
              autoSize={{ minRows: 3, maxRows: 10 }}
              disabled={!isAuthenticated}
            />
          </div>

          <div className="px-4 py-1">
            <Button
              type="primary"
              block
              onClick={handleUpdate}
              disabled={!isAuthenticated}
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
        <div className="tab-content flex-1 px-4">
          <div className="py-2">
            <Button
              block
              disabled={!isAuthenticated}
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
      <div className="shrink-0 z-10 border-t border-gray-200 bg-white px-4 py-4">
        <div className="flex flex-col items-center gap-2 text-center">
          {isAuthenticated ? (
            <>
              <div className="text-sm font-semibold text-blue-600">
                Xin chào Kim Tuyến!
              </div>
              <Button
                onClick={onLogout}
                className="bg-gray-200 hover:bg-gray-300 text-black font-bold border-gray-300"
                style={{
                  borderColor: "#d1d5db",
                  color: "black",
                  fontWeight: "bold",
                }}
              >
                Đăng xuất
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              onClick={onLoginClick}
              style={{ fontWeight: "bold" }}
            >
              Đăng nhập để chỉnh sửa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

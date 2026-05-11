import React, { useMemo, useState } from "react";
import { Button, Input, Space, Modal, Empty, List } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { itemAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

const ItemManager = ({ items, onItemsChange }) => {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "" });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { notify, contextHolder } = useNotification();

  const filteredItems = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      (item.name || "").toLowerCase().includes(normalized),
    );
  }, [items, searchTerm]);

  const startEdit = (item) => {
    setEditingId(item._id);
    setDraft({ name: item.name || "" });
  };

  const handleUpdateItem = async (id) => {
    if (!draft.name.trim()) {
      notify({ type: "warning", message: "Vui lòng nhập tên mục" });
      return;
    }

    try {
      setLoading(true);
      const response = await itemAPI.updateItem(id, draft);
      if (response.data.success) {
        setEditingId(null);
        notify({ type: "success", message: "Cập nhật thành công" });
        onItemsChange(
          items.map((item) => (item._id === id ? response.data.data : item)),
        );
      }
    } catch (error) {
      notify({ type: "error", message: "Lỗi", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const response = await itemAPI.deleteItem(id);
      if (response.data.success) {
        onItemsChange(items.filter((item) => item._id !== id));
        notify({ type: "success", message: "Xóa thành công" });
      }
    } catch (error) {
      notify({ type: "error", message: "Lỗi", description: error.message });
    }
  };

  const handleConfirmDelete = (id) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa mục này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk() {
        handleDeleteItem(id);
      },
    });
  };

  return (
    <>
      {contextHolder}
      <div className="rounded-xl border border-gray-300 bg-white p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">Danh sách dữ liệu</h3>
          <p className="text-xs text-slate-600 mt-1">
            Tổng: {filteredItems.length}/{items.length} mục
          </p>
        </div>

        <Input
          placeholder="Tìm theo tên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        {filteredItems.length > 0 ? (
          <List
            dataSource={filteredItems}
            renderItem={(item) => (
              <List.Item
                key={item._id}
                className="border-b border-gray-200 py-3"
              >
                {editingId === item._id ? (
                  <div className="w-full flex gap-2">
                    <Input
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                      autoFocus
                      className="flex-1"
                    />
                    <Button
                      type="primary"
                      size="small"
                      loading={loading}
                      onClick={() => handleUpdateItem(item._id)}
                    >
                      Lưu
                    </Button>
                    <Button size="small" onClick={() => setEditingId(null)}>
                      Hủy
                    </Button>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-sm"
                        style={{
                          backgroundColor: item.color || "#3b82f6",
                        }}
                      >
                        {String(item.name || "?")[0].toUpperCase()}
                      </div>
                      <span className="text-slate-800 font-medium">
                        {item.name}
                      </span>
                    </div>
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startEdit(item)}
                      >
                        Sửa
                      </Button>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleConfirmDelete(item._id)}
                      >
                        Xóa
                      </Button>
                    </Space>
                  </div>
                )}
              </List.Item>
            )}
          />
        ) : (
          <Empty
            description="Chưa có mục nào"
            style={{ marginTop: "20px", marginBottom: "20px" }}
          />
        )}
      </div>
    </>
  );
};

export default ItemManager;

import React, { useState } from "react";
import { Button, InputNumber, Modal, Table, Typography } from "antd";
import { itemAPI, resultAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

// Bảng tỷ lệ trúng (%) theo từng lượt cho mỗi người. Ô trống = chia đều phần % còn lại.
const toDraft = (items) =>
  Object.fromEntries(
    items.map((item) => [
      item._id,
      Object.fromEntries((item.winRates || []).map((r) => [r.round, r.rate])),
    ]),
  );

const WinRateSettings = ({ items, disabled, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [rounds, setRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(null);
  const [saving, setSaving] = useState(false);
  const { notify, contextHolder } = useNotification();

  const handleOpen = async () => {
    const maxRound = Math.max(
      3,
      ...items.flatMap((i) => (i.winRates || []).map((r) => r.round)),
    );
    setDraft(toDraft(items));
    setRounds(maxRound);
    setOpen(true);
    try {
      const res = await resultAPI.getStats();
      setCurrentRound((res.data.data?.totalSpins || 0) + 1);
    } catch {
      setCurrentRound(null);
    }
  };

  const setRate = (itemId, round, value) =>
    setDraft((d) => ({ ...d, [itemId]: { ...d[itemId], [round]: value } }));

  const roundNumbers = Array.from({ length: rounds }, (_, i) => i + 1);
  const sumOf = (round) =>
    items.reduce((s, item) => s + (draft[item._id]?.[round] ?? 0), 0);

  const handleSave = async () => {
    const changed = items
      .map((item) => {
        const winRates = Object.entries(draft[item._id] || {})
          .filter(([round, rate]) => rate != null && Number(round) <= rounds)
          .map(([round, rate]) => ({ round: Number(round), rate }));
        return { item, winRates };
      })
      .filter(
        ({ item, winRates }) =>
          JSON.stringify(winRates) !==
          JSON.stringify((item.winRates || []).map(({ round, rate }) => ({ round, rate }))),
      );

    try {
      setSaving(true);
      await Promise.all(
        changed.map(({ item, winRates }) =>
          itemAPI.updateItem(item._id, { winRates }),
        ),
      );
      const resp = await itemAPI.getAllItems();
      onSaved?.(resp.data.data || []);
      notify({ type: "success", message: "Đã lưu tỷ lệ trúng" });
      setOpen(false);
    } catch (err) {
      notify({
        type: "error",
        message: "Lỗi lưu tỷ lệ",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Người", dataIndex: "name", fixed: "left", width: 160 },
    ...roundNumbers.map((round) => {
      const sum = sumOf(round);
      return {
        title: (
          <div style={{ textAlign: "center" }}>
            <div>
              Lượt {round}
              {round === currentRound ? " (hiện tại)" : ""}
            </div>
            <Typography.Text type={sum > 100 ? "danger" : "secondary"} style={{ fontSize: 12 }}>
              Tổng: {sum}%
            </Typography.Text>
          </div>
        ),
        key: round,
        width: 120,
        render: (_, item) => (
          <InputNumber
            min={0}
            max={100}
            placeholder="ngẫu nhiên"
            addonAfter="%"
            value={draft[item._id]?.[round]}
            onChange={(v) => setRate(item._id, round, v)}
            aria-label={`Tỷ lệ ${item.name} lượt ${round}`}
          />
        ),
      };
    }),
  ];

  return (
    <>
      {contextHolder}
      <Button
        onClick={handleOpen}
        disabled={disabled || !items.length}
        title="Cài đặt"
        aria-label="Cài đặt"
      >
        ⚙️
      </Button>
      <Modal
        title="Cài đặt"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        width={Math.min(1100, 260 + rounds * 140)}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          Lượt hiện tại: <b>{currentRound ?? "?"}</b>. Ô để trống = phần % còn
          lại chia đều cho những người chưa đặt. Đặt 100% để chắc chắn trúng.
          "Xóa lịch sử quay" sẽ đưa về lượt 1.
        </Typography.Paragraph>
        <Table
          rowKey="_id"
          size="small"
          dataSource={items}
          columns={columns}
          pagination={false}
          scroll={{ x: "max-content", y: 420 }}
        />
        <Button className="mt-3" onClick={() => setRounds((r) => r + 1)}>
          + Thêm lượt
        </Button>
        {rounds > 1 && (
          <Button className="mt-3 ml-2" onClick={() => setRounds((r) => r - 1)}>
            − Bớt lượt
          </Button>
        )}
      </Modal>
    </>
  );
};

export default WinRateSettings;

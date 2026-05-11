import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Modal,
  Pagination,
  Spin,
  Empty,
  Space,
  Row,
  Col,
  Statistic,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { resultAPI, itemAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

const ResultDisplay = ({
  latestResult,
  refreshKey,
  onDataChanged,
  resultKey,
  acknowledgedResultKey,
  onAcknowledgeResult,
}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const hasPlayedAudioRef = useRef(false);
  const { notify, contextHolder } = useNotification();

  useEffect(() => {
    fetchResults();
    fetchStats();
  }, [page, refreshKey]);

  useEffect(() => {
    if (!resultKey || resultKey === acknowledgedResultKey) {
      setShowModal(false);
      return;
    }

    setShowModal(true);
  }, [resultKey, acknowledgedResultKey]);

  const dismissModal = () => {
    setShowModal(false);
    if (resultKey) {
      onAcknowledgeResult?.(resultKey);
    }
  };

  useEffect(() => {
    if (!showModal) {
      hasPlayedAudioRef.current = false;
      return;
    }

    if (hasPlayedAudioRef.current) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        1320,
        audioContext.currentTime + 0.18,
      );
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.18,
        audioContext.currentTime + 0.02,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.22,
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.24);

      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };

      hasPlayedAudioRef.current = true;
    } catch (error) {
      console.error("Audio playback failed:", error);
    }
  }, [showModal]);

  const topStats = useMemo(() => {
    if (!stats?.itemStats?.length) return [];
    return stats.itemStats.slice(0, 3);
  }, [stats]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await resultAPI.getResultsByPage(page, 10);
      if (response.data.success) {
        setResults(response.data.data);
        setTotalPages(response.data.pagination.total_pages);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await resultAPI.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa toàn bộ kết quả quay?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const response = await resultAPI.clearAllResults();
          if (response.data.success) {
            setResults([]);
            setStats(null);
            setPage(1);
            fetchStats();
            onDataChanged?.();
            notify({
              type: "success",
              message: "Xóa tất cả kết quả thành công",
            });
          }
        } catch (error) {
          notify({ type: "error", message: "Lỗi", description: error.message });
        }
      },
    });
  };

  const handleDeleteResult = async (id) => {
    try {
      const response = await resultAPI.deleteResult(id);
      if (response.data.success) {
        fetchResults();
        fetchStats();
        onDataChanged?.();
        notify({ type: "success", message: "Xóa kết quả thành công" });
      }
    } catch (error) {
      notify({ type: "error", message: "Lỗi", description: error.message });
    }
  };

  const handleModalDelete = async () => {
    try {
      const id = latestResult?.item?._id || latestResult?.result?.itemId;
      if (!id) return;
      await itemAPI.deleteItem(id);
      dismissModal();
      fetchResults();
      fetchStats();
      onDataChanged?.();
      notify({ type: "success", message: "Xóa mục thành công" });
    } catch (error) {
      notify({ type: "error", message: "Lỗi", description: error.message });
    }
  };

  const handleModalKeep = () => {
    dismissModal();
  };

  return (
    <>
      {contextHolder}
      <div className="rounded-xl border border-gray-300 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Lịch sử quay</h3>
            <p className="text-xs text-slate-600 mt-1">
              Tổng: {stats?.totalSpins || 0} lượt quay
            </p>
          </div>
        </div>

        {latestResult && (
          <div className="mb-4 p-3 rounded-lg border border-cyan-200 bg-cyan-50">
            <div className="text-xs font-semibold uppercase text-cyan-700 mb-2">
              Kết quả gần nhất
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg">
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-sm"
                style={{
                  backgroundColor:
                    latestResult.item?.color ||
                    latestResult.details?.color ||
                    "#0ea5e9",
                }}
              >
                {latestResult.item?.icon || latestResult.details?.icon || "🎁"}
              </div>
              <div>
                <div className="font-semibold text-slate-800">
                  {latestResult.item?.name || latestResult.itemName}
                </div>
                <div className="text-xs text-slate-600">
                  {latestResult.item?.description || "Đã lưu vào danh sách"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for spin result */}
        <Modal
          title={
            <div className="text-center font-bold text-xl">
              🎉 Xin chúc mừng!
            </div>
          }
          open={showModal && !!latestResult}
          onCancel={handleModalKeep}
          footer={null}
          centered
        >
          <style>{`
            @keyframes confetti-fall { 
              0% {transform: translateY(-10vh) rotate(0)} 
              100% {transform: translateY(60vh) rotate(360deg)} 
            }
            .confetti { 
              position:absolute; 
              width:10px; 
              height:14px; 
              opacity:0.9; 
              animation: confetti-fall 1.8s linear infinite; 
            }
          `}</style>
          {/* Confetti elements */}
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${(i / 18) * 100}%`,
                background: [
                  "#F97316",
                  "#10B981",
                  "#60A5FA",
                  "#F472B6",
                  "#FDE68A",
                ][i % 5],
                animationDelay: `${(i % 6) * 0.08}s`,
              }}
            />
          ))}

          <div className="mb-4 text-center">
            <div className="text-base text-slate-600">
              Kết quả:{" "}
              <span className="font-semibold text-slate-800">
                {latestResult?.item?.name || latestResult?.itemName}
              </span>
            </div>
          </div>

          <Space className="w-full flex justify-center gap-2">
            <Button danger onClick={handleModalDelete} type="primary">
              Xóa
            </Button>
            <Button onClick={() => setShowModal(false)}>Không Xóa</Button>
          </Space>
        </Modal>

        {/* Stats */}
        {stats && (
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} sm={12} lg={6}>
              <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
                <Statistic value={stats.totalSpins} />
                <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">
                  Tổng lần quay
                </div>
              </div>
            </Col>
            {topStats.map((item) => (
              <Col
                key={`${item.itemId || item._id || item.itemName}`}
                xs={24}
                sm={12}
                lg={6}
              >
                <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
                  <Statistic value={item.count} />
                  <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">
                    {item.itemName || item._id}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}

        {/* Results List */}
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold text-slate-800">Danh sách quay</h4>
            {results.length > 0 && (
              <Button danger size="small" onClick={handleClearAll}>
                Xóa tất cả
              </Button>
            )}
          </div>

          {loading ? (
            <Spin tip="Đang tải..." className="w-full py-8" />
          ) : results.length > 0 ? (
            <>
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div
                    key={result._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 text-xs font-semibold bg-cyan-50 text-cyan-700 rounded">
                        #{(page - 1) * 10 + idx + 1}
                      </span>
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                        style={{
                          backgroundColor: result.details?.color || "#0ea5e9",
                        }}
                      >
                        {result.details?.icon || ""}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">
                          {result.itemName}
                        </div>
                        <div className="text-xs text-slate-600">
                          {new Date(result.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    </div>
                    <Button
                      danger
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteResult(result._id)}
                    >
                      Xóa
                    </Button>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    current={page}
                    total={totalPages * 10}
                    pageSize={10}
                    onChange={setPage}
                    size="small"
                  />
                </div>
              )}
            </>
          ) : (
            <Empty description="Chưa có kết quả quay nào" className="py-4" />
          )}
        </div>
      </div>
    </>
  );
};
export default ResultDisplay;

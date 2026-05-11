import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, Pagination, Spin, Empty, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { resultAPI, itemAPI } from "../services/api";
import useNotification from "../hooks/useNotification";
import { triggerFireworks } from "../utils/confetti";

const ResultDisplay = ({
  latestResult,
  refreshKey,
  onDataChanged,
  showResultsList = true,
}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const hasPlayedAudioRef = useRef(false);
  const hasTriggeredFireworksRef = useRef(false);
  const shownResultKeyRef = useRef(null);
  const fireworksTimerRef = useRef(null);
  const { notify, contextHolder } = useNotification();

  const latestResultKey =
    latestResult?.result?._id ||
    latestResult?.result?.spinTime ||
    latestResult?.item?._id ||
    latestResult?.itemName ||
    null;

  useEffect(() => {
    fetchResults();
  }, [page, refreshKey]);

  useEffect(() => {
    if (!latestResultKey) return;
    if (shownResultKeyRef.current === latestResultKey) return;

    shownResultKeyRef.current = latestResultKey;
    setShowModal(true);
  }, [latestResultKey]);

  useEffect(() => {
    if (!showModal || !latestResult) {
      hasTriggeredFireworksRef.current = false;
      if (fireworksTimerRef.current) {
        clearInterval(fireworksTimerRef.current);
        fireworksTimerRef.current = null;
      }
      return;
    }

    if (hasTriggeredFireworksRef.current) return;

    fireworksTimerRef.current = triggerFireworks();
    hasTriggeredFireworksRef.current = true;
  }, [showModal, latestResult]);

  useEffect(() => {
    return () => {
      if (fireworksTimerRef.current) {
        clearInterval(fireworksTimerRef.current);
      }
    };
  }, []);

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

  const dismissModal = () => {
    if (fireworksTimerRef.current) {
      clearInterval(fireworksTimerRef.current);
      fireworksTimerRef.current = null;
    }
    setShowModal(false);
  };

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
            setPage(1);
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
      onDataChanged?.();
      notify({ type: "success", message: "Xóa mục thành công" });
    } catch (error) {
      notify({ type: "error", message: "Lỗi", description: error.message });
    }
  };

  return (
    <>
      {contextHolder}
      <div className="rounded-xl border border-gray-300 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">
              Những lượt quay trước
            </h3>
          </div>
        </div>

        <Modal
          title={
            <div className="text-center font-bold text-xl text-emerald-600">
              🎉 Xin chúc mừng bạn nhỏ may mắn nhất lớp mình hôm nay
            </div>
          }
          open={showModal && !!latestResult}
          onCancel={dismissModal}
          footer={null}
          centered
          className="result-pop-modal"
          maskStyle={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
        >
          <style>{`
            @keyframes popIn {
              0% { transform: scale(0.7); opacity: 0; }
              60% { transform: scale(1.03); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            .result-pop-modal .ant-modal-content {
              animation: popIn 0.35s ease-out;
              box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
              border: 2px solid rgba(16, 185, 129, 0.12);
            }
          `}</style>

          <div className="mb-4 text-center">
            <div className="text-lg text-slate-700 font-medium">
              <span className="font-bold text-emerald-700">
                {latestResult?.item?.name || latestResult?.itemName}
              </span>
            </div>
          </div>

          <Space className="w-full flex justify-center gap-3">
            <Button danger onClick={handleModalDelete} type="primary">
              Xóa
            </Button>
            <Button
              onClick={dismissModal}
              className="animate-pulse font-bold bg-emerald-500 text-white border-emerald-500 hover:!bg-emerald-600 hover:!text-white"
            >
              ✅ Tiếp tục
            </Button>
          </Space>
        </Modal>

        {showResultsList && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 text-lg">
                📋 Danh sách quay trúng
              </h4>
              {results.length > 0 && (
                <Button danger size="small" onClick={handleClearAll}>
                  Xóa hết
                </Button>
              )}
            </div>

            {loading ? (
              <Spin description="Đang tải..." className="w-full py-8" />
            ) : results.length > 0 ? (
              <>
                <div className="space-y-2">
                  {results.map((result, idx) => (
                    <div
                      key={result._id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm hover:shadow-md transition-shadow border-l-4"
                      style={{
                        borderLeftColor: result.details?.color || "#0ea5e9",
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="px-3 py-1 text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full min-w-12 text-center">
                          #{(page - 1) * 10 + idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 text-base">
                            {result.itemName}
                          </div>
                        </div>
                      </div>
                      <Button
                        danger
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteResult(result._id)}
                      />
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
              <Empty description="Chưa có lượt quay nào" className="py-8" />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ResultDisplay;

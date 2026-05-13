import React, { useEffect, useRef, useState, useContext } from "react";
import { Button, Modal, Pagination, Spin, Empty, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { resultAPI, itemAPI } from "../services/api";
import useNotification from "../hooks/useNotification";
import { triggerFireworks } from "../utils/confetti";
import { ColorContext } from "../contexts/ColorContext";
import clapAudio from "../../audio/clap.mp3";

const RESULT_PAGE_SIZE = 5;

const ResultDisplay = ({
  latestResult,
  refreshKey,
  onDataChanged,
  onItemDeleted,
  showResultsList = true,
  onResultsCountChange,
  canManageResults = false,
  displayedResultKey,
  onResultShown,
}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [itemIsActive, setItemIsActive] = useState(true);
  const pageCacheRef = useRef({});
  const hasMountedPageEffectRef = useRef(false);
  const hasPlayedAudioRef = useRef(false);
  const hasTriggeredFireworksRef = useRef(false);
  const shownResultKeyRef = useRef(null);
  const fireworksTimerRef = useRef(null);
  const clapAudioRef = useRef(null);
  const { notify, contextHolder } = useNotification();
  const { pointerColor } = useContext(ColorContext);

  const latestResultKey =
    latestResult?.result?._id ||
    latestResult?.result?.spinTime ||
    latestResult?.item?._id ||
    latestResult?.itemName ||
    null;

  useEffect(() => {
    pageCacheRef.current = {};
    fetchResults(page, { force: true });
  }, [refreshKey]);

  useEffect(() => {
    if (!hasMountedPageEffectRef.current) {
      hasMountedPageEffectRef.current = true;
      return;
    }

    fetchResults(page);
  }, [page]);

  useEffect(() => {
    if (!latestResultKey) return;
    if (shownResultKeyRef.current === latestResultKey) return;
    if (displayedResultKey === latestResultKey) {
      shownResultKeyRef.current = latestResultKey;
      return;
    }

    shownResultKeyRef.current = latestResultKey;
    onResultShown?.(latestResultKey);
    setShowModal(true);

    const itemId = latestResult?.item?._id;
    if (itemId) {
      itemAPI
        .getItemById(itemId)
        .then((response) => {
          if (response.data.success) {
            setItemIsActive(response.data.data.isActive !== false);
          }
        })
        .catch((err) => console.error("Error fetching item status:", err));
    }
  }, [latestResultKey, latestResult, displayedResultKey, onResultShown]);

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

    fireworksTimerRef.current = triggerFireworks(pointerColor);
    hasTriggeredFireworksRef.current = true;
  }, [showModal, latestResult, pointerColor]);

  useEffect(() => {
    if (!clapAudioRef.current) {
      const audio = new Audio(clapAudio);
      audio.preload = "auto";
      audio.volume = 1;
      audio.load();
      clapAudioRef.current = audio;
    }

    return () => {
      try {
        clapAudioRef.current?.pause();
      } catch {
        // noop
      }
    };
  }, []);

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
      if (!clapAudioRef.current) return;

      clapAudioRef.current.currentTime = 0;
      clapAudioRef.current.play().catch((error) => {
        console.error("Clap audio playback failed:", error);
      });

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
    setItemIsActive(true);
  };

  const fetchResults = async (targetPage = page, options = {}) => {
    const { force = false } = options;

    if (!force) {
      const cachedPage = pageCacheRef.current[targetPage];
      if (cachedPage) {
        setResults(cachedPage.results);
        setTotalPages(cachedPage.totalPages);
        onResultsCountChange?.(
          cachedPage.totalRecords ?? cachedPage.results.length ?? 0,
        );
        return;
      }
    }

    try {
      setLoading(true);
      const response = await resultAPI.getResultsByPage(
        targetPage,
        RESULT_PAGE_SIZE,
      );
      if (response.data.success) {
        const fetchedResults = response.data.data;
        const totalRecords =
          response.data.pagination?.total_records ?? fetchedResults.length;
        const totalPagesValue = response.data.pagination?.total_pages ?? 1;
        setResults(fetchedResults);
        setTotalPages(totalPagesValue);
        onResultsCountChange?.(totalRecords);
        pageCacheRef.current[targetPage] = {
          results: fetchedResults,
          totalPages: totalPagesValue,
          totalRecords,
        };
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (id) => {
    if (!canManageResults) {
      notify({
        type: "warning",
        message: "Bạn cần đăng nhập",
        description: "Đăng nhập để xóa kết quả quay.",
      });
      return;
    }

    try {
      const response = await resultAPI.deleteResult(id);
      if (response.data.success) {
        const updated = results.filter((result) => result._id !== id);
        setResults(updated);
        pageCacheRef.current[page] = {
          ...(pageCacheRef.current[page] || {}),
          results: updated,
        };
        onResultsCountChange?.(updated.length);
        onDataChanged?.();
        notify({ type: "success", message: "Xóa kết quả thành công" });
      }
    } catch (error) {
      notify({ type: "error", message: "Lỗi", description: error.message });
    }
  };

  const handleModalDelete = async () => {
    if (!canManageResults) {
      notify({
        type: "warning",
        message: "Bạn cần đăng nhập",
        description: "Đăng nhập để xóa mục trong kết quả.",
      });
      return;
    }

    try {
      const id = latestResult?.item?._id || latestResult?.result?.itemId;
      if (!id) return;
      await itemAPI.deleteItem(id);
      onItemDeleted?.(id);
      dismissModal();
      onDataChanged?.();
      notify({ type: "success", message: "Xóa mục thành công" });
    } catch (error) {
      notify({ type: "error", message: "Lỗi", description: error.message });
    }
  };

  const modalContent = (
    <Modal
      title={
        <div className="text-center text-2xl text-black-600">
          🎉 Xin chúc mừng bạn nhỏ may mắn nhất lớp mình hôm nay:
        </div>
      }
      open={showModal && !!latestResult}
      onCancel={dismissModal}
      footer={null}
      centered
      className="result-pop-modal"
      width={760}
      maskStyle={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
    >
      <div className="mb-4 text-center">
        <div className="text-xl md:text-2xl text-slate-700 font-medium leading-snug">
          <span className="font-bold text-emerald-700 text-4xl md:text-5xl inline-block">
            "{latestResult?.item?.name || latestResult?.itemName}"
          </span>
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <div className="w-full sm:w-auto flex justify-center">
          <Space>
            {canManageResults && (
              <Button
                danger
                onClick={handleModalDelete}
                disabled={!itemIsActive}
                type="primary"
              >
                Xóa ô này
              </Button>
            )}
          </Space>
        </div>
        <div className="w-full sm:w-auto flex justify-center">
          <Space>
            <Button
              onClick={dismissModal}
              className="font-bold text-white w-full sm:w-auto"
              style={{
                backgroundColor: "#2563eb",
                borderColor: "#2563eb",
                fontWeight: 700,
              }}
            >
              Tiếp tục quay
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );

  return (
    <>
      {contextHolder}
      {showResultsList ? (
        <div className="rounded-xl border border-gray-300 bg-white p-4">
          {modalContent}

          <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-normal text-slate-800 text-lg">
                  Danh sách quay trúng
                </h4>
              </div>
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
                        <span className="px-3 py-1 text-sm font-normal bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full min-w-12 text-center">
                          #{(page - 1) * RESULT_PAGE_SIZE + idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-normal text-slate-800 text-base">
                            {result.itemName}
                          </div>
                        </div>
                      </div>
                      {canManageResults && (
                        <Button
                          danger
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteResult(result._id)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="w-full flex justify-center">
                    <Pagination
                      current={page}
                      total={Math.max(1, totalPages) * RESULT_PAGE_SIZE}
                      pageSize={RESULT_PAGE_SIZE}
                      onChange={(newPage) => setPage(newPage)}
                      size="small"
                      showSizeChanger={false}
                    />
                  </div>
                </div>
              </>
            ) : (
              <Empty description="Chưa có lượt quay nào" className="py-8" />
            )}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none contents">{modalContent}</div>
      )}
    </>
  );
};

export default ResultDisplay;

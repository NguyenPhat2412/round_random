import React, { useMemo, useState } from "react";
import { Upload, Button, Alert, Space, Spin } from "antd";
import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
import { uploadAPI } from "../services/api";
import useNotification from "../hooks/useNotification";

const ImportExcel = ({ onImportSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const { notify, contextHolder } = useNotification();

  const beforeUpload = (file) => {
    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!validTypes.includes(file.type)) {
      notify({
        type: "error",
        message: "Loại file không hợp lệ",
        description: "Vui lòng chọn file Excel (.xls, .xlsx)",
      });
      return false;
    }
    return true;
  };

  const handleUpload = async (options) => {
    const { file } = options;
    try {
      setLoading(true);
      const response = await uploadAPI.importExcel(file);
      if (response.data.success) {
        notify({
          type: "success",
          message: "Nhập thành công",
          description: `Đã nhập ${response.data.data.length} mục.`,
        });
        onImportSuccess(response.data.data);
        setFileList([]);
      }
    } catch (error) {
      notify({
        type: "error",
        message: "Lỗi nhập file",
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="rounded-lg border border-gray-300 bg-white p-4">
        <h3 className="font-semibold text-slate-800 mb-2">Nhập Excel</h3>
        <p className="text-xs text-slate-600 mb-3">
          Tải file .xls hoặc .xlsx chứa danh sách tên.
        </p>
        <Upload
          maxCount={1}
          fileList={fileList}
          onChange={(info) => setFileList(info.fileList)}
          beforeUpload={beforeUpload}
          customRequest={handleUpload}
          accept=".xls,.xlsx"
          disabled={loading}
        >
          <Button icon={<UploadOutlined />} block loading={loading}>
            {loading ? "Đang xử lý..." : "Chọn file Excel"}
          </Button>
        </Upload>
      </div>
    </>
  );
};

export default ImportExcel;

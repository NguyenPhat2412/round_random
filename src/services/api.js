import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL + "/api" || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Item API calls
export const itemAPI = {
  getAllItems: () => apiClient.get("/items"),
  addItem: (itemData) => apiClient.post("/items", itemData),
  updateItem: (id, itemData) => apiClient.put(`/items/${id}`, itemData),
  deleteItem: (id) => apiClient.delete(`/items/${id}`),
  spinWheel: () => apiClient.post("/items/spin/wheel"),
};

// Result API calls
export const resultAPI = {
  getAllResults: () => apiClient.get("/results"),
  getResultsByPage: (page, limit) =>
    apiClient.get(`/results/page/${page}?limit=${limit}`),
  getStats: () => apiClient.get("/results/stats/all"),
  deleteResult: (id) => apiClient.delete(`/results/${id}`),
  clearAllResults: () => apiClient.delete("/results/clear/all"),
};

// Upload API calls
export const uploadAPI = {
  importExcel: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/upload/import-excel", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default apiClient;

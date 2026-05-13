import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = `${baseUrl.replace(/\/$/, "")}`;
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Item API calls
export const itemAPI = {
  getAllItems: () => apiClient.get("/items"),
  getItemById: (id) => apiClient.get(`/items/${id}`),
  addItem: (itemData) => apiClient.post("/items", itemData),
  updateItem: (id, itemData) => apiClient.put(`/items/${id}`, itemData),
  deleteItem: (id) => apiClient.delete(`/items/${id}`),
  spinWheel: () => apiClient.post("/items/spin/wheel"),
  // Deactivate items by IDs
  deactivateItems: (itemIds) =>
    Promise.all(
      itemIds.map((id) => apiClient.put(`/items/${id}`, { isActive: false })),
    ),
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

// User API calls
export const userAPI = {
  login: (credentials) => apiClient.post("/users/login", credentials),
};
export const savedListAPI = {
  getAllSavedLists: () => apiClient.get("/saved-lists"),
  upsertSavedList: (payload) => apiClient.post("/saved-lists", payload),
  deleteSavedList: (id) => apiClient.delete(`/saved-lists/${id}`),
};

export default apiClient;

import axios from "axios";

const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
};

export const projectAPI = {
  getAll: () => api.get("/projects"),
  create: (data) => api.post("/projects", data),
  getById: (id) => api.get(`/projects/${id}`),
  delete: (id) => api.delete(`/projects/${id}`),
  join: (inviteCode) => api.post("/projects/join", { inviteCode }),
};

export const taskAPI = {
  getByProject: (projectId, filters = {}) => {
    const params = new URLSearchParams(filters);
    return api.get(`/tasks/project/${projectId}?${params}`);
  },
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === "attachments") {
        data[key].forEach((file) => formData.append("attachments", file));
      } else {
        formData.append(key, data[key]);
      }
    });
    return api.post("/tasks", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, text) => api.post(`/tasks/${id}/comments`, { text }),
};

export default api;

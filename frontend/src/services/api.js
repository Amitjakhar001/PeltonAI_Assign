import axios from "axios";

const BASE_URL = "http://localhost:5000";

// Create axios instance
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Adding auth token to request:", config.url);
    }
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error(
      "❌ API Error:",
      error.config?.url,
      error.response?.status,
      error.message
    );

    if (error.response?.status === 401) {
      console.log("🚫 Unauthorized - Token may be expired");
      // Don't auto-redirect here, let the auth hook handle it
      // Just log the error for debugging
    }

    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timeout");
      error.message = "Request timed out. Please check your connection.";
    }

    if (!error.response) {
      console.error("🌐 Network error - server may be down");
      error.message = "Network error. Please check if the server is running.";
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => {
    console.log("🔐 Attempting login for:", credentials.email);
    return api.post("/auth/login", credentials);
  },
  register: (userData) => {
    console.log("📝 Attempting registration for:", userData.email);
    return api.post("/auth/register", userData);
  },
  getProfile: () => {
    console.log("👤 Fetching user profile");
    return api.get("/auth/profile");
  },
};

// Project API
export const projectAPI = {
  getAll: () => {
    console.log("📋 Fetching all projects");
    return api.get("/projects");
  },
  getById: (id) => {
    console.log("📋 Fetching project:", id);
    return api.get(`/projects/${id}`);
  },
  create: (projectData) => {
    console.log("➕ Creating project:", projectData.name);
    return api.post("/projects", projectData);
  },
  update: (id, projectData) => {
    console.log("✏️ Updating project:", id);
    return api.put(`/projects/${id}`, projectData);
  },
  delete: (id) => {
    console.log("🗑️ Deleting project:", id);
    return api.delete(`/projects/${id}`);
  },
  join: (inviteCode) => {
    console.log("🔗 Joining project with code:", inviteCode);
    return api.post("/projects/join", { inviteCode });
  },
  leave: (id) => {
    console.log("🚪 Leaving project:", id);
    return api.post(`/projects/${id}/leave`);
  },
  addMember: (id, userId) => {
    console.log("👥 Adding member to project:", id);
    return api.post(`/projects/${id}/members`, { userId });
  },
  removeMember: (id, userId) => {
    console.log("👥 Removing member from project:", id);
    return api.delete(`/projects/${id}/members/${userId}`);
  },
};

// Task API
export const taskAPI = {
  getByProject: (projectId, filters = {}) => {
    console.log("📝 Fetching tasks for project:", projectId, filters);
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    return api.get(`/tasks/project/${projectId}?${params}`);
  },
  getMyTasks: (queryString = "") => {
    console.log("📝 Fetching my assigned tasks");
    return api.get(`/tasks/my-tasks?${queryString}`);
  },
  create: (taskData) => {
    console.log("➕ Creating task");
    return api.post("/tasks", taskData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  update: (id, taskData) => {
    console.log("✏️ Updating task:", id);
    return api.put(`/tasks/${id}`, taskData);
  },
  delete: (id) => {
    console.log("🗑️ Deleting task:", id);
    return api.delete(`/tasks/${id}`);
  },
  addComment: (id, text) => {
    console.log("💬 Adding comment to task:", id);
    return api.post(`/tasks/${id}/comments`, { text });
  },
  updateStatus: (id, status) => {
    console.log("📊 Updating task status:", id, status);
    return api.patch(`/tasks/${id}/status`, { status });
  },
};

// Notification API
export const notificationAPI = {
  getAll: (queryString = "") => {
    console.log("🔔 Fetching notifications");
    return api.get(`/notifications?${queryString}`);
  },
  markAsRead: (id) => {
    console.log("✓ Marking notification as read:", id);
    return api.put(`/notifications/${id}/read`);
  },
  markAllAsRead: () => {
    console.log("✓ Marking all notifications as read");
    return api.put("/notifications/read-all");
  },
  delete: (id) => {
    console.log("🗑️ Deleting notification:", id);
    return api.delete(`/notifications/${id}`);
  },
};

export default api;

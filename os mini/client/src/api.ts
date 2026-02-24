import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: handle 401s
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken && !error.config._retry) {
                error.config._retry = true;
                try {
                    const { data } = await axios.post('/api/auth/refresh', {}, {
                        headers: { Authorization: `Bearer ${refreshToken}` },
                    });
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    error.config.headers.Authorization = `Bearer ${data.access_token}`;
                    return api(error.config);
                } catch {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// Auth endpoints
export const authAPI = {
    signup: (data: { username: string; email: string; password: string }) =>
        api.post('/auth/signup', data),
    login: (data: { username: string; password: string }) =>
        api.post('/auth/login', data),
    getProfile: () => api.get('/auth/me'),
};

// File endpoints
export const fileAPI = {
    upload: (formData: FormData) =>
        api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    list: () => api.get('/files'),
    decrypt: (fileId: number, passphrase: string) =>
        api.post(`/files/decrypt/${fileId}`, { passphrase }, { responseType: 'blob' }),
    delete: (fileId: number) => api.delete(`/files/${fileId}`),
    stats: () => api.get('/files/stats'),
};

// Security endpoints
export const securityAPI = {
    getAuditLogs: (limit?: number) =>
        api.get('/security/audit-logs', { params: { limit } }),
    getFailedLogins: (limit?: number) =>
        api.get('/security/failed-logins', { params: { limit } }),
    createShareLink: (data: { file_id: number; expiry_hours?: number; passphrase?: string }) =>
        api.post('/security/share', data),
    accessSharedFile: (data: { token: string; encryption_passphrase: string; share_passphrase?: string }) =>
        api.post('/security/share/access', data, { responseType: 'blob' }),
};

// Admin endpoints
export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    getAuditLogs: (limit?: number) =>
        api.get('/admin/audit-logs', { params: { limit } }),
    getStats: () => api.get('/admin/stats'),
};

// Room endpoints
export const roomsAPI = {
    list: () => api.get('/rooms'),
    create: (data: { name: string; description: string | null }) =>
        api.post('/rooms', data),
    get: (id: number) => api.get(`/rooms/${id}`),
    getFiles: (id: number) => api.get(`/rooms/${id}/files`),
    getChat: (id: number) => api.get(`/rooms/${id}/chat`),
    addMember: (id: number, data: { username: string; role: string }) =>
        api.post(`/rooms/${id}/members`, data),
    removeMember: (roomId: number, userId: number) =>
        api.delete(`/rooms/${roomId}/members/${userId}`),
    uploadFile: (id: number, formData: FormData) =>
        api.post(`/rooms/${id}/files/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    decryptFile: (roomId: number, fileId: number, passphrase?: string) =>
        api.post(`/rooms/${roomId}/files/${fileId}/decrypt`, { passphrase }, { responseType: 'blob' }),
    deleteFile: (roomId: number, fileId: number) =>
        api.delete(`/rooms/${roomId}/files/${fileId}`),
};

export default api;

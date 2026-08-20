import axios from 'axios';

// 🌐 Deteksi Hostname & Port Backend Secara Otomatis
const currentHost = window.location.hostname;
const isLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';

// Jika local pakai 8080, jika server/IP lain (misal 192.168.22.25) pakai 9090
const backendPort = isLocal ? '8080' : '9090';

// Jika di server ada domain/reverse proxy khusus, fallback tetap aman
const backendBaseURL = `http://${currentHost}:${backendPort}/api`;

const api = axios.create({
    baseURL: backendBaseURL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 🔍 REQUEST INTERCEPTOR - Injeksi Token Otomatis & Debug Log
api.interceptors.request.use(
    (config) => {
        // Ambil token dari localStorage atau sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log("%c📤 REQUEST DETAIL:", "color: #FF6B6B; font-weight: bold;");
        console.log("BaseURL:", config.baseURL);
        console.log("URL:", config.url);
        console.log("Method:", config.method);
        console.log("Headers:", config.headers);
        console.log("Data yang dikirim:", config.data);
        return config;
    },
    (error) => {
        console.error("❌ Request Error:", error);
        return Promise.reject(error);
    }
);

// 🔍 RESPONSE INTERCEPTOR - Log Response & Auto Redirect jika Sesi Habis (401)
api.interceptors.response.use(
    (response) => {
        console.log("%c📥 RESPONSE DETAIL (SUCCESS):", "color: #51CF66; font-weight: bold;");
        console.log("Status:", response.status);
        console.log("Data:", response.data);
        return response;
    },
    (error) => {
        console.error("%c❌ RESPONSE DETAIL (ERROR):", "color: #FF6B6B; font-weight: bold;");
        console.log("Status:", error.response?.status);
        console.log("Error Message:", error.response?.data?.message);
        console.log("Full Error Response:", error.response?.data);
        console.log("Error Config:", error.config);

        // 🔒 Auto-Redirect ke login jika token expired atau unauthorized (401)
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');

            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
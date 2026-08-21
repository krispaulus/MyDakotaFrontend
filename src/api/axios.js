import axios from 'axios';

const currentHost = window.location.hostname;
const isLocal = currentHost === 'localhost' || currentHost === '127.0.0.1';
const backendPort = isLocal ? '8080' : '9090';
const backendBaseURL = `http://${currentHost}:${backendPort}/api`;

const api = axios.create({
    baseURL: backendBaseURL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
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
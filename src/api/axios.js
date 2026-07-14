import axios from 'axios';

const currentHost = window.location.hostname;
const backendPort = "8080";

const api = axios.create({
    baseURL: `http://${currentHost}:${backendPort}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});



// 🔍 REQUEST INTERCEPTOR - Log semua request yang dikirim
api.interceptors.request.use(
    (config) => {
        console.log("%c📤 REQUEST DETAIL:", "color: #FF6B6B; font-weight: bold;");
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

// 🔍 RESPONSE INTERCEPTOR - Log semua response dari backend
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
        return Promise.reject(error);
    }
);

export default api;
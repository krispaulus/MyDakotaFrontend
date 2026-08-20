import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    // Cek apakah token login tersimpan di localStorage / sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // Jika TIDAK ADA token, langsung lempar / redirect ke halaman Login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Jika ADA token, izinkan masuk ke halaman yang dituju
    return <Outlet />;
};

export default ProtectedRoute;
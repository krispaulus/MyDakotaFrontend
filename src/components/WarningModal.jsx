import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './WarningModal.css';

const WarningModal = ({ isOpen, onClose, title = "WARNING", message, countdown = 0 }) => {
  const [timeLeft, setTimeLeft] = useState(countdown);

  useEffect(() => {
    setTimeLeft(countdown);
  }, [countdown]);

  useEffect(() => {
    let timer;
    if (isOpen && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // JIKA BUKAN SESSION EXPIRED, biarkan perilaku normal
  const isSessionExpired = title?.toUpperCase().includes("SESSION EXPIRED") || message?.toLowerCase().includes("sesi anda telah berakhir");

  // Fungsi khusus untuk keluar ke login
  const handleForceLogout = () => {
    // 1. Bersihkan token dari storage
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');

    // 2. Jika ada callback onClose bawaan
    if (onClose) onClose();

    // 3. Redirect keras ke halaman login agar seluruh state aplikasi ter-reset
    window.location.href = '/login';
  };

  if (!isOpen) return null;

  const renderMessage = () => {
    if (!message) return null;
    let finalMessage = message;
    if (timeLeft > 0) {
      finalMessage = finalMessage.replace('{time}', `${timeLeft} detik`);
    } else {
      finalMessage = finalMessage.replace('{time}', `0 detik`);
    }

    return finalMessage.split('\n').map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div className="warning-modal-overlay" style={{ zIndex: 999999 }}>
      <div className="warning-modal-content">
        {/* Tombol silang di pojok kanan atas */}
        <button
          className="warning-modal-close"
          onClick={isSessionExpired ? handleForceLogout : onClose}
        >
          <X size={20} />
        </button>

        <div className="warning-modal-icon-container">
          <div className="warning-modal-icon-background">
            <AlertTriangle size={32} color="red" fill="white" className="warning-modal-icon" />
          </div>
        </div>

        <h2 className="warning-modal-title">{title}</h2>
        <p className="warning-modal-message">
          {renderMessage()}
        </p>

        {/* Tombol Aksi di Bawah */}
        <button
          className="warning-modal-button"
          onClick={isSessionExpired ? handleForceLogout : onClose}
        >
          {isSessionExpired ? "Ke Halaman Login" : "Back"}
        </button>
      </div>
    </div>
  );
};

export default WarningModal;
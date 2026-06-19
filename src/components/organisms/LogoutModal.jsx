import React from 'react';
import { X } from 'lucide-react';
import api from '../../api/axios';


const handleConfirmLogout = async (e, onConfirm) => {
  if (e) e.preventDefault();

  const token = localStorage.getItem("token");

  if (token) {
    try {
      console.log("Mengirim request logout ke backend...");
      await api.post('/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Backend merespon sukses!");
    } catch (err) {
      console.error("Gagal lapor logout ke backend:", err.response || err);
    }
  }

  console.log("Menghapus semua cache dan redirect sekarang...");

  const savedIdleTime = localStorage.getItem('max_idle_time');

  localStorage.removeItem("token");
  localStorage.removeItem("role_akses");
  localStorage.removeItem("active_agen_id");
  localStorage.removeItem("active_agen_name");
  localStorage.removeItem("active_cabang_id");
  localStorage.removeItem("active_user_name");
  localStorage.removeItem("user_name");
  localStorage.removeItem("selected_pt");

  if (savedIdleTime) {
    localStorage.setItem('max_idle_time', savedIdleTime);
    console.log("✅ max_idle_time berhasil dipertahankan:", savedIdleTime);
  }

  //localStorage.clear();
  sessionStorage.clear();
  if (typeof onConfirm === 'function') {
    onConfirm(e);
  }

  window.location.replace("/login");
};

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[500px] bg-white rounded-[30px] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        {/* Header */}
        <div className="h-16 bg-gray-50 flex items-center justify-between px-8 border-b border-neutral-200">
          <span className="text-slate-900 text-xl font-medium font-['Inter']">Logout</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-neutral-200 rounded-full hover:bg-neutral-300 transition-colors"
          >
            <X size={16} className="text-slate-700" />
          </button>
        </div>

        {/* Body  */}
        <div className="p-12 text-center">
          <p className="text-slate-900 text-lg font-normal font-['Inter'] mb-10">
            Are you sure want to logout?
          </p>

          {/* Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={onClose}
              className="w-32 py-2.5 bg-white rounded-md border border-slate-300 text-zinc-900 text-sm font-medium hover:bg-slate-50 transition-all active:scale-95"
            >
              CANCEL
            </button>
            <button
              onClick={(e) => handleConfirmLogout(e, onConfirm)}
              className="w-32 py-2.5 bg-green-600 rounded-md text-white text-sm font-medium hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              YES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
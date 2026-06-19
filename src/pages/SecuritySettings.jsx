import React, { useState, useEffect } from 'react';
import { Shield, Save, Lock, Clock } from 'lucide-react';

const SecuritySettings = () => {
  // Default ke 3 menit jika belum pernah di-set di localStorage
  const [idleTime, setIdleTime] = useState(3);
  const [loadingIdle, setLoadingIdle] = useState(false);
  const [statusModal, setStatusModal] = useState({
    show: false,
    type: 'success',
    message: ''
  });


  // Ambil konfigurasi terakhir saat halaman dimuat 
  useEffect(() => {
    const savedTime = localStorage.getItem('max_idle_time');
    console.log(' [SecuritySettings] Load dari localStorage:', savedTime); // DEBUG LOG

    if (savedTime) {
      const minutes = parseInt(savedTime, 10) / 60 / 1000;
      console.log('✅ [SecuritySettings] Konversi ke menit:', minutes); // DEBUG LOG
      setIdleTime(minutes);
    } else {
      console.log('⚠️ [SecuritySettings] Tidak ada data, pakai default 3 menit'); // DEBUG LOG
    }
  }, []);

  // Fungsi untuk menyimpan durasi idle baru
  const handleSaveIdleTime = (e) => {
    e.preventDefault();
    setLoadingIdle(true);

    setTimeout(() => {
      const milliseconds = idleTime * 60 * 1000;
      // Pastikan disimpan sebagai string eksplisit
      localStorage.setItem('max_idle_time', milliseconds.toString());

      console.log('💾 [SecuritySettings] Save ke localStorage:', milliseconds.toString()); // DEBUG LOG

      window.dispatchEvent(new Event('idle_time_changed'));

      setStatusModal({
        show: true,
        type: 'success',
        message: `Batas waktu idle berhasil diubah\nmenjadi ${idleTime} menit!`,
      });

      setLoadingIdle(false);
    }, 1000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header Halaman */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0 p-0 border-none">Security Settings</h1>
          <p className="text-sm text-gray-500 m-0">Kelola konfigurasi keamanan global sistem di sini.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: Pengaturan Idle Session */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Clock className="text-blue-600" size={18} />
            <h2 className="text-lg font-semibold text-gray-700 m-0 p-0 border-none">Sesi Manajemen (Auto-Logout)</h2>
          </div>

          <form onSubmit={handleSaveIdleTime} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Batas Waktu Tidak Aktif (Menit)</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={idleTime}
                  onChange={(e) => setIdleTime(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-black font-semibold text-center"
                  required
                />
                <span className="flex items-center text-sm text-gray-500 font-medium">Menit</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Jika pengguna sama sekali tidak melakukan aktivitas (menggerakkan mouse, mengetik, scroll) selama durasi di atas, sistem akan mengeluarkan akun secara otomatis demi keamanan data perusahaan.
              </p>
            </div>

            <button
              type="submit"
              disabled={loadingIdle}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:bg-emerald-400 active:scale-95"
            >
              <Save size={18} />
              {loadingIdle ? "Menyimpan..." : "Terapkan Durasi Sesi"}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Panduan Kebijakan Keamanan */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="text-gray-600" size={18} />
            <h3 className="text-base font-semibold text-gray-700 m-0 border-none p-0">Rekomendasi Keamanan</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-3 pl-4 list-disc leading-relaxed">
            <li>Standar durasi aman untuk lingkungan korporasi pengiriman logistik berkisar antara <b>3 hingga 15 menit</b> tidak aktif.</li>
            <li>Menyetel waktu terlalu lama berisiko kebocoran data jika PC ditinggalkan di area publik gudang atau loket cabang.</li>
            <li>Setiap perubahan yang diterapkan di sini akan langsung berdampak pada seluruh sesi pengguna yang sedang aktif saat ini.</li>
          </ul>
        </div>
      </div>

      {/* RENDER MODAL SUKSES BAWAAN KAMU DI SINI BRO */}
      {/* Panggil nama komponen modal sukses aslimu di sini, ganti <StatusModal /> dengan komponenmu */}
      {statusModal.show && (
        <div className="warning-modal-overlay">
          <div className="warning-modal-content">
            <div className="warning-modal-icon-container">
              {/* Lingkaran hijau sukses */}
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-800 mb-2">SUKSES !!</h2>
            <p className="text-sm text-gray-600 text-center mb-6 max-w-xs mx-auto whitespace-pre-line">
              {statusModal.message}
            </p>

            <button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200 active:scale-95"
              onClick={() => setStatusModal({ ...statusModal, show: false })}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
export default SecuritySettings;
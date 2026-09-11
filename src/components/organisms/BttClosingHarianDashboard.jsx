import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import DataTableTemplate from './DataTableTemplate';
import api from '../../api/axios';
import { useDarkMode } from '../../context/DarkModeContext';
import {
  Filter, RefreshCw, Printer, Plus, X,
  Calendar, CheckCircle2, Clock, Building2,
  FileText, ShieldCheck, AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

const BttClosingHarianDashboard = () => {
  const { isDarkMode } = useDarkMode();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [cabangList, setCabangList] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(true);

  // =========================================================================
  // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT SECARA DINAMIS
  // =========================================================================
  function getActiveAgen() {
    const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
    const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
    const sessionCabangNama = localStorage.getItem('active_cabang_nama')
      || localStorage.getItem('cabang_nama')
      || localStorage.getItem('active_agen_nama')
      || '';

    if (sessionCabangNama) {
      return {
        id: activeCabangId || activeAgenId || '',
        nama: sessionCabangNama.toUpperCase()
      };
    }

    const found = cabangList.find(c => {
      const cId = String(c.agen_id || c.AgenID || '').trim().toLowerCase();
      const cKode = String(c.agen_kode || c.AgenKode || '').trim().toLowerCase();
      const cNama = String(c.agen_nama || c.AgenNama || '').trim().toLowerCase();
      const targetAgen = activeAgenId.trim().toLowerCase();
      const targetCabang = activeCabangId.trim().toLowerCase();

      return (
        (targetAgen && (cId === targetAgen || cKode === targetAgen || cNama.includes(targetAgen))) ||
        (targetCabang && (cId === targetCabang || cKode === targetCabang || cNama.includes(targetCabang)))
      );
    });

    if (found) {
      return {
        id: String(found.agen_id || found.AgenID),
        nama: String(found.agen_nama || found.AgenNama).toUpperCase()
      };
    }

    if (activeAgenId && activeAgenId.toUpperCase().includes('PUSAT')) {
      return { id: '001', nama: 'PUSAT DAKOTA' };
    }

    return {
      id: activeCabangId || activeAgenId || '',
      nama: activeAgenId ? `AGEN ${activeAgenId.toUpperCase()}` : ''
    };
  }

  const currentActiveAgen = getActiveAgen();
  const isHoldingUser =
    String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
    String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
    String(currentActiveAgen.id || '') === '001' ||
    String(localStorage.getItem('active_agen_id') || '').toUpperCase().includes('PUSAT') ||
    (!currentActiveAgen.id && !currentActiveAgen.nama);

  // =========================================================================
  // FILTER STATES (PERSIS POLA INVOICE.JSX)
  // =========================================================================
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [bypassTanggal, setBypassTanggal] = useState(false);
  const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
  const [searchNoLaporan, setSearchNoLaporan] = useState('');
  const [searchNoBtt, setSearchNoBtt] = useState('');
  const [searchNoJurnal, setSearchNoJurnal] = useState('');
  const [selectedPostingStatus, setSelectedPostingStatus] = useState('');

  // Modal Tambah Closing Harian State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClosingForm, setNewClosingForm] = useState({
    tanggal_closing: today,
    cabang_agen: isHoldingUser ? '' : currentActiveAgen.id,
    keterangan: ''
  });

  useEffect(() => {
    if (!isHoldingUser && currentActiveAgen.id) {
      setSelectedCabang(currentActiveAgen.id);
      setNewClosingForm(prev => ({ ...prev, cabang_agen: currentActiveAgen.id }));
    }
  }, [isHoldingUser, currentActiveAgen.id, cabangList]);

  // Ambil Master Opsi Cabang
  const fetchCabangOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } });
      setCabangList(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Gagal load opsi agen:", err);
    }
  };

  // Ambil Data List Closing
  const fetchClosingList = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();

      if (!bypassTanggal) {
        queryParams.append('tgl_dari', startDate);
        queryParams.append('tgl_sampai', endDate);
      }
      if (selectedCabang && selectedCabang !== 'ALL') {
        queryParams.append('agen_id', selectedCabang);
      }
      if (searchNoLaporan.trim()) queryParams.append('no_laporan', searchNoLaporan.trim());
      if (searchNoBtt.trim()) queryParams.append('no_btt', searchNoBtt.trim());
      if (searchNoJurnal.trim()) queryParams.append('no_jurnal', searchNoJurnal.trim());
      if (selectedPostingStatus) queryParams.append('posting_status', selectedPostingStatus);

      const res = await api.get(`/closing-agen/list?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const rows = res.data?.data || res.data || [];
      setData(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Gagal load log closing:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCabangOptions();
    fetchClosingList();
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchClosingList();
  };

  const handleResetFilter = () => {
    setStartDate(firstDay);
    setEndDate(today);
    setBypassTanggal(false);
    setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
    setSearchNoLaporan('');
    setSearchNoBtt('');
    setSearchNoJurnal('');
    setSelectedPostingStatus('');
    fetchClosingList();
  };

  // Eksekusi Submit Closing Harian Baru
  const handleSaveNewClosing = async (e) => {
    e.preventDefault();
    const loggedInUser = localStorage.getItem('active_user_name') || 'LOKET_ADMIN';

    if (!newClosingForm.tanggal_closing || !newClosingForm.cabang_agen) {
      Swal.fire('Peringatan', 'Tanggal dan Cabang Agen wajib dipilih!', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/closing-agen/process', {
        tanggal_closing: newClosingForm.tanggal_closing,
        cabang_agen: newClosingForm.cabang_agen,
        keterangan: newClosingForm.keterangan,
        update_id: loggedInUser
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.status === 'success' || res.status === 200) {
        setIsAddModalOpen(false);
        Swal.fire({
          title: 'BERHASIL!',
          text: res.data?.message || 'Closing harian kas agen berhasil diproses.',
          icon: 'success'
        });
        fetchClosingList();
      }
    } catch (err) {
      Swal.fire('PROSES CLOSING GAGAL!', err.response?.data?.error || err.response?.data?.message || 'Gagal menyimpan closing', 'error');
    }
  };

  // Kolom DataTableTemplate
  const columns = [
    {
      header: 'NO. LAPORAN',
      accessor: 'no_laporan',
      render: (item) => (
        <span className="font-mono font-bold text-sky-600 select-all">
          {item.no_laporan || '-'}
        </span>
      )
    },
    {
      header: 'TANGGAL',
      accessor: 'tanggal',
      render: (item) => (
        <span className="font-mono text-slate-600 dark:text-slate-300">
          {item.tanggal ? String(item.tanggal).substring(0, 10) : '-'}
        </span>
      )
    },
    {
      header: 'CABANG / COUNTER / AGEN',
      accessor: 'cabang',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Building2 size={13} className="text-slate-400" />
          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
            {item.cabang || item.agen_nama || 'GORONTALO AGEN'}
          </span>
        </div>
      )
    },
    {
      header: 'PEMBAYARAN OMSET (RP)',
      accessor: 'pembayaran',
      render: (item) => (
        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
          Rp {Math.round(item.pembayaran || 0).toLocaleString('id-ID')}
        </span>
      )
    },
    {
      header: 'NO. KAS MASUK / KELUAR',
      accessor: 'no_kas',
      render: (item) => (
        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
          {item.no_kas || '-'}
        </span>
      )
    },
    {
      header: 'STATUS POSTING',
      accessor: 'posting',
      render: (item) => item.posting === 'Y' ? (
        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
          <CheckCircle2 size={12} /> POSTED
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
          <Clock size={12} /> OPEN
        </span>
      )
    },
    {
      header: 'NO. JURNAL GL',
      accessor: 'no_jurnal',
      render: (item) => (
        <span className="font-mono text-slate-500 select-all">
          {item.no_jurnal || '-'}
        </span>
      )
    },
    {
      header: 'AKTIF',
      accessor: 'aktif',
      render: (item) => (
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px] rounded-full">
          {item.aktif || 'Y'}
        </span>
      )
    }
  ];

  // ==========================================
  // MODAL TAMBAH CLOSING HARIAN
  // ==========================================
  const addModalElement = isAddModalOpen ? (
    <div
      role="dialog" aria-modal="true"
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity"
      style={{ zIndex: 1000 }}
    >
      <div className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
        <div className="px-6 py-3.5 bg-blue-600 text-white flex items-center justify-between">
          <div className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
            <Plus size={18} />
            TAMBAH CLOSING HARIAN KAS LOKET
          </div>
          <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSaveNewClosing} className="p-6 space-y-4 text-xs">
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              <strong className="font-bold">MOHON DIPERHATIKAN:</strong><br />
              Proses ini akan merekap dan mengunci seluruh manifest keuangan resi BTT kas pada tanggal terkait agar siap dibukukan ke akuntansi kas masuk cabang!
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-600 block mb-1">TANGGAL CLOSING :</label>
            <input
              type="date"
              value={newClosingForm.tanggal_closing}
              onChange={(e) => setNewClosingForm({ ...newClosingForm, tanggal_closing: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-600 block mb-1">CABANG / AGEN LOKET :</label>
            <select
              value={newClosingForm.cabang_agen}
              disabled={!isHoldingUser}
              onChange={(e) => setNewClosingForm({ ...newClosingForm, cabang_agen: e.target.value })}
              className={`w-full p-2.5 border rounded-lg font-bold outline-none ${!isHoldingUser
                  ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
                  : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500 cursor-pointer'
                }`}
              required
            >
              <option value="">-- PILIH CABANG / AGEN --</option>
              {!isHoldingUser ? (
                <option value={currentActiveAgen.id}>{currentActiveAgen.nama}</option>
              ) : (
                cabangList.map((c, idx) => (
                  <option key={idx} value={c.agen_id || c.AgenID}>
                    {c.agen_nama ? c.agen_nama.toUpperCase() : (c.agen_id || c.AgenID)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-600 block mb-1">CATATAN / KETERANGAN :</label>
            <input
              type="text"
              placeholder="Catatan penutupan kas harian (opsional)..."
              value={newClosingForm.keterangan}
              onChange={(e) => setNewClosingForm({ ...newClosingForm, keterangan: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl uppercase transition cursor-pointer"
            >
              BATAL
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-md"
            >
              PROSES CLOSING SEKARANG
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  return (
    <div className="space-y-5">
      <style>
        {`
                @media print {
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                `}
      </style>

      {/* PANEL FILTER SAMA DENGAN INVOICE.JSX */}
      {showFilter && (
        <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
          <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
            <Filter size={16} className="text-sky-600" />
            FILTER CLOSING HARIAN KAS LOKET BTT
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                <input
                  type="date"
                  disabled={bypassTanggal}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                    }`}
                />
              </div>
              <div className="flex-1">
                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                <input
                  type="date"
                  disabled={bypassTanggal}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                    }`}
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN</label>
              <select
                value={selectedCabang}
                disabled={!isHoldingUser}
                onChange={(e) => setSelectedCabang(e.target.value)}
                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                  }`}
                title={!isHoldingUser ? "Filter cabang terkunci sesuai lokasi login Anda" : "Pilih cabang untuk monitoring"}
              >
                {isHoldingUser && (
                  <option value="">-- SEMUA CABANG (ALL TENANT) --</option>
                )}
                {!isHoldingUser ? (
                  <option value={currentActiveAgen.id}>{currentActiveAgen.nama}</option>
                ) : (
                  cabangList.map((c, i) => (
                    <option key={i} value={c.agen_id || c.AgenID}>
                      {c.agen_nama || c.AgenNama}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">NO. LAPORAN</label>
              <input
                type="text"
                placeholder="Nomor laporan closing..."
                value={searchNoLaporan}
                onChange={(e) => setSearchNoLaporan(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">STATUS POSTING GL</label>
              <select
                value={selectedPostingStatus}
                onChange={(e) => setSelectedPostingStatus(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              >
                <option value="">-- SEMUA STATUS POSTING --</option>
                <option value="Y">Sudah Posting (Posted)</option>
                <option value="N">Belum Posting (Open)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">NO. BTT (RESI)</label>
              <input
                type="text"
                placeholder="Nomor resi BTT..."
                value={searchNoBtt}
                onChange={(e) => setSearchNoBtt(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">NO. JURNAL GL</label>
              <input
                type="text"
                placeholder="Nomor jurnal GL..."
                value={searchNoJurnal}
                onChange={(e) => setSearchNoJurnal(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-5">
                <input
                  type="checkbox"
                  checked={bypassTanggal}
                  onChange={(e) => setBypassTanggal(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                Bypass Filter Tanggal
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer"
            >
              <Printer size={14} /> Cetak Grid
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
            >
              RESET
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> REFRESH DATA
            </button>
          </div>
        </form>
      )}

      {/* TABEL DATA UTAMA */}
      <DataTableTemplate
        title="CLOSING HARIAN AGEN"
        columns={columns}
        data={data}
        loading={loading}
        isDarkMode={isDarkMode}
        isAddDisabled={false}
        hideAddButton={false}
        onFilter={() => setShowFilter(prev => !prev)}
        onAdd={() => {
          const currentAgen = getActiveAgen();
          setNewClosingForm({
            tanggal_closing: today,
            cabang_agen: currentAgen.id,
            keterangan: ''
          });
          setIsAddModalOpen(true);
        }}
        onEdit={() => { }}
        onDelete={() => { }}
      />

      {addModalElement && ReactDOM.createPortal(addModalElement, modalRoot)}
    </div>
  );
};

export default BttClosingHarianDashboard;
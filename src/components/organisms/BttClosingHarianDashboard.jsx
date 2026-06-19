import React, { useState, useEffect } from 'react';
import { RefreshCw, PlusCircle, AlertCircle, LogOut, Search, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

const BttClosingHarianDashboard = () => {
  const [listClosing, setListClosing] = useState([]);
  const [listAgenActive, setListAgenActive] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🌍 1. State Filter Saringan Utama Sesuai Aturan Akuntansi
  const [filter, setFilter] = useState({
    tgl_dari: new Date().toISOString().split('T')[0],
    tgl_sampai: new Date().toISOString().split('T')[0],
    agen_id: 'ALL',
    no_btt: '',
    no_laporan: '',
    no_jurnal: '',
    posting_status: '' 
  });

  const [activeFilters, setActiveFilters] = useState({
    tanggal: true,
    agen: true,
    no_btt: false,
    no_laporan: false,
    no_jurnal: false
  });

  const fetchDaftarClosingLog = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (activeFilters.tanggal) {
        queryParams.append('tgl_dari', filter.tgl_dari);
        queryParams.append('tgl_sampai', filter.tgl_sampai);
      }
      if (activeFilters.agen && filter.agen_id !== 'ALL') {
        queryParams.append('agen_id', filter.agen_id);
      }
      if (activeFilters.no_btt && filter.no_btt) queryParams.append('no_btt', filter.no_btt);
      if (activeFilters.no_laporan && filter.no_laporan) queryParams.append('no_laporan', filter.no_laporan);
      if (activeFilters.no_jurnal && filter.no_jurnal) queryParams.append('no_jurnal', filter.no_jurnal);
      if (filter.posting_status) queryParams.append('posting_status', filter.posting_status);

      const response = await axios.get(`http://localhost:8080/api/closing-agen/list?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListClosing(response.data || []);
    } catch (err) {
      console.error(err);
      setListClosing([]);
    } finally {
      setLoading(false);
    }
  };

  // 🌍 2. FIX LOGIC DROPDOWN RESOLVER: Ambil Array secara aman walau dibungkus object
  const fetchDropdownMasterAgen = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/agens', { 
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 🚀 PROTEKSI SAKRAL: Cek jika data mentah berupa array, atau berada di dalam key child object
      if (Array.isArray(response.data)) {
        setListAgenActive(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setListAgenActive(response.data.data);
      } else {
        setListAgenActive([]); // Fallback array kosong jika struktur rusak agar tidak crash blanket!
      }
    } catch (err) {
      console.warn(err);
      setListAgenActive([]);
    }
  };

  useEffect(() => {
    fetchDropdownMasterAgen();
    fetchDaftarClosingLog();
  }, [activeFilters, filter.posting_status]);

  const handleFilterToggle = (key) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  const handleOpenModalProsesClosing = () => {
    const hariIniStr = new Date().toISOString().split('T')[0];
    const loggedInUser = localStorage.getItem('active_user_name') || 'LOKET_ADMIN';
    
    // Pastikan listAgenActive aman berbentuk array saat di-render ke SweetAlert modal
    const safeAgenList = Array.isArray(listAgenActive) ? listAgenActive : [];
    const optionsAgenHTML = safeAgenList.map(agen => 
      `<option value="${agen.agen_id}">${agen.agen_nama ? agen.agen_nama.toUpperCase() : agen.agen_id}</option>`
    ).join('');

    Swal.fire({
      title: 'TAMBAH CLOSING HARIAN AGEN',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; text-align: left; font-size: 13px; padding: 5px;">
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
            <p style="color: #991b1b; font-weight: 800; margin: 0; line-height: 1.4;">
              ⚠️ MOHON DIPERHATIKAN:<br/>
              Proses ini akan mengunci seluruh status manifest keuangan resi BTT (Naik & Turun) pada tanggal terkait agar siap diproses ke Surat Pengantar (SP) Pengiriman!
            </p>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="font-weight: 800; color: #4b5563;">TANGGAL CLOSING :</label>
            <input id="swal_tgl_closing" type="date" value="${hariIniStr}" style="width: 100%; margin-top: 5px; padding: 10px; border: 2px solid #cbd5e1; border-radius: 10px; font-weight: 900; color: #4f46e5; background-color: #f5f3ff; outline: none;" />
          </div>
          <div>
            <label style="font-weight: 800; color: #4b5563;">CABANG / AGEN LOKET :</label>
            <select id="swal_cabang_agen" style="width: 100%; margin-top: 5px; padding: 10px; border: 2px solid #cbd5e1; border-radius: 10px; font-weight: 700; background-color: white; outline: none;">
              <option value="839">GORONTALO AGEN</option>
              ${optionsAgenHTML}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '⚡ PROSES SEKARANG',
      cancelButtonText: 'KELUAR',
      confirmButtonColor: '#eab308', 
      cancelButtonColor: '#ef4444',  
      customClass: { container: 'z-[999999]' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const tglClosingInput = document.getElementById('swal_tgl_closing').value;
        const cabangAgenInput = document.getElementById('swal_cabang_agen').value;

        if (!tglClosingInput || !cabangAgenInput) {
          Swal.fire('Validasi Gagal', 'Kolom parameter tidak boleh kosong!', 'warning');
          return;
        }

        try {
          const token = localStorage.getItem('token');
          const response = await axios.post('http://localhost:8080/api/closing-agen/process', {
            tanggal_closing: tglClosingInput,
            cabang_agen: cabangAgenInput,
            update_id: loggedInUser
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data && response.data.status === "success") {
            Swal.fire({
              title: 'CLOSING SUKSES DISIMPAN!',
              icon: 'success',
              confirmButtonColor: '#4f46e5'
            });
            fetchDaftarClosingLog(); 
          }
        } catch (error) {
          Swal.fire('PROSES CLOSING GAGAL!', error.response?.data?.error || 'Gagal', 'error');
        }
      }
    });
  };

  return (
    <div className="w-full p-6 min-h-screen text-xs bg-slate-50 text-slate-800 font-sans">
      
      {/* 💳 BANNER HEADER UTAMA */}
      <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-center font-black text-sm tracking-widest p-3.5 rounded-2xl uppercase shadow-md mb-6 border border-blue-600/30">
        📊 MODUL UTAMA CLOSING HARIAN AGEN
      </div>

      {/* 🔍 FILTER CONTROL BLOCK CENTER */}
      <div className="p-6 rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-100/60 space-y-5 text-left font-bold">
        
        {/* BARIS GRID 1 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
              <input type="checkbox" checked={activeFilters.tanggal} onChange={() => handleFilterToggle('tanggal')} className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer" />
              <span>TANGGAL :</span>
            </label>
            <input type="date" name="tgl_dari" value={filter.tgl_dari} onChange={handleInputChange} disabled={!activeFilters.tanggal} className="w-full mt-1.5 p-3 border-2 border-slate-200 bg-white font-bold rounded-xl text-indigo-600 disabled:bg-gray-100 disabled:text-gray-400 outline-none" />
          </div>
          <div className="md:col-span-3">
            <label className="text-gray-400 font-medium select-none uppercase">SAMPAI :</label>
            <input type="date" name="tgl_sampai" value={filter.tgl_sampai} onChange={handleInputChange} disabled={!activeFilters.tanggal} className="w-full mt-1.5 p-3 border-2 border-slate-200 bg-white font-bold rounded-xl text-indigo-600 disabled:bg-gray-100 disabled:text-gray-400 outline-none" />
          </div>
          <div className="md:col-span-6">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
              <input type="checkbox" checked={activeFilters.agen} onChange={() => handleFilterToggle('agen')} className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer" />
              <span>AGEN / CABANG LOKET :</span>
            </label>
            <select name="agen_id" value={filter.agen_id} onChange={handleInputChange} disabled={!activeFilters.agen} className="w-full mt-1.5 p-3 border-2 border-slate-200 bg-white rounded-xl font-bold text-slate-800 disabled:bg-gray-100 cursor-pointer outline-none">
              <option value="ALL">-- SEMUA DAFTAR CABANG (ALL TENANT) --</option>
              <option value="839">GORONTALO AGEN</option>
              {Array.isArray(listAgenActive) && listAgenActive.map((agen, i) => (
                <option key={i} value={agen.agen_id}>{agen.agen_nama ? agen.agen_nama.toUpperCase() : agen.agen_id}</option>
              ))}
            </select>
          </div>
        </div>

        {/* BARIS GRID 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="flex flex-col relative">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
              <input type="checkbox" checked={activeFilters.no_btt} onChange={() => handleFilterToggle('no_btt')} className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer" />
              <span>NO. BTT (RESI) :</span>
            </label>
            <input type="text" name="no_btt" value={filter.no_btt} onChange={handleInputChange} disabled={!activeFilters.no_btt} placeholder="Masukkan No. BTT" className="w-full mt-1.5 p-3 border-2 border-slate-200 bg-white rounded-xl uppercase font-mono font-bold placeholder:text-gray-300 disabled:bg-gray-100 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
              <input type="checkbox" checked={activeFilters.no_laporan} onChange={() => handleFilterToggle('no_laporan')} className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer" />
              <span>NO. LAPORAN CLOSING :</span>
            </label>
            <input type="text" name="no_laporan" value={filter.no_laporan} onChange={handleInputChange} disabled={!activeFilters.no_laporan} placeholder="Masukkan No Laporan" className="w-full mt-1.5 p-3 border-2 border-slate-200 bg-white rounded-xl uppercase font-mono font-bold placeholder:text-gray-300 disabled:bg-gray-100 outline-none" />
          </div>
          <div className="flex flex-col">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
              <input type="checkbox" checked={activeFilters.no_jurnal} onChange={() => handleFilterToggle('no_jurnal')} className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer" />
              <span>NO. JURNAL GL :</span>
            </label>
            <input type="text" name="no_jurnal" value={filter.no_jurnal} onChange={handleInputChange} disabled={!activeFilters.no_jurnal} placeholder="Masukkan No Jurnal" className="w-full mt-1.5 p-3 border-2 border-slate-200 bg-white rounded-xl uppercase font-mono font-bold placeholder:text-gray-300 disabled:bg-gray-100 outline-none" />
          </div>
        </div>

        {/* BARIS GRID 3 */}
        <div className="p-3 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
          <span className="text-indigo-600 block mb-2 uppercase tracking-wide">Status Filter Akuntansi General Ledger:</span>
          <div className="flex items-center gap-8 font-black text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="posting_status" value="" checked={filter.posting_status === ''} onChange={handleInputChange} className="w-4 h-4 text-indigo-600 focus:ring-0" />
              <span className="group-hover:text-indigo-600 transition-colors">TAMPILKAN SEMUA (ALL)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="posting_status" value="Y" checked={filter.posting_status === 'Y'} onChange={handleInputChange} className="w-4 h-4 text-indigo-600 focus:ring-0" />
              <span className="group-hover:text-indigo-600 transition-colors">SUDAH POSTING (POSTED)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="posting_status" value="N" checked={filter.posting_status === 'N'} onChange={handleInputChange} className="w-4 h-4 text-indigo-600 focus:ring-0" />
              <span className="group-hover:text-indigo-600 transition-colors">BELUM POSTING (OPEN)</span>
            </label>
          </div>
        </div>

        {/* INTERFACES BUTTON ACTIONS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dashed border-slate-200">
          <div className="flex flex-wrap gap-2.5">
            <button onClick={fetchDaftarClosingLog} disabled={loading} className="h-11 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl flex items-center justify-center gap-2 font-black shadow-md shadow-blue-100 uppercase tracking-wider transition-all transform active:scale-95">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button onClick={handleOpenModalProsesClosing} className="h-11 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-2 font-black shadow-md shadow-red-100 uppercase tracking-wider transition-all transform active:scale-95">
              <PlusCircle size={14} />
              <span>Tambah Closing</span>
            </button>
            <button onClick={() => Swal.fire('Audit Loket', 'Semua resi kas harian terpantau lunas terbayar se-Indonesia, Master!', 'info')} className="h-11 px-5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl flex items-center justify-center gap-2 font-black shadow-md shadow-amber-100 uppercase tracking-wider transition-all transform active:scale-95">
              <AlertCircle size={14} />
              <span>Cek BTT Belum Terbayar</span>
            </button>
          </div>
          <button onClick={() => window.history.back()} className="h-11 px-6 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-black rounded-xl shadow transition-all uppercase tracking-wider flex items-center gap-2">
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>

      </div>

      {/* 📊 GRID DATA SHOWCASE VIEW TABLE */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xl shadow-slate-100/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white font-black uppercase text-[10px] tracking-wider border-b border-blue-900/40">
                <th className="p-4 pl-6">NO LAPORAN</th>
                <th className="p-4">TANGGAL</th>
                <th className="p-4">CABANG / COUNTER / AGEN</th>
                <th className="p-4 text-right pr-6">PEMBAYARAN OMSET</th>
                <th className="p-4">NO KAS MASUK / KELUAR</th>
                <th className="p-4 text-center">POSTING</th>
                <th className="p-4">NO JURNAL GL</th>
                <th className="p-4 text-center rounded-r-3xl">AKTIF</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-700 divide-y divide-slate-100">
              {listClosing.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 font-medium bg-white">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={28} className="text-slate-300" />
                      <span>Belum ada log data closing harian agen yang terdeteksi, silakan klik tombol Tambah Closing!</span>
                    </div>
                  </td>
                </tr>
              ) : (
                listClosing.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors bg-white">
                    <td className="p-4 pl-6 text-indigo-600 font-mono tracking-tight text-sm select-all">
                      {row.no_laporan}
                    </td>
                    <td className="p-4 font-mono text-slate-500">
                      {row.tanggal ? row.tanggal.substring(0, 10) : '-'}
                    </td>
                    <td className="p-4 uppercase text-slate-900">
                      🏢 {row.cabang || "GORONTALO AGEN"}
                    </td>
                    <td className="p-4 text-right pr-6 text-emerald-600 font-black text-sm">
                      Rp {Math.round(row.pembayaran || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {row.no_kas || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wide ${
                        row.posting === 'Y' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {row.posting === 'Y' ? 'POSTED' : 'OPEN'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-500 select-all">
                      {row.no_jurnal || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full border border-blue-200">
                        {row.aktif || 'Y'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default BttClosingHarianDashboard;
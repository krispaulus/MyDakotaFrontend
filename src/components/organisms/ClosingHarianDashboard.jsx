import React, { useState, useEffect } from 'react';
import { RefreshCw, PlusCircle, CheckSquare, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

const BttClosingHarianDashboard = () => {
  const [listClosing, setListClosing] = useState([]);
  const [loading, setLoading] = useState(false);

  // States penampung data filter pencarian harian (Gambar 1)
  const [filter, setFilter] = useState({
    tgl_dari: new Date().toISOString().split('T')[0],
    tgl_sampai: new Date().toISOString().split('T')[0],
    agen_id: 'GORONTALO AGEN',
    no_btt: '',
    no_laporan: '',
    no_jurnal: ''
  });

  const fetchDaftarClosing = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(filter).toString();
      const res = await axios.get(`http://localhost:8080/api/closing-agen/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListClosing(res.data || []);
    } catch (err) {
      console.error("Gagal memuat data log closing harian:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaftarClosing();
  }, []);

  const handleInputChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  // 🚀 ACTION TRIGGER TOMBOL TAMBAH CLOSING: Menampilkan Pop-Up Interaktif Gambar 2
  const handleOpenModalTambahClosing = () => {
    const hariIniStr = new Date().toISOString().split('T')[0];

    Swal.fire({
      title: '🟢 TAMBAH CLOSING HARIAN AGEN',
      html: `
        <div style="font-family: sans-serif; text-align: left; font-size: 13px; padding: 10px;" class="space-y-4">
          <div style="margin-bottom: 12px;">
            <label style="font-weight: 900; color: #374151;">TANGGAL CLOSING :</label>
            <input id="modal_tgl_closing" type="date" value="${hariIniStr}" style="width: 100%; margin-top: 6px; padding: 10px; border: 2px solid #d1d5db; border-radius: 8px; font-weight: bold; color: #4338ca; background-color: #f5f3ff;" />
          </div>
          <div>
            <label style="font-weight: 900; color: #374151;">CABANG / AGEN :</label>
            <select id="modal_cabang_agen" style="width: 100%; margin-top: 6px; padding: 10px; border: 2px solid #d1d5db; border-radius: 8px; font-weight: bold; background-color: white;">
              <option value="839">GORONTALO AGEN</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '⚡ PROSES CLOSING',
      cancelButtonText: 'KELUAR',
      confirmButtonColor: '#eab308', // Kuning Premium (Gambar 2)
      cancelButtonColor: '#ef4444',  // Merah (Gambar 2)
      customClass: { container: 'z-[999999]' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const tglClosingVal = document.getElementById('modal_tgl_closing').value;
        const cabangAgenVal = document.getElementById('modal_cabang_agen').value;

        try {
          const token = localStorage.getItem('token');
          const response = await axios.post('http://localhost:8080/api/closing-agen/process', {
            tanggal_closing: tglClosingVal,
            cabang_agen: cabangAgenVal
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data && response.data.status === "success") {
            Swal.fire({
              title: 'CLOSING HARIAN BERHASIL!',
              html: `
                <div style="font-size: 13px; font-family: sans-serif;">
                  <p>Manifest resi BTT loket resmi dikunci dengan nomor laporan:</p>
                  <h3 style="color: #2563eb; font-weight: 900; margin: 8px 0; font-family: monospace; font-size: 16px;">${response.data.no_laporan}</h3>
                  <p>Total Rekapitulasi Pembayaran: <b style="color: #059669; font-size: 15px;">Rp ${response.data.total_omset.toLocaleString('id-ID')}</b></p>
                  <p style="color: #6b7280; font-size: 11px; margin-top: 5px;">📦 Semua manifest resi hari ini otomatis dilepas dan siap dinaikkan ke Surat Pengantar (SP)!</p>
                </div>
              `,
              icon: 'success'
            });
            fetchDaftarClosing(); // Segarkan isi data tabel
          }
        } catch (error) {
          Swal.fire('PROSES CLOSING GAGAL', error.response?.data?.error || 'Gagal eksekusi query closing harian keuangan pusat!', 'error');
        }
      }
    });
  };

  return (
    <div className="w-full p-6 bg-gray-50 min-h-screen text-slate-800 font-sans">
      {/* HEADER BANNER */}
      <div className="w-full bg-slate-800 text-white text-center font-black text-lg tracking-widest p-2.5 rounded-xl uppercase shadow-sm mb-6">
        CLOSING HARIAN AGEN
      </div>

      {/* BLOCK PANEL FILTRATION SEARCH ENGINE (GAMBAR 1) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs font-bold text-left mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="flex items-center gap-1 text-slate-700"><input type="checkbox" defaultChecked /> TANGGAL :</label>
            <input type="date" name="tgl_dari" value={filter.tgl_dari} onChange={handleInputChange} className="w-full mt-1 p-2 border-2 border-gray-200 rounded-xl" />
          </div>
          <div>
            <label className="block text-gray-400">SAMPAI :</label>
            <input type="date" name="tgl_sampai" value={filter.tgl_sampai} onChange={handleInputChange} className="w-full mt-1 p-2 border-2 border-gray-200 rounded-xl" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-slate-500"><input type="checkbox" /> NO. BTT :</label>
            <input type="text" name="no_btt" value={filter.no_btt} onChange={handleInputChange} placeholder="No BTT" className="w-full mt-1 p-2 border-2 border-gray-200 rounded-xl font-mono" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-slate-500"><input type="checkbox" /> NO. LAPORAN :</label>
            <input type="text" name="no_laporan" value={filter.no_laporan} onChange={handleInputChange} placeholder="No Laporan" className="w-full mt-1 p-2 border-2 border-gray-200 rounded-xl font-mono" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-slate-500"><input type="checkbox" /> NO. JURNAL :</label>
            <input type="text" name="no_jurnal" value={filter.no_jurnal} onChange={handleInputChange} placeholder="No jurnal" className="w-full mt-1 p-2 border-2 border-gray-200 rounded-xl font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center gap-1 text-slate-500"><input type="checkbox" /> AGEN/CABANG :</label>
            <select name="agen_id" value={filter.agen_id} onChange={handleInputChange} className="w-full mt-1 p-2 border-2 border-gray-200 rounded-xl bg-white">
              <option value="GORONTALO AGEN">GORONTALO AGEN</option>
            </select>
          </div>
        </div>

        {/* CONTROLLER BUTTONS INTERFACE BAR (GAMBAR 1) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-dashed border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button onClick={fetchDaftarClosing} className="h-10 px-4 bg-blue-600 text-white rounded-lg flex items-center gap-1 hover:bg-blue-700 shadow transition-colors"><RefreshCw size={13}/> REFRESH</button>
            <button onClick={handleOpenModalTambahClosing} className="h-10 px-4 bg-red-600 text-white rounded-lg flex items-center gap-1 hover:bg-red-700 shadow transition-colors"><PlusCircle size={13}/> TAMBAH</button>
            <button className="h-10 px-4 bg-amber-500 text-slate-900 rounded-lg flex items-center gap-1 hover:bg-amber-600 shadow transition-colors"><CheckSquare size={13}/> CEK BTT BELUM TERBAYAR</button>
          </div>
          <button className="h-10 px-5 bg-white border-2 border-red-500 text-red-600 rounded-lg flex items-center gap-1 hover:bg-red-50 shadow font-bold transition-all">KELUAR</button>
        </div>
      </div>

      {/* GRID DATA SHOWCASE (SINKRON DATA OUTPUT TABLE GAMBAR 1) */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-black uppercase text-[10px] tracking-wider border-b border-gray-300">
              <th className="p-3.5">NO LAPORAN</th>
              <th className="p-3.5">TANGGAL</th>
              <th className="p-3.5">CABANG/COUNTER/AGEN</th>
              <th className="p-3.5 text-right">PEMBAYARAN</th>
              <th className="p-3.5">NO KAS MASUK/KELUAR</th>
              <th className="p-3.5 text-center">POSTING</th>
              <th className="p-3.5">NO JURNAL</th>
              <th className="p-3.5 text-center">AKTIF</th>
            </tr>
          </thead>
          <tbody className="font-bold text-slate-700 divide-y divide-gray-100">
            {listClosing.length === 0 ? (
              <tr><td colSpan="8" className="p-8 text-center text-gray-400 font-medium">Belum ada log laporan closing agen hari ini. Silakan klik Tambah / Refresh untuk memproses manifest loket!</td></tr>
            ) : (
              listClosing.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 text-indigo-600 font-mono tracking-tight">{row.no_laporan}</td>
                  <td className="p-3.5 font-mono text-slate-500">{row.tanggal ? row.tanggal.substring(0, 10) : '-'}</td>
                  <td className="p-3.5 uppercase text-slate-900">GORONTALO AGEN</td>
                  <td className="p-3.5 text-right text-emerald-600 font-black">Rp {Math.round(row.pembayaran || 0).toLocaleString('id-ID')}</td>
                  <td className="p-3.5 font-mono text-slate-600">{row.no_kas || '-'}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${row.posting === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {row.posting === 'Y' ? 'POSTED' : 'OPEN'}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-500">{row.no_jurnal || '-'}</td>
                  <td className="p-3.5 text-center"><span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full">Y</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BttClosingHarianDashboard;
import React, { useState, useEffect } from 'react';
import { RefreshCw, PlusCircle, Printer, FileText, LogOut, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

const BttSuratPengantarDashboard = () => {
  const [listSP, setListSP] = useState([]);
  const [loading, setLoading] = useState(false);

  // States saringan filter pencarian (Gambar 1)
  const [filter, setFilter] = useState({
    tgl_dari: new Date().toISOString().split('T')[0],
    tgl_sampai: new Date().toISOString().split('T')[0],
    agen_id: 'PUSAT DAKOTA',
    tujuan: '',
    no_sp: '',
    no_btt: '',
    no_loading: '',
    transit: '',
    no_mobil: '',
    no_surat_tugas: ''
  });

  const fetchDaftarSP = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(filter).toString();
      const res = await api.get(`/sp/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListSP(res.data || []);
    } catch (err) {
      console.error("Gagal load Surat Pengantar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaftarSP();
  }, []);

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value });
  };

  // Pemicu Aksi Tombol 1: Tambah SP dari proses loading (Gambar 2)
  const handleAddSpFromLoading = () => {
    Swal.fire({
      title: 'PROSES SURAT PENGANTAR',
      html: `
        <div class="p-2 font-sans text-left text-xs">
          <label class="font-bold text-slate-700 block mb-1">MASUKKAN NOMOR LOADING BARANG :</label>
          <input id="swal_no_loading" type="text" class="w-full p-3 border border-gray-300 rounded-xl font-bold font-mono uppercase" placeholder="Masukkan No Loading Barang...">
          <span class="text-[10px] text-gray-400 mt-1 block italic">Ketikkan nomor loading atau gunakan barcode scanner</span>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'PROSES',
      cancelButtonText: 'BATAL',
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#ef4444',
      customClass: { container: 'z-[99999]' }
    }).then((result) => {
      if (result.isConfirmed) {
        const noLoading = document.getElementById('swal_no_loading').value;
        if (!noLoading) return Swal.fire('Peringatan', 'Nomor loading wajib diisi, bro!', 'warning');
        Swal.fire('Sukses', `Nomor Loading ${noLoading} berhasil ditarik ke rincian SP!`, 'success');
      }
    });
  };

  return (
    <div className="w-full p-6 bg-gray-50 min-h-screen text-slate-800 font-sans">
      {/* JUDUL MENU UTAMA */}
      <div className="w-full bg-slate-800 text-white text-center font-black text-lg tracking-widest p-2 rounded-xl uppercase shadow-md mb-6">
        SURAT PENGANTAR NAIK ( PENGIRIMAN )
      </div>

      {/* BLOCK CONTAINER FILTER PENCARIAN (GAMBAR 1) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs font-bold text-left mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> TANGGAL :</label>
            <input type="date" name="tgl_dari" value={filter.tgl_dari} onChange={handleFilterChange} className="w-full mt-1 p-2.5 border rounded-xl" />
          </div>
          <div>
            <label className="block text-gray-400">SAMPAI :</label>
            <input type="date" name="tgl_sampai" value={filter.tgl_sampai} onChange={handleFilterChange} className="w-full mt-1 p-2.5 border rounded-xl" />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> AGEN/CABANG :</label>
            <select name="agen_id" value={filter.agen_id} onChange={handleFilterChange} className="w-full mt-1 p-2.5 border rounded-xl bg-white">
              <option value="PUSAT DAKOTA">PUSAT DAKOTA</option>
              <option value="839">GORONTALO AGEN</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label><input type="checkbox" /> TUJUAN :</label>
            <input type="text" name="tujuan" value={filter.tujuan} onChange={handleFilterChange} placeholder="Tujuan" className="w-full mt-1 p-2.5 border rounded-xl uppercase" />
          </div>
          <div>
            <label><input type="checkbox" /> NO. SP :</label>
            <input type="text" name="no_sp" value={filter.no_sp} onChange={handleFilterChange} placeholder="Masukkan No. SP" className="w-full mt-1 p-2.5 border rounded-xl font-mono" />
          </div>
          <div>
            <label><input type="checkbox" /> NO. BTT :</label>
            <input type="text" name="no_btt" value={filter.no_btt} onChange={handleFilterChange} placeholder="Masukkan No. BTT" className="w-full mt-1 p-2.5 border rounded-xl font-mono" />
          </div>
          <div>
            <label><input type="checkbox" /> NO. LOADING :</label>
            <input type="text" name="no_loading" value={filter.no_loading} onChange={handleFilterChange} placeholder="Masukkan No. Loading" className="w-full mt-1 p-2.5 border rounded-xl font-mono" />
          </div>
        </div>

        {/* BARIS TOMBOL AKSI UTAMA (SINKRON WARNA WARNI GAMBAR 1) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-dashed">
          <div className="flex flex-wrap gap-2">
            <button onClick={fetchDaftarSP} className="px-4 h-11 bg-blue-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-blue-700 shadow"><RefreshCw size={14}/> REFRESH</button>
            <button onClick={handleAddSpFromLoading} className="px-4 h-11 bg-red-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-red-700 shadow">TAMBAH SP DARI PROSES LOADING</button>
            <button className="px-4 h-11 bg-red-700 text-white rounded-lg flex items-center gap-1.5 hover:bg-red-800 shadow">TAMBAH SP DARI BTT</button>
            <button className="px-4 h-11 bg-white text-blue-600 border border-blue-400 rounded-lg flex items-center gap-1.5 hover:bg-gray-50 shadow">TAMBAH SP DARI SP-PAD DLI/DLB</button>
            <button className="px-4 h-11 bg-amber-500 text-slate-900 rounded-lg flex items-center gap-1.5 hover:bg-amber-600 shadow"><Printer size={14}/> CETAK</button>
            <button className="px-4 h-11 bg-amber-500 text-slate-900 rounded-lg flex items-center gap-1.5 hover:bg-amber-600 shadow"><FileText size={14}/> REKAP NASIONAL</button>
          </div>
          <button className="px-6 h-11 bg-white border-2 border-red-500 text-red-600 font-bold rounded-lg flex items-center gap-1.5 hover:bg-red-50 shadow"><LogOut size={14}/> KELUAR</button>
        </div>
      </div>

      {/* DATA TABLE VIEW RESI MANIFEST SP */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-black uppercase text-[10px] tracking-wider border-b">
              <th className="p-3.5">NO. SP</th>
              <th className="p-3.5">TANGGAL</th>
              <th className="p-3.5">CABANG ASAL</th>
              <th className="p-3.5">CABANG TUJUAN</th>
              <th className="p-3.5">NO. ST</th>
              <th className="p-3.5">NO. MOBIL</th>
              <th className="p-3.5">SOPIR</th>
              <th className="p-3.5">BTT</th>
              <th className="p-3.5 text-center">AKTIF</th>
            </tr>
          </thead>
          <tbody className="font-bold text-slate-700 divide-y">
            {listSP.length === 0 ? (
              <tr><td colSpan="9" className="p-8 text-center text-gray-400 font-medium">Belum ada data Surat Pengantar yang dimuat, silakan klik Refresh, bro!</td></tr>
            ) : (
              listSP.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 text-indigo-600 font-mono">{row.no_sp}</td>
                  <td className="p-3.5">{row.tanggal}</td>
                  <td className="p-3.5">{row.sph_asalid}</td>
                  <td className="p-3.5 text-orange-600">{row.sph_tujuanid}</td>
                  <td className="p-3.5 font-mono">{row.no_st}</td>
                  <td className="p-3.5 font-mono">{row.no_mobil}</td>
                  <td className="p-3.5 uppercase">{row.sopir}</td>
                  <td className="p-3.5 text-center">{row.bttt_jmlkoli || 0} koli</td>
                  <td className="p-3.5 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full">Y</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BttSuratPengantarDashboard;
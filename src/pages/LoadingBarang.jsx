import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    PackageCheck, X as XIcon, Save, CheckCircle, Clock,
    Printer, RefreshCw, AlertTriangle, Truck, Plane, Ship
} from 'lucide-react';
import Swal from 'sweetalert2';
import dliLogo from '../assets/logoDLI.png';

const LoadingBarang = () => {
    const { isDarkMode } = useDarkMode();
    const [loadingList, setLoadingList] = useState([]);
    const [loading, setLoading] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    // Filter States
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [noLoad, setNoLoad] = useState('');
    const [noMobil, setNoMobil] = useState('');

    const [chkTgl, setChkTgl] = useState(true);
    const [chkNoLoad, setChkNoLoad] = useState(false);
    const [chkNoMobil, setChkNoMobil] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');

    // State Modal Edit & Approval Detail
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saving, setSaving] = useState(false);
    const [detailData, setDetailData] = useState({
        header: null,
        details: [],
        summary: []
    });
    const [editKendId, setEditKendId] = useState('');
    const [kendaraanList, setKendaraanList] = useState([]);

    useEffect(() => {
        fetchLoadingData();
        fetchKendaraanList();
    }, []);

    const fetchKendaraanList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/master/kendaraan', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data?.data || res.data || [];
            setKendaraanList(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Gagal memuat master kendaraan:", err);
        }
    };

    const fetchLoadingData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loading-barang', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    noload: noLoad,
                    nomobil: noMobil,
                    cktgl: chkTgl,
                    cknoload: chkNoLoad,
                    cknomobil: chkNoMobil
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.data || [];
            setLoadingList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Loading Barang:", err);
            setLoadingList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Buka Modal Edit / Approval Loading (Mengambil detail BTT & Summary seperti ASP)
    const handleEdit = async (item) => {
        setIsModalOpen(true);
        setLoadingDetail(true);
        setEditKendId(item.loadh_kend_id || '');
        setDetailData({
            header: {
                loadh_id: item.loadh_id,
                loadh_tanggal: item.loadh_tanggal,
                loadh_kendid: item.loadh_kend_id,
                loadh_updateid: item.loadh_update_id,
                loadh_approveyn: item.loadh_approve_yn || 'N',
                spt_eid: '',
                loper_eid: ''
            },
            details: [],
            summary: []
        });

        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loading-barang/detail', {
                params: { loadh_id: item.loadh_id },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.status === 'success') {
                setDetailData({
                    header: res.data.header,
                    details: res.data.details || [],
                    summary: res.data.summary || []
                });
                setEditKendId(res.data.header?.loadh_kendid || item.loadh_kend_id || '');
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memuat detail BTT loading', 'error');
        } finally {
            setLoadingDetail(false);
        }
    };

    // Simpan / Approve / Batalkan Approve
    const handleSaveOrApprove = async (targetApproveStatus) => {
        const hdr = detailData.header;
        if (!hdr) return;

        // Validasi: peringatan jika ada BTT yang jumlah scan kolinya belum lengkap
        const belumLengkap = detailData.details.filter(d => Number(d.terdaftar) < Number(d.di_btt));
        if (targetApproveStatus === 'Y' && belumLengkap.length > 0) {
            const confirm = await Swal.fire({
                title: 'Ada Koli Belum Lengkap!',
                html: `Terdapat <b>${belumLengkap.length} BTT</b> yang jumlah koli terdaftarnya kurang dari jumlah di BTT. Tetap lanjutkan Approve?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#059669',
                confirmButtonText: 'Ya, Tetap Approve',
                cancelButtonText: 'Periksa Lagi'
            });
            if (!confirm.isConfirmed) return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.put('/operasional/loading-barang/update', {
                loadh_id: hdr.loadh_id,
                loadh_kend_id: editKendId,
                loadh_approve_yn: targetApproveStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Berhasil!', res.data?.message || 'Status loading diperbarui.', 'success');
            setIsModalOpen(false);
            fetchLoadingData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memproses perubahan', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Manifest Loading?',
            text: `Yakin ingin menghapus Manifest Loading ${item.loadh_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/loading-barang/delete', {
                        params: { loadh_id: item.loadh_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Terhapus!', 'Manifest Loading berhasil dihapus.', 'success');
                    fetchLoadingData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Tidak dapat menghapus loading', 'error');
                }
            }
        });
    };

    // Cetak Approval Loading List (Sesuai opr_t_loading_print.asp)
    const handlePrintApprovalList = () => {
        const hdr = detailData.header;
        if (!hdr) return;

        const printWin = window.open('', '_blank', 'width=1000,height=750');
        if (!printWin) return;

        const adminName = localStorage.getItem('username') || 'ADMIN OPS';
        const rowsHtml = detailData.details.map((d, i) => {
            const lengkap = Number(d.di_btt) === Number(d.terdaftar);
            return `
                <tr>
                    <td style="text-align:center;">${i + 1}</td>
                    <td style="font-family:monospace; font-weight:bold;">${d.no_btt}</td>
                    <td>${d.kecamatan || '-'}</td>
                    <td>${d.kota || '-'}</td>
                    <td>${d.propinsi || '-'}</td>
                    <td>${d.cabang_nama || '-'}</td>
                    <td style="text-align:right;">${d.di_btt}</td>
                    <td style="text-align:right; font-weight:bold;">${d.terdaftar}</td>
                    <td style="text-align:center; font-weight:bold; color:${lengkap ? '#059669' : '#d97706'};">
                        ${lengkap ? 'Lengkap' : `Kurang ${d.di_btt - d.terdaftar}`}
                    </td>
                </tr>
            `;
        }).join('');

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Approval Loading List - ${hdr.loadh_id}</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                    th, td { border: 1px solid #444; padding: 5px 6px; }
                    th { background-color: #d1d5db; font-size: 10px; text-transform: uppercase; }
                </style>
            </head>
            <body onload="window.print()">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <strong style="font-size:13px;">PT. DAKOTA LOGISTIK INDONESIA</strong><br/>
                        <span>Operasional Loading & Muat Barang</span>
                    </div>
                    <img src="${window.location.origin}${dliLogo}" style="height:40px;" onerror="this.style.display='none'"/>
                </div>
                <div style="text-align:center; margin-top:12px;">
                    <h3 style="margin:0; letter-spacing:1px;">APPROVAL LOADING LIST</h3>
                    <div style="font-family:monospace; font-size:16px; font-weight:bold; margin-top:4px;">${hdr.loadh_id}</div>
                    <div style="font-size:11px; margin-top:2px;">No. Kendaraan: <b>${editKendId}</b> | Tgl Muat: <b>${hdr.loadh_tanggal}</b></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:30px;">No</th>
                            <th rowspan="2">No BTT</th>
                            <th colspan="4">Tujuan</th>
                            <th colspan="2">Jumlah</th>
                            <th rowspan="2">Keterangan</th>
                        </tr>
                        <tr>
                            <th>Kecamatan</th>
                            <th>Kota</th>
                            <th>Propinsi</th>
                            <th>Cabang Penerima</th>
                            <th>Di BTT</th>
                            <th>Terdaftar</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
                <div style="display:flex; justify-content:space-around; text-align:center; margin-top:36px;">
                    <div>Checker<br/><br/><br/><br/>[ ${hdr.loadh_updateid || '-'} ]</div>
                    <div>Pengemudi<br/><br/><br/><br/>[ _____________ ]</div>
                    <div>Admin OPS<br/><br/><br/><br/>[ ${adminName} ]</div>
                </div>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    const columns = [
        {
            header: 'KODE LOADING',
            accessor: 'loadh_id',
            render: (i) => (
                <button
                    type="button"
                    onClick={() => handleEdit(i)}
                    className="font-mono font-bold text-indigo-700 hover:underline cursor-pointer"
                >
                    {i.loadh_id}
                </button>
            )
        },
        {
            header: 'TANGGAL LOADING',
            accessor: 'loadh_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.loadh_tanggal}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'loadh_kend_id',
            render: (i) => <span className="font-bold uppercase text-slate-800">{i.loadh_kend_id}</span>
        },
        {
            header: 'PETUGAS',
            accessor: 'loadh_update_id',
            render: (i) => <span className="font-semibold uppercase text-slate-700">{i.loadh_update_id}</span>
        },
        {
            header: 'JML BARANG',
            accessor: 'jml_barang',
            render: (i) => <span className="font-mono font-bold text-slate-800">{i.jml_barang} Koli</span>
        },
        {
            header: 'APPROVE',
            accessor: 'loadh_approve_yn',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 w-max ${i.loadh_approve_yn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {i.loadh_approve_yn === 'Y' ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {i.loadh_approve_yn === 'Y' ? 'DISETUJUI' : 'PENDING'}
                </span>
            )
        }
    ];

    const filteredList = loadingList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.loadh_id && item.loadh_id.toLowerCase().includes(q)) ||
            (item.loadh_kend_id && item.loadh_kend_id.toLowerCase().includes(q)) ||
            (item.loadh_update_id && item.loadh_update_id.toLowerCase().includes(q))
        );
    });

    // Pisahkan Summary SP berdasarkan ServID ('1'=Darat, '2'=Laut, '3'=Udara)
    const sumDarat = detailData.summary.filter(s => s.serv_id === '1');
    const sumLaut = detailData.summary.filter(s => s.serv_id === '2');
    const sumUdara = detailData.summary.filter(s => s.serv_id === '3');

    const hdr = detailData.header;
    const isApproved = hdr?.loadh_approveyn === 'Y';
    const isLockedBySP = Boolean(hdr?.spt_eid || hdr?.loper_eid);

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input type="checkbox" id="chkTgl" checked={chkTgl} onChange={e => setChkTgl(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer" />
                            <label htmlFor="chkTgl" className="text-slate-600 uppercase cursor-pointer">FILTER PERIODE TANGGAL</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" disabled={!chkTgl} className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} value={filterTgla} onChange={e => setFilterTgla(e.target.value)} />
                            <input type="date" disabled={!chkTgl} className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} value={filterTgle} onChange={e => setFilterTgle(e.target.value)} />
                        </div>
                    </div>

                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input type="checkbox" id="chkNoLoad" checked={chkNoLoad} onChange={e => setChkNoLoad(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer" />
                            <label htmlFor="chkNoLoad" className="text-slate-600 uppercase cursor-pointer">FILTER NO. LOADING</label>
                        </div>
                        <input type="text" disabled={!chkNoLoad} placeholder="Cari No. Loading..." className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase ${!chkNoLoad ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} value={noLoad} onChange={e => setNoLoad(e.target.value)} />
                    </div>

                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input type="checkbox" id="chkNoMobil" checked={chkNoMobil} onChange={e => setChkNoMobil(e.target.checked)} className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer" />
                            <label htmlFor="chkNoMobil" className="text-slate-600 uppercase cursor-pointer">FILTER NO. MOBIL</label>
                        </div>
                        <input type="text" disabled={!chkNoMobil} placeholder="Cari Plat Mobil..." className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase ${!chkNoMobil ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} value={noMobil} onChange={e => setNoMobil(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button onClick={fetchLoadingData} className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md">
                        <PackageCheck size={15} /> REFRESH DATA
                    </button>
                </div>
            </div>

            <DataTableTemplate
                title="MANIFEST LOADING BARANG OPERASIONAL"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={null}
                onFilter={null}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* MODAL APPROVAL & EDIT LOADING BARANG (SESUAI OPR_T_LOADING_ADMIN_E.ASP) */}
            {isModalOpen && hdr && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-5xl rounded-2xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>

                        {/* HEADER MODAL */}
                        <div className="px-6 py-4 bg-[#004b84] text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                                    <PackageCheck size={20} /> APPROVAL & RINCIAN LOADING BARANG
                                </h3>
                                <p className="text-xs font-mono text-sky-200 mt-0.5">
                                    LOADING ID: <b>{hdr.loadh_id}</b>
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* BODY SCROLLABLE */}
                        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                            {/* BARIS INFO HEADER & TOMBOL APPROVE / BATALKAN */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl items-end">
                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">TANGGAL MUAT :</label>
                                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800">
                                        {hdr.loadh_tanggal}
                                    </div>
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">NOMOR MOBIL :</label>
                                    <select
                                        disabled={isApproved}
                                        value={editKendId}
                                        onChange={e => setEditKendId(e.target.value.toUpperCase())}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900 uppercase outline-none focus:border-blue-600 disabled:bg-slate-100 cursor-pointer"
                                    >
                                        <option value="">-- PILIH ARMADA --</option>
                                        {/* Tetap tampilkan nomor mobil saat ini jika formatnya berbeda/tidak ada di master */}
                                        {editKendId && !kendaraanList.some(k => (k.kend_id || k.kend_identid) === editKendId) && (
                                            <option value={editKendId}>{editKendId}</option>
                                        )}
                                        {kendaraanList.map((k, idx) => {
                                            const plat = k.kend_identid || k.kend_id;
                                            return (
                                                <option key={idx} value={plat}>
                                                    {plat}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={handlePrintApprovalList}
                                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Printer size={15} /> Cetak Loading List
                                    </button>

                                    {!isApproved ? (
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => handleSaveOrApprove('Y')}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                                        >
                                            <CheckCircle size={15} /> APPROVE LOADING
                                        </button>
                                    ) : !isLockedBySP ? (
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => handleSaveOrApprove('N')}
                                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
                                        >
                                            <AlertTriangle size={15} /> BATALKAN APPROVE
                                        </button>
                                    ) : (
                                        <span className="px-3 py-2 bg-sky-100 text-sky-800 font-bold rounded-lg border border-sky-200">
                                            🔒 Terkunci SP: {hdr.spt_eid || hdr.loper_eid}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* TABEL JUMLAH BTT TERDAFTAR */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-100 flex justify-between items-center">
                                    <span className="font-black text-sky-950 uppercase">
                                        JUMLAH BTT TERDAFTAR : {detailData.details.length}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        STATUS: {isApproved ? 'APPROVED (Y)' : 'BELUM APPROVE (N)'}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-[#004b84] text-white uppercase text-[10px]">
                                            <tr>
                                                <th rowSpan={2} className="p-2.5 border-r border-sky-800">NO BTT</th>
                                                <th colSpan={4} className="p-1.5 text-center border-b border-r border-sky-800">TUJUAN</th>
                                                <th colSpan={2} className="p-1.5 text-center border-b border-r border-sky-800">JUMLAH</th>
                                                <th rowSpan={2} className="p-2.5 text-center">STATUS</th>
                                            </tr>
                                            <tr>
                                                <th className="p-2 border-r border-sky-800">KECAMATAN</th>
                                                <th className="p-2 border-r border-sky-800">KOTA</th>
                                                <th className="p-2 border-r border-sky-800">PROPINSI</th>
                                                <th className="p-2 border-r border-sky-800">CABANG PENERIMA</th>
                                                <th className="p-2 text-right border-r border-sky-800">DI BTT</th>
                                                <th className="p-2 text-right border-r border-sky-800">TERDAFTAR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-semibold">
                                            {loadingDetail ? (
                                                <tr><td colSpan={8} className="p-6 text-center text-slate-400"><RefreshCw className="animate-spin inline mr-2" size={15} /> Memuat rincian BTT...</td></tr>
                                            ) : detailData.details.length === 0 ? (
                                                <tr><td colSpan={8} className="p-6 text-center text-slate-400 italic">Belum ada BTT yang di-scan pada loading ini.</td></tr>
                                            ) : (
                                                detailData.details.map((row, idx) => {
                                                    const isSesuai = Number(row.di_btt) === Number(row.terdaftar);
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="p-2.5 font-mono font-bold text-indigo-700">{row.no_btt}</td>
                                                            <td className="p-2.5 uppercase">{row.kecamatan}</td>
                                                            <td className="p-2.5 uppercase">{row.kota}</td>
                                                            <td className="p-2.5 uppercase">{row.propinsi}</td>
                                                            <td className="p-2.5 uppercase font-bold">{row.cabang_nama}</td>
                                                            <td className="p-2.5 text-right font-mono">{row.di_btt}</td>
                                                            <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{row.terdaftar}</td>
                                                            <td className="p-2.5 text-center">
                                                                {isSesuai ? (
                                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black">LENGKAP</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">KURANG {row.di_btt - row.terdaftar}</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* SUMMARY SP DARAT, LAUT, UDARA (SESUAI ASP) */}
                            {detailData.summary.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { title: 'SUMMARY SP DARAT', icon: Truck, list: sumDarat, color: 'text-emerald-700' },
                                        { title: 'SUMMARY SP LAUT', icon: Ship, list: sumLaut, color: 'text-sky-700' },
                                        { title: 'SUMMARY SP UDARA', icon: Plane, list: sumUdara, color: 'text-indigo-700' }
                                    ].map((grp, gIdx) => grp.list.length > 0 && (
                                        <div key={gIdx} className="border border-slate-200 rounded-xl overflow-hidden">
                                            <div className={`px-3 py-2 bg-slate-100 font-black text-[11px] flex items-center gap-1.5 ${grp.color}`}>
                                                <grp.icon size={14} /> {grp.title}
                                            </div>
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-b">
                                                    <tr>
                                                        <th className="p-2 text-left">Cabang Tujuan</th>
                                                        <th className="p-2 text-right">Jml BTT</th>
                                                        <th className="p-2 text-right">Berat</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-semibold">
                                                    {grp.list.map((s, sIdx) => (
                                                        <tr key={sIdx}>
                                                            <td className="p-2">{s.cabang_nama}</td>
                                                            <td className="p-2 text-right font-mono">{s.jml_btt}</td>
                                                            <td className="p-2 text-right font-mono">{Number(s.total_berat).toLocaleString('id-ID')} kg</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FOOTER MODAL */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-200 cursor-pointer text-xs">
                                Keluar
                            </button>
                            {!isApproved && (
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleSaveOrApprove('N')}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg flex items-center gap-1.5 cursor-pointer text-xs"
                                >
                                    <Save size={14} /> Simpan Perubahan
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadingBarang;
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { RotateCcw, RefreshCw, X as XIcon, Save, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const PengembalianBTT = () => {
    const { isDarkMode } = useDarkMode();
    const [kembaliList, setKembaliList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2020-01-01'); // Default 2020 agar data 2021-2023 terbaca
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterNoKembali, setFilterNoKembali] = useState('');
    const [filterAgen, setFilterAgen] = useState('');
    const [filterNoBtt, setFilterNoBtt] = useState('');

    // ✅ DEKLARASI STATE chkTgl (Default false agar secara awal menampilkan seluruh data pgAdmin)
    const [chkTgl, setChkTgl] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // --- Modal States ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form Data States
    const defaultForm = {
        kb_eid: '',
        kb_tujuan_agen_id: 'DEMAK',
        kb_bdb_id: '',
        list_btt_id: ['']
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchKembaliBttData();
    }, []);

    // FETCH DATA PENGEMBALIAN BTT
    const fetchKembaliBttData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/kembali-btt-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    no_kembali: filterNoKembali,
                    agen_nama: filterAgen,
                    no_btt: filterNoBtt,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setKembaliList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Pengembalian BTT:", err);
            setKembaliList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // HANDLER MODAL AKSI
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            kb_eid: item.kb_eid || '',
            kb_tujuan_agen_id: item.kb_tujuan_agen_id || item.agen_nama || 'DEMAK',
            kb_bdb_id: item.kb_bdb_id !== '-' ? item.kb_bdb_id : '',
            list_btt_id: ['0060010/01/2025/OJ']
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Pengembalian BTT?',
            text: `Apakah Anda yakin ingin menghapus berkas pengembalian ${item.kb_eid}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/kembali-btt-delete', {
                        params: { kb_eid: item.kb_eid },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Data pengembalian BTT berhasil dihapus.', 'success');
                    fetchKembaliBttData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.kb_eid || !formData.kb_tujuan_agen_id) {
            Swal.fire('Peringatan', 'No. Pengembalian dan Cabang Tujuan Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/kembali-btt-update' : '/operasional/kembali-btt-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Pengembalian BTT berhasil diperbarui.' : 'Pengembalian BTT berhasil dibuat.', 'success');
            setIsModalOpen(false);
            fetchKembaliBttData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    // Handler Dynamic List BTT
    const handleBttChange = (index, value) => {
        const updated = [...formData.list_btt_id];
        updated[index] = value;
        setFormData({ ...formData, list_btt_id: updated });
    };

    const addBttRow = () => {
        setFormData({ ...formData, list_btt_id: [...formData.list_btt_id, ''] });
    };

    const removeBttRow = (index) => {
        const updated = formData.list_btt_id.filter((_, i) => i !== index);
        setFormData({ ...formData, list_btt_id: updated });
    };

    // DEFINISI KOLOM TABLE
    const columns = [
        {
            header: 'No. PENGEMBALIAN',
            accessor: 'kb_eid',
            render: (i) => <span className="font-mono font-bold text-indigo-700">📄 {i.kb_eid || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'kb_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.kb_tanggal || '-'}</span>
        },
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.agen_nama || '-'}</span>
        },
        {
            header: 'PEMBUAT',
            accessor: 'kb_update_id',
            render: (i) => <span className="font-semibold text-slate-600 uppercase">{i.kb_update_id || '-'}</span>
        },
        {
            header: 'No. BDB',
            accessor: 'kb_bdb_id',
            render: (i) => (
                <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {(i.kb_bdb_id && i.kb_bdb_id !== '-') ? i.kb_bdb_id : '-'}
                </span>
            )
        },
        {
            header: 'AKTIF',
            accessor: 'kb_aktif_yn',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.kb_aktif_yn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {i.kb_aktif_yn === 'Y' ? 'Ya' : 'Tidak'}
                </span>
            )
        }
    ];

    // Client-side Search Filter
    const filteredList = kembaliList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.kb_eid && item.kb_eid.toLowerCase().includes(q)) ||
            (item.agen_nama && item.agen_nama.toLowerCase().includes(q)) ||
            (item.kb_bdb_id && item.kb_bdb_id.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">

                    {/* FILTER TANGGAL */}
                    <div className="col-span-3">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkTgl"
                                checked={chkTgl}
                                onChange={e => setChkTgl(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkTgl" className="text-slate-600 uppercase cursor-pointer">FILTER PERIODE TANGGAL</label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgla}
                                onChange={e => setFilterTgla(e.target.value)}
                            />
                            <input
                                type="date"
                                disabled={!chkTgl}
                                className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium ${!chkTgl ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                                value={filterTgle}
                                onChange={e => setFilterTgle(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* FILTER NO PENGEMBALIAN */}
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. PENGEMBALIAN</label>
                        <input
                            type="text"
                            placeholder="NO. PENGEMBALIAN..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoKembali}
                            onChange={e => setFilterNoKembali(e.target.value)}
                        />
                    </div>

                    {/* FILTER AGEN */}
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">CABANG / AGEN</label>
                        <input
                            type="text"
                            placeholder="NAMA AGEN CABANG..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterAgen}
                            onChange={e => setFilterAgen(e.target.value)}
                        />
                    </div>

                    {/* FILTER NO BTT */}
                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">CARI NO. BTT / RESI</label>
                        <input
                            type="text"
                            placeholder="NO. BTT RESI..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoBtt}
                            onChange={e => setFilterNoBtt(e.target.value)}
                        />
                    </div>
                </div>

                {/* BUTTON REFRESH */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchKembaliBttData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH PENGEMBALIAN BTT
                    </button>
                </div>
            </div>

            {/* DATATABLE TEMPLATE DENGAN PAGINATION & MODAL ACTION */}
            <DataTableTemplate
                title="CONTROL PENGEMBALIAN BTT (OPR_T_eKembaliBTT)"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={(e) => setGlobalSearch(e.target.value)}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* MODAL DIALOG EDIT / TAMBAH PENGEMBALIAN BTT */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

                        {/* Title Header Modal */}
                        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100">
                            <h2 className="text-xl font-bold font-['Inter'] text-slate-900 tracking-wide uppercase flex items-center gap-2">
                                <RotateCcw size={20} className="text-indigo-600" />
                                {isEditMode ? `EDIT PENGEMBALIAN BTT: ${formData.kb_eid}` : 'ADD PENGEMBALIAN BTT INFO'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                                <XIcon size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body Form 2 Kolom Sejajar */}
                        <form onSubmit={handleSubmitForm} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. PENGEMBALIAN BTT</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white disabled:bg-slate-100"
                                        placeholder="Contoh: KB/2026/07/001"
                                        value={formData.kb_eid}
                                        onChange={e => setFormData({ ...formData, kb_eid: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">CABANG / AGEN TUJUAN</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all uppercase bg-white"
                                        placeholder="NAMA CABANG AGEN..."
                                        value={formData.kb_tujuan_agen_id}
                                        onChange={e => setFormData({ ...formData, kb_tujuan_agen_id: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-slate-600 font-semibold">NO. BDB / BERITA ACARA (OPSIONAL)</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white"
                                        placeholder="Misal: BDB/2026/001"
                                        value={formData.kb_bdb_id}
                                        onChange={e => setFormData({ ...formData, kb_bdb_id: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                {/* LIST BTT DETIL DYNAMIC */}
                                <div className="col-span-2 space-y-3 pt-2 border-t">
                                    <div className="flex justify-between items-center">
                                        <label className="text-slate-700 font-bold uppercase text-xs">DAFTAR NOMOR BTT / RESI YANG DIKEMBALIKAN</label>
                                        <button
                                            type="button"
                                            onClick={addBttRow}
                                            className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={14} /> Tambah BTT
                                        </button>
                                    </div>

                                    {formData.list_btt_id.map((btt, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-mono text-xs uppercase bg-white"
                                                placeholder={`Nomor Resi BTT Ke-${idx + 1}...`}
                                                value={btt}
                                                onChange={e => handleBttChange(idx, e.target.value.toUpperCase())}
                                                required
                                            />
                                            {formData.list_btt_id.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBttRow(idx)}
                                                    className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                            </div>

                            {/* Action Buttons Footer */}
                            <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-[160px] py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="w-[160px] py-3 bg-[#1e1b4b] hover:opacity-90 active:scale-98 text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center text-xs shadow-md"
                                >
                                    {isEditMode ? 'UPDATE BTT' : 'ADD BTT'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PengembalianBTT;
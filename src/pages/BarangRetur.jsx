import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { RefreshCw, X as XIcon, Plus, Trash2, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';

const BarangRetur = () => {
    const { isDarkMode } = useDarkMode();
    const [returList, setReturList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2020-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterNoRetur, setFilterNoRetur] = useState('');
    const [filterAgen, setFilterAgen] = useState('');
    const [filterNoBtt, setFilterNoBtt] = useState('');
    const [chkTgl, setChkTgl] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const defaultForm = {
        rb_eid: '',
        rb_tujuan_agen_id: 'DEMAK',
        keterangan: 'Barang ditolak / Alamat Rumah Tutup',
        list_btt_id: ['']
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        fetchReturBttData();
    }, []);

    const fetchReturBttData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/retur-btt-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    no_retur: filterNoRetur,
                    agen_nama: filterAgen,
                    no_btt: filterNoBtt,
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setReturList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat data Retur BTT:", err);
            setReturList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            rb_eid: item.rb_eid || '',
            rb_tujuan_agen_id: item.rb_tujuan_agen_id || item.agen_nama || 'DEMAK',
            keterangan: 'Barang bermasalah / retur pengirim',
            list_btt_id: ['0060010/01/2025/OJ']
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus Retur BTT?',
            text: `Apakah Anda yakin ingin menghapus manifest retur ${item.rb_eid}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/retur-btt-delete', {
                        params: { rb_eid: item.rb_eid },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', 'Data retur BTT berhasil dihapus.', 'success');
                    fetchReturBttData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.rb_eid || !formData.rb_tujuan_agen_id) {
            Swal.fire('Peringatan', 'No. Retur dan Cabang Tujuan Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/retur-btt-update' : '/operasional/retur-btt-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Retur BTT berhasil diperbarui.' : 'Retur BTT berhasil direkam.', 'success');
            setIsModalOpen(false);
            fetchReturBttData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

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

    const columns = [
        {
            header: 'No. RETUR',
            accessor: 'rb_eid',
            render: (i) => <span className="font-mono font-bold text-rose-700">📦 {i.rb_eid || '-'}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'rb_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.rb_tanggal || '-'}</span>
        },
        {
            header: 'CABANG / AGEN',
            accessor: 'agen_nama',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.agen_nama || '-'}</span>
        },
        {
            header: 'PEMBUAT',
            accessor: 'rb_update_id',
            render: (i) => <span className="font-semibold text-slate-600 uppercase">{i.rb_update_id || '-'}</span>
        },
        {
            header: 'AKTIF',
            accessor: 'rb_aktif_yn',
            render: (i) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${i.rb_aktif_yn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {i.rb_aktif_yn === 'Y' ? 'Ya' : 'Tidak'}
                </span>
            )
        }
    ];

    const filteredList = returList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.rb_eid && item.rb_eid.toLowerCase().includes(q)) ||
            (item.agen_nama && item.agen_nama.toLowerCase().includes(q)) ||
            (item.rb_update_id && item.rb_update_id.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">
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

                    <div className="col-span-3">
                        <label className="block mb-1 text-slate-500 uppercase">NO. TRANSAKSI RETUR BARANG</label>
                        <input
                            type="text"
                            placeholder="NO. RETUR..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase bg-white"
                            value={filterNoRetur}
                            onChange={e => setFilterNoRetur(e.target.value)}
                        />
                    </div>

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

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchReturBttData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH RETUR BTT
                    </button>
                </div>
            </div>

            <DataTableTemplate
                title="RETUR BTT / BARANG BERMASALAH (OPR_T_eReturBTT)"
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100">
                            <h2 className="text-xl font-bold font-['Inter'] text-slate-900 tracking-wide uppercase flex items-center gap-2">
                                <AlertTriangle size={20} className="text-rose-600" />
                                {isEditMode ? `EDIT RETUR BTT: ${formData.rb_eid}` : 'ADD RETUR BTT INFO'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                                <XIcon size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitForm} className="p-8 space-y-6 text-sm font-medium text-slate-700">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">NO. TRANSAKSI RETUR BARANG</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all font-mono uppercase bg-white disabled:bg-slate-100"
                                        placeholder="Contoh: RB/2026/07/001"
                                        value={formData.rb_eid}
                                        onChange={e => setFormData({ ...formData, rb_eid: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-slate-600 font-semibold">CABANG / AGEN TUJUAN RETUR</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition-all uppercase bg-white"
                                        placeholder="NAMA CABANG AGEN..."
                                        value={formData.rb_tujuan_agen_id}
                                        onChange={e => setFormData({ ...formData, rb_tujuan_agen_id: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 col-span-2">
                                    <label className="text-slate-600 font-semibold">KETERANGAN ALASAN RETUR BARANG</label>
                                    <textarea
                                        rows={2}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 bg-white resize-none"
                                        placeholder="Masukkan alasan retur / deskripsi masalah barang..."
                                        value={formData.keterangan}
                                        onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2 space-y-3 pt-2 border-t">
                                    <div className="flex justify-between items-center">
                                        <label className="text-slate-700 font-bold uppercase text-xs">DAFTAR NOMOR BTT / RESI BERMASALAH YANG DIRETUR</label>
                                        <button
                                            type="button"
                                            onClick={addBttRow}
                                            className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={14} /> Tambah BTT Retur
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
                                    {isEditMode ? 'UPDATE RETUR' : 'ADD RETUR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarangRetur;
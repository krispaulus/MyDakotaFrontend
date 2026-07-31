import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Clock, CheckCircle2, XCircle, RefreshCw, X, Save, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

const LoperDeadline = () => {
    const { isDarkMode } = useDarkMode();
    const [loading, setLoading] = useState(false);
    const [deadlineList, setDeadlineList] = useState([]);

    // Modal Control States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form Data States Lengkap 6 Parameter
    const defaultForm = {
        loper_id: '',
        btt_id: '',
        loper_tanggal: new Date().toISOString().slice(0, 16).replace('T', ' '),
        nip_sopir: '',
        nama_sopir: '',
        nip_kerani: '',
        nama_kerani: '',
        no_mobil: ''
    };
    const [formData, setFormData] = useState(defaultForm);

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [nipNama, setNipNama] = useState('');
    const [noMobil, setNoMobil] = useState('');

    const [chkTgl, setChkTgl] = useState(true);
    const [chkNipNama, setChkNipNama] = useState(false);
    const [chkNoMobil, setChkNoMobil] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');

    useEffect(() => {
        fetchDeadlineData();
    }, []);

    // FETCH DATA OUTSTANDING DEADLINE
    const fetchDeadlineData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper-deadline-list', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    nipnama: chkNipNama ? nipNama : '',
                    nomobil: chkNoMobil ? noMobil : '',
                    chktgl: chkTgl
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data?.data || [];
            setDeadlineList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Gagal memuat BTT Deadline:", err);
            setDeadlineList([]);
            Swal.fire('Gagal', err.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // HANDLER MODAL ACTIONS (ADD, EDIT, DELETE)
    const handleAdd = () => {
        setIsEditMode(false);
        setFormData(defaultForm);
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setIsEditMode(true);
        setFormData({
            loper_id: item.loper_id || '',
            btt_id: item.btt_id || '',
            loper_tanggal: item.loper_tanggal || '',
            nip_sopir: item.nip_sopir || '',
            nama_sopir: item.nama_sopir || '',
            nip_kerani: item.nip_kerani || '',
            nama_kerani: item.nama_kerani || '',
            no_mobil: item.no_mobil || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        Swal.fire({
            title: 'Hapus BTT Deadline?',
            text: `Apakah Anda yakin ingin menghapus BTT ${item.btt_id} dari Loper ${item.loper_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/loper-deadline-delete', {
                        params: { loper_id: item.loper_id, btt_id: item.btt_id },
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Terhapus!', `BTT ${item.btt_id} berhasil dihapus.`, 'success');
                    fetchDeadlineData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus record', 'error');
                }
            }
        });
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.loper_id || !formData.btt_id) {
            Swal.fire('Peringatan', 'Nomor Loper dan Nomor BTT Wajib Diisi!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? '/operasional/loper-deadline-update' : '/operasional/loper-deadline-create';
            const method = isEditMode ? api.put : api.post;

            await method(endpoint, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire('Sukses!', isEditMode ? 'Record BTT Deadline diperbarui.' : 'BTT Deadline baru ditambahkan.', 'success');
            setIsModalOpen(false);
            fetchDeadlineData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data', 'error');
        }
    };

    // HANDLER EKSEKUSI APPROVAL (TERIMA / TOLAK)
    const handleProcessAction = (item, status) => {
        const actionTitle = status === 'Y' ? 'Menerima' : 'Menolak';
        const confirmBtnColor = status === 'Y' ? '#10B981' : '#EF4444';

        Swal.fire({
            title: `${actionTitle} BTT ${item.btt_id}?`,
            text: `Nomor Loper: ${item.loper_id} | Armada: ${item.no_mobil}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: confirmBtnColor,
            cancelButtonColor: '#6B7280',
            confirmButtonText: `Ya, ${actionTitle}!`,
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.post('/operasional/loper-deadline-action', {
                        loper_id: item.loper_id,
                        btt_id: item.btt_id,
                        status: status
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Sukses!', `BTT ${item.btt_id} berhasil di-${actionTitle.toLowerCase()}.`, 'success');
                    fetchDeadlineData();
                } catch (err) {
                    Swal.fire('Gagal', err.response?.data?.message || 'Gagal memproses BTT deadline', 'error');
                }
            }
        });
    };

    // DEFINISI KOLOM DATATABLE
    const columns = [
        {
            header: 'NOMOR LOPER',
            accessor: 'loper_id',
            render: (i) => <span className="font-mono font-bold text-indigo-700">{i.loper_id}</span>
        },
        {
            header: 'NOMOR BTT',
            accessor: 'btt_id',
            render: (i) => <span className="font-mono font-bold text-slate-800">{i.btt_id}</span>
        },
        {
            header: 'TANGGAL LOPER',
            accessor: 'loper_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.loper_tanggal}</span>
        },
        {
            header: 'NIP / NAMA SOPIR',
            accessor: 'nama_sopir',
            render: (i) => <span className="font-bold text-slate-800 uppercase">{i.nama_sopir} ({i.nip_sopir})</span>
        },
        {
            header: 'NIP / NAMA KERANI',
            accessor: 'nama_kerani',
            render: (i) => <span className="font-semibold text-slate-700 uppercase">{i.nama_kerani !== '-' ? `${i.nama_kerani} (${i.nip_kerani})` : '-'}</span>
        },
        {
            header: 'NOMOR MOBIL',
            accessor: 'no_mobil',
            render: (i) => <span className="bg-slate-800 text-yellow-400 font-mono font-bold px-2.5 py-0.5 rounded text-xs">{i.no_mobil}</span>
        },
        {
            header: 'AKSI APPROVAL',
            accessor: 'action',
            render: (i) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleProcessAction(i, 'Y')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold flex items-center gap-1 transition cursor-pointer text-xs shadow-xs"
                    >
                        <CheckCircle2 size={13} /> Terima
                    </button>
                    <button
                        onClick={() => handleProcessAction(i, 'N')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold flex items-center gap-1 transition cursor-pointer text-xs shadow-xs"
                    >
                        <XCircle size={13} /> Tolak
                    </button>
                </div>
            )
        }
    ];

    // Client-side Search Filter
    const filteredList = deadlineList.filter(item => {
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.loper_id && item.loper_id.toLowerCase().includes(q)) ||
            (item.btt_id && item.btt_id.toLowerCase().includes(q)) ||
            (item.no_mobil && item.no_mobil.toLowerCase().includes(q)) ||
            (item.nama_sopir && item.nama_sopir.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-12 gap-3">

                    {/* FILTER PERIODE TANGGAL */}
                    <div className="col-span-4">
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

                    {/* FILTER NIP ATAU NAMA */}
                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkNipNama"
                                checked={chkNipNama}
                                onChange={e => setChkNipNama(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkNipNama" className="text-slate-600 uppercase cursor-pointer">FILTER NIP ATAU NAMA</label>
                        </div>
                        <input
                            type="text"
                            disabled={!chkNipNama}
                            placeholder="Masukkan NIP atau Nama Sopir/Kerani..."
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase ${!chkNipNama ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                            value={nipNama}
                            onChange={e => setNipNama(e.target.value)}
                        />
                    </div>

                    {/* FILTER NOMOR MOBIL */}
                    <div className="col-span-4">
                        <div className="flex items-center gap-1 mb-1">
                            <input
                                type="checkbox"
                                id="chkNoMobil"
                                checked={chkNoMobil}
                                onChange={e => setChkNoMobil(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <label htmlFor="chkNoMobil" className="text-slate-600 uppercase cursor-pointer">FILTER NOMOR MOBIL</label>
                        </div>
                        <input
                            type="text"
                            disabled={!chkNoMobil}
                            placeholder="Masukkan No. Mobil Armada..."
                            className={`w-full p-2.5 border border-slate-200 rounded-lg outline-none font-medium uppercase ${!chkNoMobil ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                            value={noMobil}
                            onChange={e => setNoMobil(e.target.value)}
                        />
                    </div>
                </div>

                {/* BUTTON REFRESH */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                        onClick={fetchDeadlineData}
                        className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black transition cursor-pointer text-xs uppercase shadow-md"
                    >
                        <RefreshCw size={15} /> REFRESH DATA OUTSTANDING
                    </button>
                </div>
            </div>

            {/* DATATABLE TEMPLATE DENGAN PROPS HANDLER (ADD, EDIT, DELETE) */}
            <DataTableTemplate
                title="PROSES BTT MELEWATI TENGAT WAKTU (OUTSTANDING DEADLINE)"
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

            {/* CUSTOM MODAL EDIT / TAMBAH DEADLINE FULL 6 PARAMETER */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-3xl p-6 rounded-2xl shadow-2xl transition-all border flex flex-col min-h-0 ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>

                        {/* Title Header */}
                        <div className="flex justify-between items-center pb-3 border-b dark:border-slate-700">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wide">
                                <FileText size={18} />
                                {isEditMode ? `EDIT BTT DEADLINE: ${formData.btt_id}` : 'TAMBAH BTT DEADLINE MANUAL'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        {/* FORM INPUT BODY - 6 PARAMETER SEJAJAR */}
                        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs mt-4">
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NOMOR LOPER</label>
                                    <input
                                        type="text"
                                        disabled={isEditMode}
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold text-blue-600 outline-none uppercase bg-white disabled:bg-slate-100"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: LP/2025/01/001"
                                        value={formData.loper_id}
                                        onChange={e => setFormData({ ...formData, loper_id: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NOMOR BTT / RESI</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: 0060008/01/2025/OJ"
                                        value={formData.btt_id}
                                        onChange={e => setFormData({ ...formData, btt_id: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">TANGGAL LOPER DIBUAT</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="YYYY-MM-DD HH:MM:SS"
                                        value={formData.loper_tanggal}
                                        onChange={e => setFormData({ ...formData, loper_tanggal: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NOMOR MOBIL / ARMADA</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-mono font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="Misal: B 9330 KXU"
                                        value={formData.no_mobil}
                                        onChange={e => setFormData({ ...formData, no_mobil: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NIP / NAMA SOPIR</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="NIP atau Nama Sopir..."
                                        value={formData.nama_sopir || formData.nip_sopir}
                                        onChange={e => setFormData({ ...formData, nama_sopir: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="font-black text-slate-500 block mb-1 uppercase">NIP / NAMA KERANI / HELPER</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 border rounded-lg font-bold uppercase outline-none bg-white"
                                        style={{ borderColor: isDarkMode ? '#475569' : '#cbd5e1' }}
                                        placeholder="NIP atau Nama Kerani..."
                                        value={formData.nama_kerani || formData.nip_kerani}
                                        onChange={e => setFormData({ ...formData, nama_kerani: e.target.value })}
                                    />
                                </div>

                            </div>

                            {/* FOOTER ACTION STICKY */}
                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border font-bold hover:bg-slate-100 transition cursor-pointer text-slate-600"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-black shadow-md transition cursor-pointer"
                                >
                                    <Save size={14} />
                                    {isEditMode ? 'Simpan Perubahan' : 'Tambah Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoperDeadline;
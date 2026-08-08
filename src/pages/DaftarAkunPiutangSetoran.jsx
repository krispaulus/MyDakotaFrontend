import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { X, Building2, Edit3 } from 'lucide-react';
import Swal from 'sweetalert2';

const DaftarAkunPiutangSetoran = () => {
    const { isDarkMode } = useDarkMode();
    const [stt, setStt] = useState('2'); // '2' = Cabang, '3' = Agen
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Dropdown Data
    const [coaList, setCoaList] = useState([]);
    const [itemList, setItemList] = useState([]);

    // Modal Edit Mapping
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState({
        agen_id: '',
        agen_nama: '',
        target: 'P', // 'P' | 'S' | 'I'
        targetTitle: '',
        code: ''
    });

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resCoa, resItem] = await Promise.all([
                api.get('/gl/kode-perkiraan?limit=1000', { headers }),
                api.get('/gl/pemasukan-pengeluaran?limit=1000', { headers })
            ]);

            setCoaList(resCoa.data?.data || []);
            setItemList(resItem.data?.data || []);
        } catch (err) {
            console.error("Gagal load master COA/Item:", err);
        }
    };

    const fetchAgenCA = async (statusType) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/gl/agen-ca?stt=${statusType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data Agen CA:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchAgenCA(stt);
    }, [stt]);

    const handleOpenEdit = (agen, targetType, currentCode) => {
        let title = '';
        if (targetType === 'P') title = 'KODE PIUTANG';
        if (targetType === 'S') title = 'KODE SETORAN';
        if (targetType === 'I') title = 'KODE PENGELUARAN';

        setEditTarget({
            agen_id: agen.agen_id,
            agen_nama: agen.agen_nama,
            target: targetType,
            targetTitle: title,
            code: currentCode || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveMapping = async (e) => {
        e.preventDefault();
        try {
            await api.post('/gl/agen-ca/update', {
                agen_id: editTarget.agen_id,
                target: editTarget.target,
                code: editTarget.code
            });

            Swal.fire({
                title: 'BERHASIL!',
                text: 'Mapping akun berhasil diperbarui.',
                icon: 'success',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });

            setIsModalOpen(false);
            fetchAgenCA(stt);
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Gagal menyimpan mapping.',
                icon: 'error',
                didOpen: () => {
                    const container = document.querySelector('.swal2-container');
                    if (container) container.style.zIndex = '9999999';
                }
            });
        }
    };

    // 🌟 Definisi Kolom Sesuai Standard DataTableTemplate
    const columns = [
        {
            header: 'KODE',
            accessor: 'agen_id',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.agen_id}</span>
        },
        {
            header: `NAMA ${stt === '2' ? 'CABANG' : 'AGEN'}`,
            accessor: 'agen_nama',
            render: (item) => <span className="font-bold text-slate-800 uppercase">{item.agen_nama}</span>
        },
        {
            header: 'ALAMAT',
            accessor: 'agen_alamat',
            render: (item) => <span className="text-slate-600">{item.agen_alamat || '-'}</span>
        },
        {
            header: 'KODE PIUTANG',
            accessor: 'agenc_caid',
            render: (item) => item.agenc_caid ? (
                <button
                    onClick={() => handleOpenEdit(item, 'P', item.agenc_caid)}
                    className="font-mono font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                    {item.agenc_caid}
                </button>
            ) : (
                <button
                    onClick={() => handleOpenEdit(item, 'P', '')}
                    className="px-2.5 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-[11px] font-bold hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 mx-auto"
                >
                    <Edit3 size={12} /> Edit
                </button>
            )
        },
        {
            header: 'KODE SETORAN',
            accessor: 'agenc_caid_setoran',
            render: (item) => item.agenc_caid_setoran ? (
                <button
                    onClick={() => handleOpenEdit(item, 'S', item.agenc_caid_setoran)}
                    className="font-mono font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                    {item.agenc_caid_setoran}
                </button>
            ) : (
                <button
                    onClick={() => handleOpenEdit(item, 'S', '')}
                    className="px-2.5 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-[11px] font-bold hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 mx-auto"
                >
                    <Edit3 size={12} /> Edit
                </button>
            )
        },
        {
            header: 'KODE PENGELUARAN',
            accessor: 'agenc_item_id',
            render: (item) => item.agenc_item_id ? (
                <button
                    onClick={() => handleOpenEdit(item, 'I', item.agenc_item_id)}
                    className="font-mono font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                    {item.agenc_item_id}
                </button>
            ) : (
                <button
                    onClick={() => handleOpenEdit(item, 'I', '')}
                    className="px-2.5 py-1 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-[11px] font-bold hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 mx-auto"
                >
                    <Edit3 size={12} /> Edit
                </button>
            )
        },
    ];

    // Modal Portal Edit Mapping
    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70"
            style={{ zIndex: 99999 }}
        >
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Building2 size={18} className="text-sky-600" />
                        SETTING {editTarget.targetTitle} ({editTarget.agen_id})
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveMapping} className="p-6 space-y-4 text-xs">
                    <div>
                        <label className="font-bold text-slate-500 block mb-1">NAMA CABANG / AGEN</label>
                        <input
                            type="text"
                            disabled
                            value={editTarget.agen_nama}
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="font-bold text-slate-700 block mb-1">
                            PILIH {editTarget.targetTitle}
                        </label>
                        {editTarget.target === 'I' ? (
                            <select
                                value={editTarget.code}
                                onChange={e => setEditTarget({ ...editTarget, code: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="">-- Kosongkan --</option>
                                {itemList.map(item => (
                                    <option key={item.item_id} value={item.item_id}>
                                        {item.item_name} ({item.item_id})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={editTarget.code}
                                onChange={e => setEditTarget({ ...editTarget, code: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="">-- Kosongkan --</option>
                                {coaList.map(coa => (
                                    <option key={coa.ca_id} value={coa.ca_id}>
                                        {coa.ca_name} ({coa.ca_id})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl uppercase cursor-pointer"
                        >
                            BATAL
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase shadow-md cursor-pointer"
                        >
                            SIMPAN MAPPING
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;

    // 🎯 Handler khusus untuk tombol aksi bawaan template
    const handleEditAction = (item) => {
        Swal.fire({
            title: 'INFO MAPPING',
            text: `Untuk mengatur akun ${item.agen_nama}, silakan klik tombol Edit di kolom Kode Piutang, Setoran, atau Pengeluaran.`,
            icon: 'info',
            confirmButtonColor: '#0284c7',
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        });
    };

    const handleDeleteMapping = (item) => {
        Swal.fire({
            title: 'Hapus Mapping COA?',
            text: `Apakah kamu yakin ingin mereset/menghapus semua mapping COA untuk ${item.agen_nama}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Reset!',
            cancelButtonText: 'Batal',
            didOpen: () => {
                // Memastikan Swal selalu paling depan dan bisa diklik
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '9999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Panggil Endpoint DELETE
                    await api.delete(`/gl/agen-ca/${item.agen_id}`);

                    Swal.fire({
                        title: 'BERHASIL!',
                        text: 'Mapping COA berhasil direset.',
                        icon: 'success',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });

                    // Reload data tabel
                    fetchAgenCA(stt);
                } catch (err) {
                    Swal.fire({
                        title: 'GAGAL!',
                        text: err.response?.data?.message || 'Gagal mereset mapping.',
                        icon: 'error',
                        didOpen: () => {
                            const container = document.querySelector('.swal2-container');
                            if (container) container.style.zIndex = '9999999';
                        }
                    });
                }
            }
        });
    };

    return (
        <div className="space-y-4">
            {/* Component Filter Radio Status di Atas Tabel */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-black uppercase text-slate-700">STATUS OPERASIONAL:</span>
                <div className="flex items-center gap-6 text-xs font-bold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="stt_status"
                            value="2"
                            checked={stt === '2'}
                            onChange={() => setStt('2')}
                            className="w-4 h-4 text-sky-600 cursor-pointer"
                        />
                        CABANG
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="stt_status"
                            value="3"
                            checked={stt === '3'}
                            onChange={() => setStt('3')}
                            className="w-4 h-4 text-sky-600 cursor-pointer"
                        />
                        AGEN
                    </label>
                </div>
            </div>

            {/* DataTableTemplate Standar */}
            <DataTableTemplate
                title="DAFTAR KODE AKUN PIUTANG & SETORAN CABANG / AGEN"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onEdit={handleEditAction}
                onDelete={handleDeleteMapping}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
        </div>
    );
};

export default DaftarAkunPiutangSetoran;
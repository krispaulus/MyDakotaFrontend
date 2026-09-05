import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Users, X, Filter, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const MasterKaryawan = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cabangList, setCabangList] = useState([]);
    const [divisiList, setDivisiList] = useState([]);
    const [jabatanList, setJabatanList] = useState([]);

    // State Toggle Filter Panel
    const [showFilter, setShowFilter] = useState(false);

    // State Filter Fields
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterCabang, setFilterCabang] = useState('ALL');
    const [filterDivisi, setFilterDivisi] = useState('ALL');
    const [filterJabatan, setFilterJabatan] = useState('ALL');
    const [filterKeyword, setFilterKeyword] = useState('');

    // Modal Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        kry_nip: '',
        kry_nama: '',
        kry_activeagenid: '',
        kry_ddbid: '',
        kry_jabcode: '',
        kry_telp1: '',
        kry_telp2: '',
        kry_imei1: '',
        kry_simcardid1: '',
        kry_aktifyn: 'Y'
    });

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resDivisi, resJabatan] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/hrd/divisi-options', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/hrd/jabatan-options', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setDivisiList(resDivisi.data?.data || []);
            setJabatanList(resJabatan.data?.data || []);
        } catch (err) {
            console.error('Gagal mengambil data referensi:', err);
        }
    };

    const fetchKaryawan = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/hrd/karyawan?';
            const params = [];

            if (filterKeyword.trim()) params.push(`search=${encodeURIComponent(filterKeyword.trim())}`);
            if (filterCabang !== 'ALL') params.push(`agen_id=${encodeURIComponent(filterCabang)}`);
            if (filterDivisi !== 'ALL') params.push(`div_code=${encodeURIComponent(filterDivisi)}`);
            if (filterStatus !== 'ALL') params.push(`aktif_yn=${encodeURIComponent(filterStatus)}`);

            url += params.join('&');

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            let resultData = res.data?.data || [];

            // Filter jabatan di level client jika ada
            if (filterJabatan !== 'ALL') {
                resultData = resultData.filter(item => String(item.jab_nama || '').toLowerCase() === filterJabatan.toLowerCase());
            }

            setData(resultData);
        } catch (err) {
            console.error('Gagal mengambil data karyawan:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchKaryawan();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchKaryawan();
    };

    const handleResetFilter = () => {
        setFilterStatus('ALL');
        setFilterCabang('ALL');
        setFilterDivisi('ALL');
        setFilterJabatan('ALL');
        setFilterKeyword('');
        setTimeout(() => {
            fetchKaryawan();
        }, 50);
    };

    const handleAdd = () => {
        setModalMode('ADD');
        setErrors({});
        setFormData({
            kry_nip: '',
            kry_nama: '',
            kry_activeagenid: '',
            kry_ddbid: '',
            kry_jabcode: '',
            kry_telp1: '',
            kry_telp2: '',
            kry_imei1: '',
            kry_simcardid1: '',
            kry_aktifyn: 'Y'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('EDIT');
        setErrors({});
        setFormData({
            kry_nip: item.kry_nip,
            kry_nama: item.kry_nama || '',
            kry_activeagenid: item.kry_activeagenid || '',
            kry_ddbid: item.kry_ddbid || '',
            kry_jabcode: item.kry_jabcode || '',
            kry_telp1: item.kry_telp1 || '',
            kry_telp2: item.kry_telp2 || '',
            kry_imei1: item.kry_imei1 || '',
            kry_simcardid1: item.kry_simcardid1 || '',
            kry_aktifyn: item.kry_aktifyn || 'Y'
        });
        setIsModalOpen(true);
    };

    const validateForm = () => {
        let errs = {};
        if (!formData.kry_nip.trim()) errs.kry_nip = 'NIP Karyawan wajib diisi!';
        if (!formData.kry_nama.trim()) errs.kry_nama = 'Nama Karyawan wajib diisi!';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            Swal.fire({
                title: 'FORM BELUM LENGKAP!',
                text: 'Harap lengkapi semua field bertanda (*)',
                icon: 'warning',
                confirmButtonColor: '#0284c7'
            });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.post('/hrd/karyawan/save', formData, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire({
                title: 'BERHASIL!',
                text: `Data karyawan ${formData.kry_nama} berhasil disimpan.`,
                icon: 'success',
                confirmButtonColor: '#0284c7'
            });
            setIsModalOpen(false);
            fetchKaryawan();
        } catch (err) {
            Swal.fire({
                title: 'GAGAL!',
                text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data karyawan.',
                icon: 'error',
                confirmButtonColor: '#e11d48'
            });
        }
    };

    const columns = [
        {
            header: 'NIP',
            accessor: 'kry_nip',
            render: (item) => (
                <span className="font-mono font-bold text-sky-600">
                    {item.kry_nip}
                </span>
            )
        },
        {
            header: 'NAMA KARYAWAN',
            accessor: 'kry_nama',
            render: (item) => (
                <span className="font-bold uppercase text-slate-800">
                    {item.kry_nama}
                </span>
            )
        },
        {
            header: 'LOKASI AGEN / CABANG',
            accessor: 'agen_nama',
            render: (item) => (
                <span className="font-bold uppercase text-slate-700">
                    {item.agen_nama || 'PUSAT'}
                </span>
            )
        },
        {
            header: 'JABATAN / DIVISI',
            accessor: 'jab_nama',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-800 block">
                        {item.jab_nama && item.jab_nama !== '-' ? item.jab_nama : '-'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                        {item.div_nama && item.div_nama !== '-' ? item.div_nama : '-'}
                    </span>
                </div>
            )
        },
        {
            header: 'KONTAK TELEPON',
            accessor: 'kry_telp1',
            render: (item) => (
                <div className="font-mono text-xs">
                    <span className="font-bold text-slate-800 block">
                        {item.kry_telp1 || '-'}
                    </span>
                    {item.kry_telp2 && (
                        <span className="text-slate-500 block text-[11px]">
                            {item.kry_telp2}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'KEY LOGIN (IMEI)',
            accessor: 'kry_imei1',
            render: (item) => item.kry_imei1 ? (
                <span className="font-mono font-bold text-xs bg-slate-800 text-white px-2 py-1 rounded">
                    {item.kry_imei1.length > 10 ? `${item.kry_imei1.substring(0, 10)}...` : item.kry_imei1}
                </span>
            ) : (
                <span className="font-mono text-slate-400 font-bold">-</span>
            )
        },
        {
            header: 'STATUS',
            accessor: 'status_badge',
            render: (item) => String(item.kry_aktifyn || '').toUpperCase() === 'Y' ? (
                <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider bg-[#dcfce7] text-[#15803d]">
                    ACTIVE
                </span>
            ) : (
                <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider bg-[#fee2e2] text-[#991b1b]">
                    INACTIVE
                </span>
            )
        }
    ];

    const modalElement = isModalOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70"
            style={{ zIndex: 99999, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
        >
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden transform transition-all ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-slate-800'}`}>

                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-sky-600" />
                        {modalMode === 'ADD' ? 'TAMBAH MASTER KARYAWAN' : `EDIT KARYAWAN (${formData.kry_nip})`}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Modal */}
                <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">NIP Karyawan <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                disabled={modalMode === 'EDIT'}
                                placeholder="MISAL: 0012023001"
                                value={formData.kry_nip}
                                onChange={e => {
                                    setFormData({ ...formData, kry_nip: e.target.value.toUpperCase() });
                                    if (errors.kry_nip) setErrors({ ...errors, kry_nip: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.kry_nip ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.kry_nip && <span className="text-[10px] text-rose-500 font-bold">{errors.kry_nip}</span>}
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Nama Lengkap <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="NAMA SESUAI IDENTITAS"
                                value={formData.kry_nama}
                                onChange={e => {
                                    setFormData({ ...formData, kry_nama: e.target.value.toUpperCase() });
                                    if (errors.kry_nama) setErrors({ ...errors, kry_nama: null });
                                }}
                                className={`w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 outline-none uppercase ${errors.kry_nama ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'}`}
                            />
                            {errors.kry_nama && <span className="text-[10px] text-rose-500 font-bold">{errors.kry_nama}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Lokasi Cabang / Agen</label>
                            <select
                                value={formData.kry_activeagenid}
                                onChange={e => setFormData({ ...formData, kry_activeagenid: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="">-- PILIH CABANG / AGEN --</option>
                                {cabangList.map((c, i) => (
                                    <option key={i} value={c.agen_id || c.AgenID}>
                                        {c.agen_nama || c.AgenNama}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Status Keaktifan</label>
                            <select
                                value={formData.kry_aktifyn}
                                onChange={e => setFormData({ ...formData, kry_aktifyn: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="Y">AKTIF</option>
                                <option value="N">NON-AKTIF / KELUAR</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Divisi</label>
                            <select
                                value={formData.kry_ddbid}
                                onChange={e => setFormData({ ...formData, kry_ddbid: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="">-- PILIH DIVISI --</option>
                                {divisiList.map((d, i) => (
                                    <option key={i} value={d.div_code}>{d.div_nama}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">Jabatan</label>
                            <select
                                value={formData.kry_jabcode}
                                onChange={e => setFormData({ ...formData, kry_jabcode: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            >
                                <option value="">-- PILIH JABATAN --</option>
                                {jabatanList.map((j, i) => (
                                    <option key={i} value={j.jab_code}>{j.jab_nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">No. Telepon 1</label>
                            <input
                                type="text"
                                placeholder="08xxxxxxxxxx"
                                value={formData.kry_telp1}
                                onChange={e => setFormData({ ...formData, kry_telp1: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold text-slate-600 block">No. Telepon 2</label>
                            <input
                                type="text"
                                placeholder="Nomor kontak alternatif"
                                value={formData.kry_telp2}
                                onChange={e => setFormData({ ...formData, kry_telp2: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 outline-none focus:border-sky-500"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                            KEAMANAN LOGIN PERANGKAT (DEVICE BINDING)
                        </span>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="font-bold text-slate-600 block">Key Login (IMEI 1)</label>
                                <input
                                    type="text"
                                    placeholder="Nomor IMEI HP Petugas"
                                    value={formData.kry_imei1}
                                    onChange={e => setFormData({ ...formData, kry_imei1: e.target.value })}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 outline-none focus:border-sky-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-600 block">Secure Code (SIM Serial)</label>
                                <input
                                    type="text"
                                    placeholder="Serial SIM Card Resmi"
                                    value={formData.kry_simcardid1}
                                    onChange={e => setFormData({ ...formData, kry_simcardid1: e.target.value })}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase cursor-pointer"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs uppercase shadow-md cursor-pointer"
                        >
                            {modalMode === 'ADD' ? 'SIMPAN KARYAWAN' : 'UPDATE KARYAWAN'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    ) : null;

    return (
        <div className="space-y-5 master-karyawan-wrapper">
            <style>
                {`
                .master-karyawan-wrapper table tbody tr td {
                    color: #0f172a !important;
                    font-weight: 600 !important;
                }
                .master-karyawan-wrapper table tbody tr td span.font-mono.text-sky-600 {
                    color: #0284c7 !important;
                }
                `}
            </style>

            {/* Panel Filter Toggle */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                        <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                            <Filter size={16} className="text-sky-600" />
                            FILTER PENCARIAN DATA KARYAWAN
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Status Karyawan */}
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">STATUS KARYAWAN</label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            >
                                <option value="ALL">-- SEMUA STATUS --</option>
                                <option value="Y">ACTIVE (AKTIF)</option>
                                <option value="N">INACTIVE (NON-AKTIF)</option>
                            </select>
                        </div>

                        {/* Cabang / Agen */}
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">CABANG / AGEN</label>
                            <select
                                value={filterCabang}
                                onChange={e => setFilterCabang(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            >
                                <option value="ALL">-- SEMUA CABANG --</option>
                                {cabangList.map((c, i) => (
                                    <option key={i} value={c.agen_id || c.AgenID}>
                                        {c.agen_nama || c.AgenNama}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Divisi */}
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">DIVISI</label>
                            <select
                                value={filterDivisi}
                                onChange={e => setFilterDivisi(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            >
                                <option value="ALL">-- SEMUA DIVISI --</option>
                                {divisiList.map((d, i) => (
                                    <option key={i} value={d.div_code}>{d.div_nama}</option>
                                ))}
                            </select>
                        </div>

                        {/* Jabatan */}
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">JABATAN</label>
                            <select
                                value={filterJabatan}
                                onChange={e => setFilterJabatan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            >
                                <option value="ALL">-- SEMUA JABATAN --</option>
                                {jabatanList.map((j, i) => (
                                    <option key={i} value={j.jab_nama}>{j.jab_nama}</option>
                                ))}
                            </select>
                        </div>

                        {/* Keyword Pencarian */}
                        <div>
                            <label className="font-bold text-slate-600 block mb-1">NIP / NAMA / TELEPON</label>
                            <input
                                type="text"
                                placeholder="Cari NIP, nama, telp..."
                                value={filterKeyword}
                                onChange={e => setFilterKeyword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Tombol Aksi Filter */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer text-xs"
                        >
                            RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            <DataTableTemplate
                title="MASTER DATA KARYAWAN & KURIR AGEN"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onFilter={() => setShowFilter(prev => !prev)}
            />

            {modalElement && ReactDOM.createPortal(modalElement, document.body)}
        </div>
    );
};

export default MasterKaryawan;
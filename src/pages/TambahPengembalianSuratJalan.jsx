import React, { useState, useEffect } from 'react';
import {
    Calendar, User, FileText, MapPin, Layers,
    Save, CheckSquare, Square, RefreshCw, Info, X
} from 'lucide-react';
import api from '../api/axios';
import Swal from 'sweetalert2';

const TambahPengembalianSuratJalan = ({ isDarkMode = false, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [loadingSJ, setLoadingSJ] = useState(false);

    const [customerList, setCustomerList] = useState([]);
    const [suratJalanList, setSuratJalanList] = useState([]);
    const [tampilkanSJ, setTampilkanSJ] = useState(false);
    const [selectedSJ, setSelectedSJ] = useState([]);

    const [formData, setFormData] = useState({
        tanggal_pengembalian: new Date().toISOString().split('T')[0],
        pengirim: localStorage.getItem('active_agen_id') || 'PUSAT DAKOTA',
        keterangan: '',
        customer_id: ''
    });

    useEffect(() => {
        const fetchMasterCustomer = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await api.get('/customer', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.status === "success") {
                    setCustomerList(response.data.data || []);
                }
            } catch (err) {
                console.error("Gagal memuat master customer:", err);
            }
        };
        fetchMasterCustomer();
    }, []);

    const handleToggleTampilkanSJ = async () => {
        if (!formData.customer_id) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Silakan pilih Customer/Pelanggan terlebih dahulu!',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        const newStatus = !tampilkanSJ;
        setTampilkanSJ(newStatus);

        if (newStatus) {
            setLoadingSJ(true);
            try {
                const token = localStorage.getItem('token');
                const response = await api.get(`/marketing/outstanding-sj/${formData.customer_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data && response.data.status === "success") {
                    setSuratJalanList(response.data.data || []);
                }
            } catch (err) {
                console.error("Gagal menarik daftar surat jalan outstanding:", err);
                setSuratJalanList([]);
            } finally {
                setLoadingSJ(false);
            }
        } else {
            setSuratJalanList([]);
            setSelectedSJ([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'customer_id') {
            setTampilkanSJ(false);
            setSuratJalanList([]);
            setSelectedSJ([]);
        }
    };

    const handleSelectSJ = (noSJ) => {
        setSelectedSJ(prev =>
            prev.includes(noSJ) ? prev.filter(id => id !== noSJ) : [...prev, noSJ]
        );
    };

    const handleSimpanForm = async (e) => {
        e.preventDefault();
        if (!formData.customer_id) {
            Swal.fire({
                icon: 'warning',
                title: 'Customer Kosong',
                text: 'Silakan pilih Customer terlebih dahulu!',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }
        if (selectedSJ.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Surat Jalan Belum Dipilih',
                text: 'Silakan centang minimal satu Nomor Surat Jalan yang dikembalikan!',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                daftar_nosj: selectedSJ
            };

            const response = await api.post('/marketing/kembali-sj/add', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.status === "success") {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Disimpan!',
                    text: response.data.message || 'Data Pengembalian Surat Jalan berhasil dibuat.',
                    confirmButtonColor: '#10b981'
                }).then(() => {
                    onClose();
                });
            }
        } catch (err) {
            console.error("Gagal menyimpan data pengembalian:", err);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: err.response?.data?.message || err.message || 'Terjadi kesalahan sistem saat menyimpan data',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 text-slate-800">
            {/* Header Pop-up */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                    <h1 className="text-xl font-black tracking-wider uppercase text-emerald-600">
                        Tambah Data Pengembalian Surat Jalan Customer
                    </h1>
                    <p className="text-xs text-slate-400 font-medium">
                        Pembuatan manifes serah terima berkas dokumen loper balik kargo
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer"
                >
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSimpanForm} className="space-y-6">
                {/* BLOK 1: FORM HEADER */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2.5 mb-4 flex items-center gap-2">
                        <FileText size={14} />
                        <span>Pembuatan Pengembalian Surat Jalan</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 text-xs font-bold">
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5">
                                <Calendar size={12} className="inline mr-1" /> Tanggal Pengembalian
                            </label>
                            <input
                                type="date"
                                name="tanggal_pengembalian"
                                value={formData.tanggal_pengembalian}
                                onChange={handleInputChange}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5">
                                <MapPin size={12} className="inline mr-1" /> Pengirim
                            </label>
                            <input
                                type="text"
                                name="pengirim"
                                value={formData.pengirim}
                                className="w-full h-11 px-3 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl outline-none cursor-not-allowed uppercase font-black"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5">
                                <FileText size={12} className="inline mr-1" /> Keterangan Memo
                            </label>
                            <input
                                type="text"
                                name="keterangan"
                                value={formData.keterangan}
                                onChange={handleInputChange}
                                placeholder="Masukkan catatan keterangan..."
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-slate-500 uppercase block mb-1.5">
                                <User size={12} className="inline mr-1" /> Customer / Pelanggan
                            </label>
                            <select
                                name="customer_id"
                                value={formData.customer_id}
                                onChange={handleInputChange}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 font-bold bg-white"
                                required
                            >
                                <option value="">-- PILIH PT / CUSTOMER --</option>
                                {customerList.map((cust) => (
                                    <option key={cust.cust_id} value={cust.cust_id}>
                                        {cust.cust_name.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* BLOK 2: CHECKLIST SURAT JALAN */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2.5 mb-4 flex items-center gap-2">
                        <Layers size={14} />
                        <span>Daftar Nomor Surat Jalan</span>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pilihan Surat Jalan:</span>
                        <button
                            type="button"
                            onClick={handleToggleTampilkanSJ}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${tampilkanSJ
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            {tampilkanSJ ? <CheckSquare size={14} /> : <Square size={14} />}
                            Tampilkan SURAT JALAN
                        </button>
                    </div>

                    {tampilkanSJ && (
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner bg-white max-h-72 overflow-y-auto">
                            {loadingSJ ? (
                                <div className="p-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                                    <RefreshCw className="animate-spin text-indigo-600" size={16} />
                                    <span>Menarik daftar resi...</span>
                                </div>
                            ) : suratJalanList.length === 0 ? (
                                <div className="p-8 text-center text-xs font-medium text-slate-400 flex items-center justify-center gap-2">
                                    <Info size={16} className="text-amber-500" />
                                    <span>Tidak ada nomor surat jalan outstanding untuk customer ini!</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="p-3.5 w-12 text-center">Pilih</th>
                                            <th className="p-3.5">No. Surat Jalan / Resi BTT</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {suratJalanList.map((sj, index) => (
                                            <tr
                                                key={index}
                                                onClick={() => handleSelectSJ(sj.mkt_t_kembalisj_nosj)}
                                                className={`hover:bg-slate-50/70 cursor-pointer transition-all ${selectedSJ.includes(sj.mkt_t_kembalisj_nosj) ? 'bg-indigo-50/40' : ''
                                                    }`}
                                            >
                                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSJ.includes(sj.mkt_t_kembalisj_nosj)}
                                                        onChange={() => handleSelectSJ(sj.mkt_t_kembalisj_nosj)}
                                                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 font-mono font-bold text-slate-700">
                                                    {sj.mkt_t_kembalisj_nosj}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

                {/* BLOK 3: FOOTER ACTIONS */}
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 h-11 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md transition-all text-xs uppercase tracking-wider cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl shadow-md transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                        {loading ? 'Menyimpan...' : `Simpan Data (${selectedSJ.length} SJ)`}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TambahPengembalianSuratJalan;
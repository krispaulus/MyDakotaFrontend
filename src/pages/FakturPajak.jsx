import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { FileText, Save, RefreshCw, Hash } from 'lucide-react';
import Swal from 'sweetalert2';

const FakturPajak = () => {
    const { isDarkMode } = useDarkMode();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [usageList, setUsageList] = useState([]);

    const [form, setForm] = useState({
        kdhead: '',
        kdstart: '',
        kdend: '',
        last_update_id: '',
        last_update_time: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/faktur-pajak?pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.data) {
                setForm({
                    kdhead: res.data.data.fakturno_head || '',
                    kdstart: res.data.data.fakturno_start || '',
                    kdend: res.data.data.fakturno_end || '',
                    last_update_id: res.data.data.fakturno_updateid || '-',
                    last_update_time: res.data.data.fakturno_updatetime ? String(res.data.data.fakturno_updatetime).replace('T', ' ').substring(0, 19) : '-'
                });
            }
            setUsageList(res.data?.usage_list || []);
        } catch (err) {
            console.error("Gagal load konfigurasi faktur pajak:", err);
            Swal.fire({ title: 'Error', text: 'Gagal mengambil konfigurasi faktur pajak.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleNumberOnlyChange = (field, value) => {
        const cleanVal = value.replace(/[^0-9]/g, '');
        setForm(prev => ({ ...prev, [field]: cleanVal }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.kdhead.trim() || !form.kdstart.trim() || !form.kdend.trim()) {
            Swal.fire({ title: 'Validasi', text: 'Header Kode, Kode Start, dan Kode End wajib diisi.', icon: 'warning' });
            return;
        }

        if (parseInt(form.kdstart, 10) > parseInt(form.kdend, 10)) {
            Swal.fire({ title: 'Validasi', text: 'Kode Start tidak boleh lebih besar dari Kode End.', icon: 'warning' });
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                kdhead: form.kdhead.trim(),
                kdstart: form.kdstart.trim(),
                kdend: form.kdend.trim()
            };

            const res = await api.post(`/piutang/faktur-pajak/update?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({ title: 'BERHASIL!', text: res.data?.message || 'Data berhasil disimpan.', icon: 'success' });
            fetchData();
        } catch (err) {
            Swal.fire({ title: 'GAGAL!', text: err.response?.data?.message || 'Gagal menyimpan perubahan.', icon: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            header: 'NO. FAKTUR PAJAK',
            accessor: 'faktur_pajak',
            render: (item) => <span className="font-mono font-bold text-sky-600">{item.faktur_pajak}</span>
        },
        {
            header: 'NO. INVOICE',
            accessor: 'no_invoice',
            render: (item) => <span className="font-mono font-bold text-slate-800">{item.no_invoice}</span>
        },
        {
            header: 'TANGGAL',
            accessor: 'tgl_invoice',
            render: (item) => <span className="font-mono text-slate-600">{String(item.tgl_invoice || '').split('T')[0]}</span>
        },
        {
            header: 'CUSTOMER',
            accessor: 'cust_name',
            render: (item) => <span className="font-bold text-slate-700">{item.cust_name}</span>
        },
        {
            header: 'TOTAL TAGIHAN',
            accessor: 'total_tagihan',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}</span>
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Form Konfigurasi NSFP */}
            <div className={`p-8 rounded-2xl border shadow-sm transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                <div className={`flex items-center justify-between border-b pb-5 mb-6 ${isDarkMode ? 'border-gray-700' : 'border-slate-100'
                    }`}>
                    <div className="flex items-center gap-3.5">
                        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-sky-950 text-sky-400' : 'bg-sky-50 text-sky-600'
                            }`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h1 className="text-base font-black uppercase tracking-wider">
                                FAKTUR PAJAK BERJALAN
                            </h1>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'
                                }`}>
                                Pengaturan rentang Nomor Seri Faktur Pajak (NSFP) resmi DJP untuk modul penagihan invoice.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className={`p-2.5 rounded-xl transition cursor-pointer ${isDarkMode ? 'text-gray-400 hover:text-sky-400 hover:bg-gray-700' : 'text-slate-500 hover:text-sky-600 hover:bg-slate-100'
                            }`}
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className={`p-6 border rounded-2xl space-y-5 ${isDarkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-slate-50/80 border-slate-200'
                        }`}>
                        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider border-b pb-3 ${isDarkMode ? 'text-sky-400 border-gray-700' : 'text-slate-700 border-slate-200'
                            }`}>
                            <Hash size={16} className="text-sky-600" />
                            PARAMETER NOMOR SERI FAKTUR PAJAK (NSFP)
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                                    }`}>
                                    HEADER KODE :
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 010.1111"
                                    value={form.kdhead}
                                    onChange={(e) => setForm({ ...form, kdhead: e.target.value })}
                                    className={`w-full p-2.5 border rounded-xl font-bold font-mono text-sm outline-none transition focus:border-sky-500 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-800'
                                        }`}
                                />
                                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>
                                    Kode jenis transaksi & cabang DJP
                                </span>
                            </div>

                            <div>
                                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                                    }`}>
                                    KODE START (AWAL) :
                                </label>
                                <input
                                    type="text"
                                    placeholder="00000001"
                                    value={form.kdstart}
                                    onChange={(e) => handleNumberOnlyChange('kdstart', e.target.value)}
                                    className={`w-full p-2.5 border rounded-xl font-bold font-mono text-sm outline-none transition focus:border-sky-500 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-sky-400' : 'bg-white border-slate-300 text-sky-700'
                                        }`}
                                />
                                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>
                                    Batas nomor seri awal (hanya angka)
                                </span>
                            </div>

                            <div>
                                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                                    }`}>
                                    KODE END (AKHIR) :
                                </label>
                                <input
                                    type="text"
                                    placeholder="00010000"
                                    value={form.kdend}
                                    onChange={(e) => handleNumberOnlyChange('kdend', e.target.value)}
                                    className={`w-full p-2.5 border rounded-xl font-bold font-mono text-sm outline-none transition focus:border-rose-500 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-rose-400' : 'bg-white border-slate-300 text-rose-600'
                                        }`}
                                />
                                <span className={`text-[11px] mt-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>
                                    Batas alokasi kuota akhir
                                </span>
                            </div>
                        </div>

                        <div className={`p-4 border rounded-xl space-y-1.5 ${isDarkMode ? 'bg-sky-950/40 border-sky-800/60' : 'bg-sky-50 border-sky-200'
                            }`}>
                            <span className={`text-[11px] font-bold block uppercase tracking-wider ${isDarkMode ? 'text-sky-300' : 'text-sky-800'
                                }`}>
                                PREVIEW RENTANG NOMOR FAKTUR PAJAK:
                            </span>
                            <div className={`font-mono font-black text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}>
                                <span className="text-sky-600 dark:text-sky-400">{form.kdhead}{form.kdstart}</span>
                                <span className="text-slate-400">s/d</span>
                                <span className="text-rose-600 dark:text-rose-400">{form.kdhead}{form.kdend}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`flex justify-between items-center text-[11px] px-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'
                        }`}>
                        <div>Terakhir diubah oleh: <strong className={isDarkMode ? 'text-gray-200' : 'text-slate-700'}>{form.last_update_id}</strong></div>
                        <div>Waktu update: <strong className={isDarkMode ? 'text-gray-200' : 'text-slate-700'}>{form.last_update_time}</strong></div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={fetchData}
                            className={`px-6 py-2.5 border font-bold rounded-xl text-xs uppercase transition cursor-pointer ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            BATAL
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs uppercase transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Save size={16} />
                            {submitting ? 'MENYIMPAN...' : 'UPDATE KONFIGURASI'}
                        </button>
                    </div>
                </form>
            </div>

            {/* TABEL PENGGUNAAN FAKTUR PAJAK DENGAN PAGINATION & SEARCH */}
            <DataTableTemplate
                title="DAFTAR PENGGUNAAN FAKTUR PAJAK PADA INVOICE"
                columns={columns}
                data={usageList}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={true}
                hideAddButton={true}
                showAction={false}
                hideActions={true}
                hideActionColumn={true}
                onEdit={null}
                onDelete={null}
            />
        </div>
    );
};

export default FakturPajak;
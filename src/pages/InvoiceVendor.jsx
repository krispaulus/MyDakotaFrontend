import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RotateCcw, Search, Building2, Users } from 'lucide-react';
import Swal from 'sweetalert2';

const InvoiceVendor = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    const [agens, setAgens] = useState([]);
    const [vendors, setVendors] = useState([]);

    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [filterState, setFilterState] = useState({
        useTanggal: true,
        startDate: firstDayMonth,
        endDate: todayStr,
        cabang: 'ALL',
        vendorName: '',
        noInvoice: '',
        noKW: '',
        postingYN: 'ALL'
    });

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const [resAgen, resVend] = await Promise.all([
                api.get(`/agens?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
                api.get(`/master/vendor?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => api.get(`/master/vendor/list?pt_id=${ptId}`, { headers: { Authorization: `Bearer ${token}` } }))
                    .catch(() => ({ data: { data: [] } }))
            ]);

            setAgens(resAgen.data?.data || []);
            setVendors(resVend.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi filter:", err);
        }
    };

    const fetchInvoiceVendor = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = { pt_id: ptId };
            if (filterState.useTanggal) {
                params.start_date = filterState.startDate;
                params.end_date = filterState.endDate;
            }
            if (filterState.cabang && filterState.cabang !== 'ALL') {
                params.cabang = filterState.cabang;
            }
            if (filterState.vendorName.trim()) {
                params.vendor_name = filterState.vendorName.trim();
            }
            if (filterState.noInvoice.trim()) {
                params.no_invoice = filterState.noInvoice.trim();
            }
            if (filterState.noKW.trim()) {
                params.no_kw = filterState.noKW.trim();
            }
            if (filterState.postingYN !== 'ALL') {
                params.posting_yn = filterState.postingYN;
            }

            const res = await api.get('/hutang/invoice-vendor/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data invoice vendor:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchInvoiceVendor();
    }, []);

    const handleResetFilter = () => {
        setFilterState({
            useTanggal: true,
            startDate: firstDayMonth,
            endDate: todayStr,
            cabang: 'ALL',
            vendorName: '',
            noInvoice: '',
            noKW: '',
            postingYN: 'ALL'
        });
    };

    const handleFormSubmit = async (item = null) => {
        const isEdit = Boolean(item);
        const token = localStorage.getItem('token');
        const ptId = localStorage.getItem('pt_id') || 'C';

        const vendorOptionsHtml = vendors.map(v =>
            `<option value="${v.vend_id}" data-name="${v.vend_name}" ${item?.vend_id === v.vend_id ? 'selected' : ''}>${v.vend_name} [${v.vend_id}]</option>`
        ).join('');

        const { value: formValues } = await Swal.fire({
            title: isEdit ? 'Edit Invoice Vendor' : 'Tambah Invoice Vendor',
            width: '600px',
            html: `
                <div style="text-align: left; font-size: 13px; font-weight: bold; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display:block; margin-bottom: 4px;">Nomor Invoice :</label>
                            <input id="swal-inv" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px; font-family: monospace; font-weight: bold;" value="${isEdit ? item.invoice_id : ''}" placeholder="No. Invoice Vendor" ${isEdit ? 'disabled' : ''} />
                        </div>
                        <div>
                            <label style="display:block; margin-bottom: 4px;">Tanggal Invoice :</label>
                            <input id="swal-tgl" type="date" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.tgl_invoice : todayStr}" />
                        </div>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom: 4px;">Vendor Rekanan :</label>
                        <select id="swal-vendor" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;">
                            <option value="">-- PILIH VENDOR --</option>
                            ${vendorOptionsHtml}
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display:block; margin-bottom: 4px;">DPP (Rp) :</label>
                            <input id="swal-dpp" type="number" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px; font-weight: bold;" value="${isEdit ? item.total_dpp : 0}" />
                        </div>
                        <div>
                            <label style="display:block; margin-bottom: 4px;">PPH (%) :</label>
                            <input id="swal-pph" type="number" step="0.1" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.pph_rate : 0}" />
                        </div>
                        <div>
                            <label style="display:block; margin-bottom: 4px;">PPN (%) :</label>
                            <input id="swal-ppn" type="number" step="0.1" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.ppn_rate : 0}" />
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display:block; margin-bottom: 4px;">No. Kwitansi :</label>
                            <input id="swal-nokw" type="text" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.no_kw : ''}" placeholder="No. Kwitansi" />
                        </div>
                        <div>
                            <label style="display:block; margin-bottom: 4px;">Faktur Pajak :</label>
                            <input id="swal-fkt" type="text" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.fkt_pajak : ''}" placeholder="No. Faktur Pajak" />
                        </div>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom: 4px;">Keterangan :</label>
                        <input id="swal-ket" type="text" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.keterangan : ''}" placeholder="Catatan tagihan vendor..." />
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Simpan Invoice',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const invEl = document.getElementById('swal-inv');
                const tglEl = document.getElementById('swal-tgl');
                const vendEl = document.getElementById('swal-vendor');
                const dppEl = document.getElementById('swal-dpp');
                const pphEl = document.getElementById('swal-pph');
                const ppnEl = document.getElementById('swal-ppn');
                const nokwEl = document.getElementById('swal-nokw');
                const fktEl = document.getElementById('swal-fkt');
                const ketEl = document.getElementById('swal-ket');

                if (!invEl.value.trim()) {
                    Swal.showValidationMessage('Nomor Invoice wajib diisi');
                    return false;
                }
                if (!vendEl.value) {
                    Swal.showValidationMessage('Vendor wajib dipilih');
                    return false;
                }

                const selectedOption = vendEl.options[vendEl.selectedIndex];
                const vendName = selectedOption.getAttribute('data-name') || '';

                return {
                    invoice_id: invEl.value.trim(),
                    tanggal: tglEl.value,
                    vend_id: vendEl.value,
                    vend_name: vendName,
                    total_dpp: parseFloat(dppEl.value) || 0,
                    pph_rate: parseFloat(pphEl.value) || 0,
                    ppn_rate: parseFloat(ppnEl.value) || 0,
                    no_kw: nokwEl.value.trim(),
                    fkt_pajak: fktEl.value.trim(),
                    keterangan: ketEl.value.trim(),
                    is_edit: isEdit
                };
            }
        });

        if (formValues) {
            try {
                await api.post('/hutang/invoice-vendor/save', {
                    pt_id: ptId,
                    ...formValues
                }, { headers: { Authorization: `Bearer ${token}` } });

                Swal.fire('Sukses', 'Data Invoice Vendor berhasil disimpan', 'success');
                fetchInvoiceVendor();
            } catch (err) {
                console.error("Gagal simpan invoice vendor:", err);
                Swal.fire('Error', err.response?.data?.message || 'Gagal menyimpan invoice vendor', 'error');
            }
        }
    };

    const handleDelete = async (item) => {
        const confirm = await Swal.fire({
            title: 'Batalkan Invoice Vendor?',
            html: `Apakah Anda yakin ingin membatalkan invoice vendor <b>${item.invoice_id}</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Ya, Batalkan!'
        });

        if (confirm.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';
                await api.delete('/hutang/invoice-vendor/delete', {
                    params: { pt_id: ptId, invoice_id: item.invoice_id },
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Dibatalkan', 'Invoice Vendor berhasil dibatalkan', 'success');
                fetchInvoiceVendor();
            } catch (err) {
                console.error("Gagal batalkan invoice vendor:", err);
                Swal.fire('Error', 'Gagal membatalkan invoice vendor', 'error');
            }
        }
    };

    const columns = [
        {
            header: 'NO. INVOICE',
            accessor: 'invoice_id',
            render: (item) => (
                <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">
                    {item.invoice_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'tgl_invoice',
            render: (item) => (
                <span className="font-mono text-xs">{item.tgl_invoice || '-'}</span>
            )
        },
        {
            header: 'NAMA VENDOR',
            accessor: 'vend_name',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-bold text-xs">{item.vend_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">{item.vend_id}</span>
                </div>
            )
        },
        {
            header: 'TOTAL (DPP)',
            accessor: 'total_dpp',
            render: (item) => (
                <span className="font-mono font-bold text-xs">
                    Rp {Number(item.total_dpp || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'PPH',
            accessor: 'pph_rate',
            render: (item) => (
                <span className="font-mono text-xs">{Number(item.pph_rate || 0).toFixed(2)}%</span>
            )
        },
        {
            header: 'PPN',
            accessor: 'ppn_rate',
            render: (item) => (
                <span className="font-mono text-xs">{Number(item.ppn_rate || 0).toFixed(2)}%</span>
            )
        },
        {
            header: 'TOTAL TAGIHAN',
            accessor: 'total_tagihan',
            render: (item) => (
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                    Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'TERBAYAR',
            accessor: 'total_bayar',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                    Rp {Number(item.total_bayar || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'STATUS',
            accessor: 'delete_yn',
            render: (item) => {
                if (item.delete_yn === 'Y') {
                    return <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded">BATAL</span>;
                }
                if (item.posting_yn === 'Y') {
                    return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded">POSTING</span>;
                }
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">DRAFT</span>;
            }
        },
        {
            header: 'NO. KWITANSI',
            accessor: 'no_kw',
            render: (item) => (
                <span className="font-mono text-xs">{item.no_kw || '-'}</span>
            )
        },
        {
            header: 'NO. JURNAL',
            accessor: 'no_jurnal',
            render: (item) => (
                <span className="font-mono text-xs text-purple-600 dark:text-purple-400">{item.no_jurnal || '-'}</span>
            )
        }
    ];

    return (
        <div className="space-y-3">
            {/* PANEL FILTER EXPANDABLE */}
            {showFilter && (
                <div className={`p-5 rounded-2xl border shadow-sm transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}>
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-gray-700 mb-4">
                        <Filter size={18} className="text-blue-600" />
                        <h3 className="text-xs font-black uppercase tracking-wider">
                            Filter Parameter Invoice Vendor
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                        {/* 1. Filter Rentang Tanggal */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={filterState.useTanggal}
                                    onChange={(e) => setFilterState(p => ({ ...p, useTanggal: e.target.checked }))}
                                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                />
                                <span>TANGGAL INVOICE</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    disabled={!filterState.useTanggal}
                                    value={filterState.startDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, startDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-xl font-mono outline-none ${!filterState.useTanggal ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-gray-700' : ''
                                        } ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                />
                                <input
                                    type="date"
                                    disabled={!filterState.useTanggal}
                                    value={filterState.endDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, endDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-xl font-mono outline-none ${!filterState.useTanggal ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-gray-700' : ''
                                        } ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                />
                            </div>
                        </div>

                        {/* 2. Filter Cabang */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5">
                                <Building2 size={14} className="text-slate-400" />
                                <span>CABANG / AGEN</span>
                            </label>
                            <select
                                value={filterState.cabang}
                                onChange={(e) => setFilterState(p => ({ ...p, cabang: e.target.value }))}
                                className={`w-full p-2 border rounded-xl outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            >
                                <option value="ALL">-- SEMUA CABANG --</option>
                                {agens.map(a => (
                                    <option key={a.agen_id} value={a.agen_id}>{a.agen_nama}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Filter Posting */}
                        <div className="space-y-1.5">
                            <label>STATUS POSTING</label>
                            <select
                                value={filterState.postingYN}
                                onChange={(e) => setFilterState(p => ({ ...p, postingYN: e.target.value }))}
                                className={`w-full p-2 border rounded-xl outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            >
                                <option value="ALL">-- SEMUA STATUS --</option>
                                <option value="Y">POSTING (Y)</option>
                                <option value="N">BELUM POSTING (N)</option>
                            </select>
                        </div>

                        {/* 4. Filter No. Invoice */}
                        <div className="space-y-1.5">
                            <label>NO. INVOICE</label>
                            <input
                                type="text"
                                placeholder="Ketik No. Invoice..."
                                value={filterState.noInvoice}
                                onChange={(e) => setFilterState(p => ({ ...p, noInvoice: e.target.value }))}
                                className={`w-full p-2 border rounded-xl font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            />
                        </div>

                        {/* 5. Filter No. Kwitansi */}
                        <div className="space-y-1.5">
                            <label>NO. KWITANSI</label>
                            <input
                                type="text"
                                placeholder="Ketik No. Kwitansi..."
                                value={filterState.noKW}
                                onChange={(e) => setFilterState(p => ({ ...p, noKW: e.target.value }))}
                                className={`w-full p-2 border rounded-xl font-mono outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            />
                        </div>

                        {/* 6. Filter Nama Vendor */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="flex items-center gap-1.5">
                                <Users size={14} className="text-slate-400" />
                                <span>NAMA VENDOR</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Cari nama vendor..."
                                value={filterState.vendorName}
                                onChange={(e) => setFilterState(p => ({ ...p, vendorName: e.target.value }))}
                                className={`w-full p-2 border rounded-xl outline-none ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Tombol Action Filter */}
                    <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                            <RotateCcw size={14} /> Reset Filter
                        </button>
                        <button
                            type="button"
                            onClick={fetchInvoiceVendor}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            <Search size={14} /> Terapkan Filter
                        </button>
                    </div>
                </div>
            )}

            {/* TABEL DATA INVOICE VENDOR */}
            <DataTableTemplate
                title="INVOICE VENDOR"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                onAdd={() => handleFormSubmit(null)}
                onEdit={(item) => handleFormSubmit(item)}
                onDelete={handleDelete}
                onFilter={() => setShowFilter((prev) => !prev)}
            />
        </div>
    );
};

export default InvoiceVendor;
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RotateCcw, Search } from 'lucide-react';
import Swal from 'sweetalert2';

const TukarFaktur = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];
    const [filterState, setFilterState] = useState({
        useTanggal: false,
        startDate: todayStr,
        endDate: todayStr,
        useNoInvoice: false,
        noInvoice: '',
        useNoKW: false,
        noKW: ''
    });

    const fetchTukarFaktur = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const params = { pt_id: ptId };
            if (filterState.useTanggal) {
                params.start_date = filterState.startDate;
                params.end_date = filterState.endDate;
            }
            if (filterState.useNoInvoice && filterState.noInvoice.trim()) {
                params.no_invoice = filterState.noInvoice.trim();
            }
            if (filterState.useNoKW && filterState.noKW.trim()) {
                params.no_kw = filterState.noKW.trim();
            }

            const res = await api.get('/piutang/tukar-faktur/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal tarik data tukar faktur:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTukarFaktur();
    }, []);

    const handleResetFilter = () => {
        setFilterState({
            useTanggal: false,
            startDate: todayStr,
            endDate: todayStr,
            useNoInvoice: false,
            noInvoice: '',
            useNoKW: false,
            noKW: ''
        });
    };

    const handleFormSubmit = async (item = null) => {
        const isEdit = Boolean(item);
        const token = localStorage.getItem('token');
        const ptId = localStorage.getItem('pt_id') || 'C';

        let invoiceOptionsHtml = '';
        if (!isEdit) {
            try {
                const resInv = await api.get('/piutang/tukar-faktur/available-invoices', {
                    params: { pt_id: ptId },
                    headers: { Authorization: `Bearer ${token}` }
                });
                const invoices = resInv.data?.data || [];
                invoiceOptionsHtml = invoices.map(inv =>
                    `<option value="${inv.invoice_no}">${inv.invoice_no} - ${inv.cust_name} (Rp ${Number(inv.total_tagihan || 0).toLocaleString('id-ID')})</option>`
                ).join('');
            } catch (err) {
                console.error("Gagal ambil invoice:", err);
            }
        }

        const { value: formValues } = await Swal.fire({
            title: isEdit ? 'Edit Tukar Faktur' : 'Tambah Tukar Faktur',
            html: `
                <div style="text-align: left; font-size: 13px; font-weight: bold; display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Nomor Invoice :</label>
                        ${isEdit ?
                    `<input id="swal-inv" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px; font-family: monospace; font-weight: bold;" value="${item.invoice_no}" disabled />` :
                    `<select id="swal-inv" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px; font-family: monospace; font-weight: bold;">
                                <option value="">-- PILIH NO. INVOICE --</option>
                                ${invoiceOptionsHtml}
                             </select>`
                }
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Tanggal Tukar Faktur :</label>
                        <input id="swal-tgltukar" type="date" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? (item.tgl_tukar || todayStr) : todayStr}" />
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Nama Penerima (PIC Pelanggan) :</label>
                        <input id="swal-penerima" type="text" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? item.penerima : ''}" placeholder="Nama PIC Stempel / Penerima" />
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Tanggal Jatuh Tempo :</label>
                        <input id="swal-tgljt" type="date" class="swal2-input" style="margin: 0; width: 100%; height: 38px; font-size: 13px;" value="${isEdit ? (item.tgl_jt || '') : ''}" />
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Simpan Data',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const invoice_no = isEdit ? item.invoice_no : document.getElementById('swal-inv').value;
                const tgl_tukar = document.getElementById('swal-tgltukar').value;
                const penerima = document.getElementById('swal-penerima').value;
                const tgl_jt = document.getElementById('swal-tgljt').value;

                if (!invoice_no) {
                    Swal.showValidationMessage('Nomor Invoice wajib dipilih');
                    return false;
                }
                if (!penerima) {
                    Swal.showValidationMessage('Nama penerima wajib diisi');
                    return false;
                }

                return {
                    invoice_no,
                    tgl_tukar,
                    penerima: penerima.toUpperCase(),
                    tgl_jt: tgl_jt || ''
                };
            }
        });

        if (formValues) {
            try {
                await api.post('/piutang/tukar-faktur/save', {
                    pt_id: ptId,
                    ...formValues
                }, { headers: { Authorization: `Bearer ${token}` } });

                Swal.fire('Sukses', 'Data Tukar Faktur berhasil disimpan', 'success');
                fetchTukarFaktur();
            } catch (err) {
                console.error("Gagal simpan tukar faktur:", err);
                Swal.fire('Error', 'Gagal menyimpan transaksi tukar faktur', 'error');
            }
        }
    };

    const handleDelete = async (item) => {
        const confirm = await Swal.fire({
            title: 'Hapus Tukar Faktur?',
            html: `Apakah Anda yakin ingin membatalkan status Tukar Faktur untuk invoice <b>${item.invoice_no}</b>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (confirm.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const ptId = localStorage.getItem('pt_id') || 'C';
                await api.delete('/piutang/tukar-faktur/delete', {
                    params: { pt_id: ptId, invoice_no: item.invoice_no },
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Terhapus', 'Status Tukar Faktur berhasil dihapus', 'success');
                fetchTukarFaktur();
            } catch (err) {
                console.error("Gagal hapus:", err);
                Swal.fire('Error', 'Gagal menghapus status tukar faktur', 'error');
            }
        }
    };

    const columns = [
        {
            header: 'NO. INVOICE',
            accessor: 'invoice_no',
            render: (item) => (
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                    {item.invoice_no}
                </span>
            )
        },
        {
            header: 'TGL. INV',
            accessor: 'tgl_invoice',
            render: (item) => (
                <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold">
                    {item.tgl_invoice || '-'}
                </span>
            )
        },
        {
            header: 'PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold flex flex-col">
                    <span>{item.cust_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">{item.cust_id}</span>
                </div>
            )
        },
        {
            header: 'FAKTUR PAJAK',
            accessor: 'faktur_pajak',
            render: (item) => (
                <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-mono font-bold text-xs">
                    {item.faktur_pajak || '-'}
                </span>
            )
        },
        {
            header: 'TAGIHAN',
            accessor: 'total_tagihan',
            render: (item) => (
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'TGL. TUKAR',
            accessor: 'tgl_tukar',
            render: (item) => (
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {item.tgl_tukar || '-'}
                </span>
            )
        },
        {
            header: 'PENERIMA (PIC)',
            accessor: 'penerima',
            render: (item) => (
                <span style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }} className="font-bold uppercase">
                    {item.penerima || '-'}
                </span>
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
                            Filter Parameter Tukar Faktur
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
                                <span>TANGGAL TUKAR FAKTUR</span>
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

                        {/* 2. Filter No Invoice */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={filterState.useNoInvoice}
                                    onChange={(e) => setFilterState(p => ({ ...p, useNoInvoice: e.target.checked }))}
                                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                />
                                <span>NO. INVOICE</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ketik No. Invoice..."
                                disabled={!filterState.useNoInvoice}
                                value={filterState.noInvoice}
                                onChange={(e) => setFilterState(p => ({ ...p, noInvoice: e.target.value }))}
                                className={`w-full p-2 border rounded-xl font-mono outline-none ${!filterState.useNoInvoice ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-gray-700' : ''
                                    } ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                            />
                        </div>

                        {/* 3. Filter No Kwitansi */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={filterState.useNoKW}
                                    onChange={(e) => setFilterState(p => ({ ...p, useNoKW: e.target.checked }))}
                                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                />
                                <span>NO. KWITANSI</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ketik No. Kwitansi..."
                                disabled={!filterState.useNoKW}
                                value={filterState.noKW}
                                onChange={(e) => setFilterState(p => ({ ...p, noKW: e.target.value }))}
                                className={`w-full p-2 border rounded-xl font-mono outline-none ${!filterState.useNoKW ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-gray-700' : ''
                                    } ${isDarkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                            />
                        </div>
                    </div>

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
                            onClick={fetchTukarFaktur}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            <Search size={14} /> Terapkan Filter
                        </button>
                    </div>
                </div>
            )}

            {/* TABEL TUKAR FAKTUR */}
            <DataTableTemplate
                title="TUKAR FAKTUR"
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

export default TukarFaktur;
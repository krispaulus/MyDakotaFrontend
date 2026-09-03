import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, RotateCcw, Search, RefreshCw, Printer } from 'lucide-react';
import Swal from 'sweetalert2';

const TukarFaktur = () => {
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];

    // =========================================================================
    // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT SECARA DINAMIS
    // =========================================================================
    function getActiveAgen() {
        const activeAgenId = localStorage.getItem('active_agen_id') || localStorage.getItem('agen_id') || '';
        const activeCabangId = localStorage.getItem('active_cabang_id') || localStorage.getItem('cabang_id') || '';
        const sessionCabangNama = localStorage.getItem('active_cabang_nama')
            || localStorage.getItem('cabang_nama')
            || localStorage.getItem('active_agen_nama')
            || '';

        if (sessionCabangNama) {
            return {
                id: activeCabangId || activeAgenId || '',
                nama: sessionCabangNama.toUpperCase()
            };
        }

        const found = cabangList.find(c => {
            const cId = String(c.agen_id || c.AgenID || '').trim().toLowerCase();
            const cKode = String(c.agen_kode || c.AgenKode || '').trim().toLowerCase();
            const cNama = String(c.agen_nama || c.AgenNama || '').trim().toLowerCase();
            const targetAgen = activeAgenId.trim().toLowerCase();
            const targetCabang = activeCabangId.trim().toLowerCase();

            return (
                (targetAgen && (cId === targetAgen || cKode === targetAgen || cNama.includes(targetAgen))) ||
                (targetCabang && (cId === targetCabang || cKode === targetCabang || cNama.includes(targetCabang)))
            );
        });

        if (found) {
            return {
                id: String(found.agen_id || found.AgenID),
                nama: String(found.agen_nama || found.AgenNama).toUpperCase()
            };
        }

        if (activeAgenId && activeAgenId.toUpperCase().includes('PUSAT')) {
            return { id: '001', nama: 'PUSAT DAKOTA' };
        }

        return {
            id: activeCabangId || activeAgenId || '',
            nama: activeAgenId ? `AGEN ${activeAgenId.toUpperCase()}` : ''
        };
    }

    const currentActiveAgen = getActiveAgen();
    const isHoldingUser =
        String(currentActiveAgen.nama || '').toUpperCase().includes('PUSAT') ||
        String(currentActiveAgen.nama || '').toUpperCase().includes('HOLDING') ||
        String(currentActiveAgen.id || '') === '001' ||
        String(localStorage.getItem('active_agen_id') || '').toUpperCase().includes('PUSAT') ||
        (!currentActiveAgen.id && !currentActiveAgen.nama);

    // Filter Form State
    const [filterState, setFilterState] = useState({
        useTanggal: false,
        startDate: todayStr,
        endDate: todayStr,
        selectedCabang: isHoldingUser ? '' : currentActiveAgen.id,
        useNoInvoice: false,
        noInvoice: '',
        useNoKW: false,
        noKW: ''
    });

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const resCabang = await api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } });
            setCabangList(resCabang.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi cabang:", err);
        }
    };

    // Sinkronisasi cabang otomatis untuk user cabang
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setFilterState(prev => ({ ...prev, selectedCabang: currentActiveAgen.id }));
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

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
            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : filterState.selectedCabang;
            if (activeFilterCabang) {
                params.cabang_id = activeFilterCabang;
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
        fetchOptions();
        fetchTukarFaktur();
    }, []);

    const handleResetFilter = () => {
        setFilterState({
            useTanggal: false,
            startDate: todayStr,
            endDate: todayStr,
            selectedCabang: isHoldingUser ? '' : currentActiveAgen.id,
            useNoInvoice: false,
            noInvoice: '',
            useNoKW: false,
            noKW: ''
        });
        fetchTukarFaktur();
    };

    const handleFormSubmit = async (item = null) => {
        const isEdit = Boolean(item);
        const token = localStorage.getItem('token');
        const ptId = localStorage.getItem('pt_id') || 'C';

        let invoiceOptionsHtml = '';
        if (!isEdit) {
            try {
                const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : filterState.selectedCabang;
                const resInv = await api.get('/piutang/tukar-faktur/available-invoices', {
                    params: {
                        pt_id: ptId,
                        cabang_id: activeFilterCabang || undefined
                    },
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
            confirmButtonColor: '#0284c7',
            cancelButtonColor: '#64748b',
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
            confirmButtonColor: '#e11d48',
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
                <span className="font-mono font-bold text-sky-600">
                    {item.invoice_no}
                </span>
            )
        },
        {
            header: 'TGL. INV',
            accessor: 'tgl_invoice',
            render: (item) => (
                <span className="font-mono text-slate-600">
                    {item.tgl_invoice || '-'}
                </span>
            )
        },
        {
            header: 'PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div className="font-bold flex flex-col">
                    <span className="text-slate-800">{item.cust_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">{item.cust_id}</span>
                </div>
            )
        },
        {
            header: 'FAKTUR PAJAK',
            accessor: 'faktur_pajak',
            render: (item) => (
                <span className="font-mono text-slate-700 text-xs">
                    {item.faktur_pajak || '-'}
                </span>
            )
        },
        {
            header: 'TAGIHAN (RP)',
            accessor: 'total_tagihan',
            render: (item) => (
                <span className="font-mono font-black text-rose-600">
                    Rp {Number(item.total_tagihan || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'TGL. TUKAR',
            accessor: 'tgl_tukar',
            render: (item) => (
                <span className="font-mono font-bold text-amber-600">
                    {item.tgl_tukar || '-'}
                </span>
            )
        },
        {
            header: 'PENERIMA (PIC)',
            accessor: 'penerima',
            render: (item) => (
                <span className="font-bold uppercase text-slate-800">
                    {item.penerima || '-'}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* PANEL FILTER EXPANDABLE */}
            {showFilter && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        fetchTukarFaktur();
                    }}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all"
                >
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER PARAMETER TUKAR FAKTUR
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-bold">
                        {/* 1. Filter Rentang Tanggal */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={filterState.useTanggal}
                                    onChange={(e) => setFilterState(p => ({ ...p, useTanggal: e.target.checked }))}
                                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                                />
                                <span>TANGGAL TUKAR FAKTUR</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    disabled={!filterState.useTanggal}
                                    value={filterState.startDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, startDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useTanggal
                                            ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                            : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                        }`}
                                />
                                <input
                                    type="date"
                                    disabled={!filterState.useTanggal}
                                    value={filterState.endDate}
                                    onChange={(e) => setFilterState(p => ({ ...p, endDate: e.target.value }))}
                                    className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useTanggal
                                            ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                            : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Dropdown Cabang dengan Logika Penguncian */}
                        <div>
                            <label className="block mb-1 text-slate-500">AGEN / CABANG</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : filterState.selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setFilterState(p => ({ ...p, selectedCabang: e.target.value }))}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                        ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang'}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG --</option>
                                )}

                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>
                                        {currentActiveAgen.nama || 'CABANG AKTIF'}
                                    </option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>{c.agen_nama || c.AgenNama}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* 2. Filter No Invoice */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={filterState.useNoInvoice}
                                    onChange={(e) => setFilterState(p => ({ ...p, useNoInvoice: e.target.checked }))}
                                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                                />
                                <span>NO. INVOICE</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ketik No. Invoice..."
                                disabled={!filterState.useNoInvoice}
                                value={filterState.noInvoice}
                                onChange={(e) => setFilterState(p => ({ ...p, noInvoice: e.target.value }))}
                                className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useNoInvoice
                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                    }`}
                            />
                        </div>

                        {/* 3. Filter No Kwitansi */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={filterState.useNoKW}
                                    onChange={(e) => setFilterState(p => ({ ...p, useNoKW: e.target.checked }))}
                                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                                />
                                <span>NO. KWITANSI</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ketik No. Kwitansi..."
                                disabled={!filterState.useNoKW}
                                value={filterState.noKW}
                                onChange={(e) => setFilterState(p => ({ ...p, noKW: e.target.value }))}
                                className={`w-full p-2 border rounded-lg font-mono outline-none ${!filterState.useNoKW
                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                        : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500'
                                    }`}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
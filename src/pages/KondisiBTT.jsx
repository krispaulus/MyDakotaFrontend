import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import { Filter, CheckCircle2, XCircle, Search, RefreshCw, Printer, Truck, FileCheck, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const KondisiBTT = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // State Buka-Tutup Filter
    const [showFilter, setShowFilter] = useState(false);

    const [cabangList, setCabangList] = useState([]);
    const [picList, setPicList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

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

    // Filter States
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [bttKembali, setBttKembali] = useState('');
    const [selectedPIC, setSelectedPIC] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [sudahInvoice, setSudahInvoice] = useState('');
    const [statusBayar, setStatusBayar] = useState('');
    const [metodeBayar, setMetodeBayar] = useState('');
    const [tglPelunasan, setTglPelunasan] = useState('');
    const [showBTT, setShowBTT] = useState(true);
    const [showOrderJemput, setShowOrderJemput] = useState(true);

    // Sinkronisasi cabang otomatis untuk cabang daerah
    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resPIC] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/piutang/kondisi-btt/options', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setPicList(resPIC.data?.pic_list || []);
        } catch (err) {
            console.error('Gagal load opsi filter:', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/kondisi-btt?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}&show_btt=${showBTT}&show_oj=${showOrderJemput}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
            if (activeFilterCabang) url += `&cabang_asal=${encodeURIComponent(activeFilterCabang)}`;
            if (bttKembali) url += `&btt_kembali=${encodeURIComponent(bttKembali)}`;
            if (selectedPIC) url += `&pic=${encodeURIComponent(selectedPIC)}`;
            if (searchCustomer) url += `&customer=${encodeURIComponent(searchCustomer)}`;
            if (sudahInvoice) url += `&sudah_invoice=${encodeURIComponent(sudahInvoice)}`;
            if (statusBayar) url += `&bayar=${encodeURIComponent(statusBayar)}`;
            if (metodeBayar) url += `&pembayaran=${encodeURIComponent(metodeBayar)}`;
            if (tglPelunasan) url += `&tgl_pelunasan=${encodeURIComponent(tglPelunasan)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Gagal load data kondisi BTT:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchData();
    }, []);

    const handleApplyFilter = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleResetFilter = () => {
        setStartDate(firstDay);
        setEndDate(today);
        setBypassTanggal(false);
        setSelectedCabang(isHoldingUser ? '' : currentActiveAgen.id);
        setBttKembali('');
        setSelectedPIC('');
        setSearchCustomer('');
        setSudahInvoice('');
        setStatusBayar('');
        setMetodeBayar('');
        setTglPelunasan('');
        setShowBTT(true);
        setShowOrderJemput(true);
        fetchData();
    };

    // 🖨️ CETAK LAPORAN RESMI KONDISI BTT & ORDER JEMPUT (A4 LANDSCAPE POPUP)
    const handlePrintReport = async () => {
        if (!data || data.length === 0) {
            Swal.fire({
                title: 'DATA KOSONG',
                text: 'Tidak ada data Kondisi BTT & Order Jemput yang dapat dicetak.',
                icon: 'warning',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        // Convert logo ke Base64 agar tampil di jendela baru
        let base64Logo = '';
        try {
            const logoImg = new Image();
            logoImg.src = dakotaLogo;
            await new Promise((resolve) => {
                if (logoImg.complete) {
                    resolve();
                } else {
                    logoImg.onload = () => resolve();
                    logoImg.onerror = () => resolve();
                }
            });

            if (logoImg.naturalWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.naturalWidth;
                canvas.height = logoImg.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0);
                base64Logo = canvas.toDataURL('image/png');
            }
        } catch {
            base64Logo = dakotaLogo;
        }

        const width = 1150;
        const height = 800;
        const left = Math.max(0, Math.round((window.screen.width - width) / 2));
        const top = Math.max(0, Math.round((window.screen.height - height) / 2));

        const printWindow = window.open(
            '',
            '_blank',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );

        if (!printWindow) {
            Swal.fire('Popup Diblokir', 'Mohon izinkan popup browser untuk mencetak dokumen ini.', 'warning');
            return;
        }

        const todayFormatted = new Date().toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        const activeFilterCabang = !isHoldingUser ? currentActiveAgen.id : selectedCabang;
        const foundCabang = cabangList.find(c => String(c.agen_id || c.AgenID) === String(activeFilterCabang));
        const namaCabang = activeFilterCabang ? (foundCabang?.agen_nama || foundCabang?.AgenNama || `CABANG ${activeFilterCabang}`) : 'KONSOLIDASI (SEMUA CABANG)';
        const periodeStr = bypassTanggal ? 'SEMUA PERIODE (BYPASS TANGGAL)' : `${startDate} s/d ${endDate}`;

        let totalKoliAll = 0;
        let totalBeratAll = 0;
        let totalBiayaAll = 0;

        const rowsHtml = data.map((item, idx) => {
            const koli = Number(item.koli || 0);
            const berat = Number(item.berat || 0);
            const biaya = Number(item.total_biaya || 0);

            totalKoliAll += koli;
            totalBeratAll += berat;
            totalBiayaAll += biaya;

            const isKembali = item.btt_kembali_yn === 'Y';
            const isLunas = item.terbayar_yn === 'Y';
            const isFaktur = item.sudah_invoice_yn === 'Y';

            return `
                <tr style="font-family: monospace; font-size: 10px;">
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #333; padding: 5px; font-weight: bold; color: #0284c7;">
                        ${item.no_dokumen || '-'}
                        <span style="display: block; font-size: 9px; color: #64748b; font-family: sans-serif;">${item.tipe_dokumen || ''}</span>
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">${String(item.tgl_dokumen || '').split('T')[0] || '-'}</td>
                    <td style="border: 1px solid #333; padding: 5px; font-family: sans-serif;">
                        <div style="font-weight: bold; color: #111;">${item.cust_name || '-'}</div>
                        <div style="font-size: 9px; color: #475569;">Tujuan: ${item.penerima || '-'} (${item.kota_tujuan || '-'})</div>
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; text-transform: uppercase;">${item.pic || '-'}</td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">${koli} Koli / ${berat} Kg</td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; font-size: 9.5px;">${item.metode_bayar || '-'}</td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; color: ${isKembali ? '#059669' : '#d97706'};">
                        ${isKembali ? 'KEMBALI' : 'BELUM'}
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center;">
                        ${isFaktur ? `<span style="color: #059669; font-weight: bold;">${item.no_invoice || 'FAKTUR'}</span>` : '<span style="color: #94a3b8;">UNBILLED</span>'}
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; color: ${isLunas ? '#059669' : '#e11d48'};">
                        ${isLunas ? 'LUNAS' : 'BELUM'}
                    </td>
                    <td style="border: 1px solid #333; padding: 5px; text-align: right; font-weight: bold;">
                        Rp ${biaya.toLocaleString('id-ID')}
                    </td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Laporan Kondisi BTT & Order Jemput - ${namaCabang}</title>
                <style>
                    @page { 
                        margin: 8mm 10mm 10mm 10mm; 
                    }
                    * { 
                        box-sizing: border-box; 
                    }
                    html, body { 
                        width: 100%;
                        margin: 0; 
                        padding: 0; 
                        font-family: Arial, Helvetica, sans-serif; 
                        font-size: 11px; 
                        color: #000; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                    }
                    th {
                        padding: 7px 5px;
                        font-size: 10px;
                        background-color: #cbd5e1 !important;
                    }
                    td {
                        padding: 6px 5px;
                        font-size: 10px;
                    }
                    .header-kop {
                        border-bottom: 2px solid #000;
                        padding-bottom: 6px;
                        margin-bottom: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="header-kop">
                    <table style="width: 100%; border: none;">
                        <tr>
                            <td style="width: 55%; vertical-align: middle; border: none;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    ${base64Logo ? `<img src="${base64Logo}" alt="Logo Dakota" style="height: 42px; width: auto; object-fit: contain;" />` : ''}
                                    <div>
                                        <div style="font-size: 13px; font-weight: bold; color: #000; letter-spacing: 0.5px;">PT DAKOTA LOGISTIK INDONESIA</div>
                                        <div style="font-size: 10px; color: #333; margin-top: 1px;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi - BEKASI KOTA</div>
                                        <div style="font-size: 10px; color: #333;">Telp: (021) 8603278 / (021) 86608589</div>
                                    </div>
                                </div>
                            </td>
                            <td style="width: 45%; text-align: right; vertical-align: middle; border: none;">
                                <div style="font-size: 14px; font-weight: 900; text-decoration: underline; letter-spacing: 0.5px;">LAPORAN KONDISI BTT & ORDER JEMPUT</div>
                                <div style="font-size: 11px; margin-top: 2px; font-weight: bold; color: #111;">${namaCabang}</div>
                                <div style="font-size: 10px; color: #222; margin-top: 2px;">PERIODE: ${periodeStr}</div>
                                <div style="font-size: 9px; color: #555; margin-top: 1px;">Tanggal Cetak: ${todayFormatted}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <table>
                    <thead>
                        <tr style="background-color: #cbd5e1; font-weight: bold; font-size: 10px; text-align: center;">
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 3%;">NO</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 12%;">NO. DOKUMEN</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 8%;">TANGGAL</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 22%;">PELANGGAN / TUJUAN</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 10%;">PIC MARKETING</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 10%;">KOLI / BERAT</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 8%;">METODE</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 7%;">BTT FISIK</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 8%;">FAKTUR</th>
                            <th style="border: 1px solid #475569; padding: 6px 4px; width: 6%;">LUNAS</th>
                            <th style="border: 1px solid #475569; padding: 6px 5px; width: 11%; text-align: right;">TOTAL BIAYA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10px; font-family: monospace;">
                            <td colspan="5" style="border: 1px solid #475569; padding: 6px; text-align: center;">TOTAL (${data.length} TRANSAKSI) :</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: center;">${totalKoliAll} Koli / ${totalBeratAll} Kg</td>
                            <td colspan="4" style="border: 1px solid #475569; padding: 6px; text-align: center;">-</td>
                            <td style="border: 1px solid #475569; padding: 6px; text-align: right; font-weight: 900; color: #e11d48;">Rp ${totalBiayaAll.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 25px; page-break-inside: avoid;">
                    <table style="width: 100%; border: none; font-size: 11px;">
                        <tr style="text-align: center; border: none;">
                            <td style="width: 33%; border: none;">
                                <div>Dibuat Oleh,</div>
                                <div style="height: 44px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Petugas Operasional / CS )</div>
                            </td>
                            <td style="width: 33%; border: none;">
                                <div>Diperiksa Oleh,</div>
                                <div style="height: 44px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Koordinator Piutang )</div>
                            </td>
                            <td style="width: 33%; border: none;">
                                <div>Disetujui Oleh,</div>
                                <div style="height: 44px;"></div>
                                <div style="font-weight: bold; text-decoration: underline;">( Kepala Cabang )</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <script>
                    window.onload = () => {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const columns = [
        {
            header: 'NO. DOKUMEN',
            accessor: 'no_dokumen',
            render: (item) => (
                <div>
                    <span className="font-mono font-bold text-sky-600 block">{item.no_dokumen}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.tipe_dokumen}</span>
                </div>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'tgl_dokumen',
            render: (item) => <span className="font-mono text-slate-600">{String(item.tgl_dokumen || '').split('T')[0]}</span>
        },
        {
            header: 'PELANGGAN / PENGIRIM',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-800 block">{item.cust_name}</span>
                    <span className="text-[11px] text-slate-500">Tujuan: {item.penerima} ({item.kota_tujuan})</span>
                </div>
            )
        },
        {
            header: 'PIC MARKETING',
            accessor: 'pic',
            render: (item) => <span className="font-bold text-slate-700 uppercase">{item.pic || '-'}</span>
        },
        {
            header: 'KOLI / BERAT',
            accessor: 'koli',
            render: (item) => <span className="font-mono text-slate-700">{item.koli} Koli / {item.berat} Kg</span>
        },
        {
            header: 'TOTAL BIAYA',
            accessor: 'total_biaya',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.total_biaya || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'METODE',
            accessor: 'metode_bayar',
            render: (item) => <span className="font-bold text-sky-800 uppercase text-[10px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{item.metode_bayar}</span>
        },
        {
            header: 'BTT KEMBALI',
            accessor: 'btt_kembali_yn',
            render: (item) => item.btt_kembali_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> KEMBALI
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> BELUM
                </span>
            )
        },
        {
            header: 'STATUS INVOICE',
            accessor: 'sudah_invoice_yn',
            render: (item) => item.sudah_invoice_yn === 'Y' ? (
                <div>
                    <span className="font-bold text-emerald-600 block text-[10px]">FAKTUR</span>
                    <span className="font-mono text-[9px] text-slate-500">{item.no_invoice}</span>
                </div>
            ) : (
                <span className="font-bold text-slate-400 text-[10px]">UNBILLED</span>
            )
        },
        {
            header: 'LUNAS',
            accessor: 'terbayar_yn',
            render: (item) => item.terbayar_yn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> LUNAS
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> BELUM
                </span>
            )
        }
    ];

    return (
        <div className="space-y-5">
            {/* Filter Panel (Kondisional Buka/Tutup) */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER KONDISI BTT & ORDER JEMPUT
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AWAL</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Cabang Asal Filter */}
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG ASAL</label>
                            <select
                                value={!isHoldingUser && currentActiveAgen.id ? currentActiveAgen.id : selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser
                                    ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'
                                    }`}
                                title={!isHoldingUser ? 'Filter cabang terkunci sesuai lokasi login Anda' : 'Pilih cabang asal'}
                            >
                                {isHoldingUser && (
                                    <option value="">-- SEMUA CABANG ASAL --</option>
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

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">BTT TELAH KEMBALI</label>
                            <select
                                value={bttKembali}
                                onChange={(e) => setBttKembali(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS FISIK --</option>
                                <option value="Y">Sudah Kembali (POD)</option>
                                <option value="N">Belum Kembali</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">PIC MARKETING</label>
                            <select
                                value={selectedPIC}
                                onChange={(e) => setSelectedPIC(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA PIC --</option>
                                {picList.map((pic, i) => (
                                    <option key={i} value={pic}>{pic}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Cari customer / pengirim..."
                                value={searchCustomer}
                                onChange={(e) => setSearchCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS FAKTUR INVOICE</label>
                            <select
                                value={sudahInvoice}
                                onChange={(e) => setSudahInvoice(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS FAKTUR --</option>
                                <option value="Y">Sudah Dibuatkan Invoice</option>
                                <option value="N">Belum Difakturkan (Unbilled)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS BAYAR</label>
                            <select
                                value={statusBayar}
                                onChange={(e) => setStatusBayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS LUNAS --</option>
                                <option value="Y">Sudah Lunas</option>
                                <option value="N">Belum Lunas</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">METODE PEMBAYARAN</label>
                            <select
                                value={metodeBayar}
                                onChange={(e) => setMetodeBayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA METODE --</option>
                                <option value="TUNAI">TUNAI</option>
                                <option value="KREDIT">KREDIT</option>
                                <option value="TAGIH TURUN">TAGIH TURUN (COD)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">TGL PELUNASAN</label>
                            <input
                                type="date"
                                value={tglPelunasan}
                                onChange={(e) => setTglPelunasan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="flex items-center gap-4 mt-5">
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={showBTT}
                                    onChange={(e) => setShowBTT(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                BTT
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={showOrderJemput}
                                    onChange={(e) => setShowOrderJemput(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Order Jemput
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Bypass Tgl
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handlePrintReport}
                            className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition flex items-center gap-1.5 uppercase cursor-pointer"
                        >
                            <Printer size={14} /> Cetak Laporan
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold rounded-xl uppercase transition cursor-pointer"
                        >
                            RESET
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl uppercase transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} /> REFRESH DATA
                        </button>
                    </div>
                </form>
            )}

            {/* Tabel List Monitoring */}
            <DataTableTemplate
                title="KONDISI BTT DAN ORDER JEMPUT"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={true}
                hideAddButton={true}
                hideActions={true}
                hideActionColumn={true}
                onFilter={() => setShowFilter(prev => !prev)}
                onEdit={(item) => {
                    Swal.fire({
                        title: `Detail Resi ${item.no_dokumen}`,
                        html: `
                            <div style="text-align: left; font-size: 12px; line-height: 1.8;">
                                <p><strong>Pelanggan:</strong> ${item.cust_name} (${item.cust_id || '-'})</p>
                                <p><strong>Penerima:</strong> ${item.penerima} - ${item.kota_tujuan}</p>
                                <p><strong>Muatan:</strong> ${item.koli} Koli / ${item.berat} Kg</p>
                                <p><strong>Total Biaya:</strong> Rp ${Number(item.total_biaya || 0).toLocaleString('id-ID')}</p>
                                <p><strong>Metode Bayar:</strong> ${item.metode_bayar}</p>
                                <p><strong>Status Invoice:</strong> ${item.no_invoice !== '-' ? item.no_invoice : 'Belum dibuatkan faktur'}</p>
                                <p><strong>Status Lunas:</strong> ${item.terbayar_yn === 'Y' ? 'Sudah Lunas' : 'Belum Lunas'}</p>
                            </div>
                        `,
                        icon: 'info',
                        confirmButtonText: 'Tutup'
                    });
                }}
                onDelete={null}
            />
        </div>
    );
};

export default KondisiBTT;
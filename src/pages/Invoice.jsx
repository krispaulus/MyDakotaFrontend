import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Filter, CheckCircle2, XCircle, Search, RefreshCw, Printer,
    X, Plus, Trash2, FileText, Calendar, CheckSquare, Square,
    Download, Lock, Unlock, ArrowRight, Edit3
} from 'lucide-react';
import Swal from 'sweetalert2';
import dakotaLogo from '../assets/new_logo 2.png';

const Invoice = () => {
    const { isDarkMode } = useDarkMode();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [cabangList, setCabangList] = useState([]);
    const [custList, setCustList] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);

    // Dropdown Cetak di Kolom Aksi
    const [activePrintMenuId, setActivePrintMenuId] = useState(null);

    // =========================================================================
    // HELPER: DETEKSI CABANG & STATUS HOLDING / PUSAT
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

    // Filter Utama Dashboard
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [bypassTanggal, setBypassTanggal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(isHoldingUser ? '' : currentActiveAgen.id);
    const [selectedJenis, setSelectedJenis] = useState('');
    const [selectedTerbayar, setSelectedTerbayar] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [searchInvoice, setSearchInvoice] = useState('');
    const [searchKwitansi, setSearchKwitansi] = useState('');
    const [searchBTT, setSearchBTT] = useState('');

    useEffect(() => {
        if (!isHoldingUser && currentActiveAgen.id) {
            setSelectedCabang(currentActiveAgen.id);
        }
    }, [isHoldingUser, currentActiveAgen.id, cabangList]);

    // Tutup dropdown saat klik sembarang tempat
    useEffect(() => {
        const handleOutsideClick = () => setActivePrintMenuId(null);
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    // =========================================================================
    // STATE MODAL BUAT INVOICE BARU
    // =========================================================================
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addStep, setAddStep] = useState(1);
    const [bttStartDate, setBttStartDate] = useState(firstDay);
    const [bttEndDate, setBttEndDate] = useState(today);
    const [bttBypassTanggal, setBttBypassTanggal] = useState(false);
    const [bttDisplayType, setBttDisplayType] = useState('KREDIT');

    const [newInvoiceForm, setNewInvoiceForm] = useState({
        artih_tanggal: today,
        artih_custid: '',
        artih_custname: '',
        artih_agenid: currentActiveAgen.id,
        artih_agenname: currentActiveAgen.nama,
        artih_jenis: 'K',
        artih_fktpajak: '',
        artih_keterangan: '',
        selected_btts: []
    });

    const [unbilledBTTList, setUnbilledBTTList] = useState([]);
    const [loadingUnbilled, setLoadingUnbilled] = useState(false);

    // Modal Edit Invoice
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [activeBTTList, setActiveBTTList] = useState([]);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resCabang, resCust] = await Promise.all([
                api.get('/gl/agen-ca?stt=', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/gl/customers?limit=1000', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCabangList(resCabang.data?.data || []);
            setCustList(resCust.data?.data || []);
        } catch (err) {
            console.error("Gagal load opsi filter:", err);
        }
    };

    const fetchInvoiceList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            let url = `/piutang/invoice?pt_id=${ptId}&bypass_tanggal=${bypassTanggal}`;

            if (!bypassTanggal) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            if (selectedCabang) url += `&agen_id=${encodeURIComponent(selectedCabang)}`;
            if (selectedJenis) url += `&jenis=${encodeURIComponent(selectedJenis)}`;
            if (selectedTerbayar) url += `&terbayar=${encodeURIComponent(selectedTerbayar)}`;
            if (searchCustomer) url += `&customer=${encodeURIComponent(searchCustomer)}`;
            if (searchInvoice) url += `&no_invoice=${encodeURIComponent(searchInvoice)}`;
            if (searchKwitansi) url += `&no_kwitansi=${encodeURIComponent(searchKwitansi)}`;
            if (searchBTT) url += `&no_btt=${encodeURIComponent(searchBTT)}`;

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load daftar invoice:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions();
        fetchInvoiceList();
    }, []);

    const loadUnbilledBTTByDate = async (custId, start, end, bypass, displayType, custNameParam, jenisParam) => {
        if (!custId) return;
        setLoadingUnbilled(true);
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const activeName = custNameParam || newInvoiceForm.artih_custname || '';
            const activeJenis = jenisParam || newInvoiceForm.artih_jenis || 'K';

            let url = `/piutang/invoice/unbilled-btt?pt_id=${ptId}&cust_id=${encodeURIComponent(custId)}&cust_name=${encodeURIComponent(activeName)}&jenis=${activeJenis}&display_type=${displayType || 'KREDIT'}`;

            url += `&bypass_tanggal=${bypass}`;
            if (!bypass && start && end) {
                url += `&start_date=${start}&end_date=${end}`;
            }

            const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setUnbilledBTTList(res.data?.data || []);
        } catch (err) {
            console.error("Gagal load unbilled BTT:", err);
            setUnbilledBTTList([]);
        } finally {
            setLoadingUnbilled(false);
        }
    };

    const handleSelectCustomerForNewInvoice = (custId) => {
        const cust = custList.find(c => String(c.cust_id) === String(custId));
        setNewInvoiceForm(prev => ({
            ...prev,
            artih_custid: custId,
            artih_custname: cust ? (cust.cust_name || cust.CustName) : '',
            selected_btts: []
        }));
    };

    const handleProceedToDetails = () => {
        if (!newInvoiceForm.artih_custid) {
            Swal.fire('Peringatan', 'Silakan pilih Customer terlebih dahulu!', 'warning');
            return;
        }
        setAddStep(2);
        loadUnbilledBTTByDate(
            newInvoiceForm.artih_custid,
            bttStartDate,
            bttEndDate,
            bttBypassTanggal,
            bttDisplayType,
            newInvoiceForm.artih_custname,
            newInvoiceForm.artih_jenis
        );
    };

    const handleFilterBTTChange = (newStart, newEnd, newBypass, newType) => {
        setBttStartDate(newStart);
        setBttEndDate(newEnd);
        setBttBypassTanggal(newBypass);
        setBttDisplayType(newType);

        loadUnbilledBTTByDate(
            newInvoiceForm.artih_custid,
            newStart,
            newEnd,
            newBypass,
            newType,
            newInvoiceForm.artih_custname,
            newInvoiceForm.artih_jenis
        );
    };

    const handleSaveNewInvoice = async (e) => {
        if (e) e.preventDefault();

        if (newInvoiceForm.selected_btts.length === 0) {
            Swal.fire('Peringatan', 'Pilih minimal satu nomor resi BTT untuk difakturkan!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';

            const payload = {
                artih_tanggal: newInvoiceForm.artih_tanggal,
                artih_custid: newInvoiceForm.artih_custid,
                artih_custname: newInvoiceForm.artih_custname,
                artih_agenid: newInvoiceForm.artih_agenid,
                artih_jenis: newInvoiceForm.artih_jenis,
                artih_fktpajak: newInvoiceForm.artih_fktpajak,
                artih_keterangan: newInvoiceForm.artih_keterangan,
                btt_list: newInvoiceForm.selected_btts
            };

            const res = await api.post(`/piutang/invoice/save?pt_id=${ptId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newInvoiceId = res.data?.invoice_id || res.data?.id;

            Swal.fire({
                title: 'BERHASIL DISIMPAN!',
                text: res.data?.message || 'Invoice tersimpan dalam status Draft.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            setIsAddModalOpen(false);
            fetchInvoiceList();

            if (newInvoiceId) {
                handleOpenEditInvoice({ artih_id: newInvoiceId });
            }
        } catch (err) {
            Swal.fire('Gagal!', err.response?.data?.message || 'Gagal menyimpan invoice.', 'error');
        }
    };

    const handleOpenEditInvoice = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/invoice/detail?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.header;
            const btts = res.data?.btt_list || [];

            setActiveInvoice({
                ...header,
                artih_tanggal: String(header.artih_tanggal || '').split('T')[0]
            });
            setActiveBTTList(btts);
            setIsEditModalOpen(true);
        } catch (err) {
            Swal.fire('Error', 'Gagal mengambil detail invoice.', 'error');
        }
    };

    const handlePostingInvoice = (invoiceId) => {
        const id = invoiceId || activeInvoice?.artih_id;
        Swal.fire({
            title: 'Posting Invoice?',
            text: `Invoice ${id} akan diposting dan jurnal memorial otomatis terbentuk. Lanjutkan?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Ya, POSTING SEKARANG',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    const currentAgen = getActiveAgen();

                    const response = await api.post(`/piutang/invoice/posting?pt_id=${ptId}`, {
                        invoice_id: id,
                        agen_id: currentAgen.id
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    Swal.fire('Berhasil!', response.data?.message || 'Invoice resmi diposting!', 'success');
                    setIsEditModalOpen(false);
                    fetchInvoiceList();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.message || 'Gagal memposting invoice.', 'error');
                }
            }
        });
    };

    const handleDeleteInvoice = (item) => {
        if (!item) return;

        Swal.fire({
            title: 'Hapus Invoice?',
            text: `Apakah Anda yakin ingin menghapus Invoice ${item.artih_id}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    const ptId = localStorage.getItem('pt_id') || 'C';
                    await api.delete(`/piutang/invoice?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Berhasil!', `Invoice ${item.artih_id} berhasil dihapus.`, 'success');
                    fetchInvoiceList();
                } catch (err) {
                    Swal.fire('Gagal!', err.response?.data?.message || 'Gagal menghapus invoice.', 'error');
                }
            }
        });
    };

    // =========================================================================
    // 🖨️ FUNGSI CETAK DOKUMEN FAKTUR, KWITANSI, DAN SUMMARY
    // =========================================================================
    const handlePrintDocument = async (invoiceItem, docType = 'FAKTUR') => {
        const item = invoiceItem || activeInvoice;
        if (!item) return;

        try {
            const token = localStorage.getItem('token');
            const ptId = localStorage.getItem('pt_id') || 'C';
            const res = await api.get(`/piutang/invoice/detail?id=${encodeURIComponent(item.artih_id)}&pt_id=${ptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const header = res.data?.header || {};
            const btts = res.data?.btt_list || [];

            const printWindow = window.open('', '_blank', 'width=1150,height=800,scrollbars=yes');
            if (!printWindow) {
                Swal.fire('Popup Diblokir', 'Izinkan popup browser untuk mencetak dokumen ini.', 'warning');
                return;
            }

            let totalBerat = 0;
            let totalUkuran = 0;
            let totalPacking = 0;
            let totalBiayaKirim = 0;
            let totalBiayaPenerus = 0;
            let grandTotal = 0;

            const rowsHtml = btts.map((b, idx) => {
                const sub = Number(b.subtotal || b.bttt_harga || 0);
                totalBerat += Number(b.bttt_berat || 0);
                totalUkuran += Number(b.bttt_ukuran || 0);
                totalPacking += Number(b.biaya_packing || 0);
                totalBiayaKirim += Number(b.bttt_harga || 0);
                totalBiayaPenerus += Number(b.bttt_biayapenerus || 0);
                grandTotal += sub;

                return `
                    <tr style="font-family: monospace; font-size: 10px;">
                        <td style="border: 1px solid #333; padding: 4px; text-align: center;">${idx + 1}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${header.artih_id || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${header.cust_name || header.artih_custname || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px; font-weight: bold;">${b.bttt_id}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: center;">${String(b.bttt_tanggal).substring(0, 10)}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${b.bttt_tujuankota || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px;">${b.bttt_tujuannama || '-'}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: center;">DARAT</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_jmlunit || 1)}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_berat || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_ukuran || 0)}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.biaya_packing || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_biayapenerus || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right;">${Number(b.bttt_harga || 0).toLocaleString('id-ID')}</td>
                        <td style="border: 1px solid #333; padding: 4px; text-align: right; font-weight: bold;">${sub.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            }).join('');

            const titleHeader = docType.includes('KWITANSI') ? 'KWITANSI PENAGIHAN' : (docType === 'SUMMARY' ? 'SUMMARY BILLING' : 'FAKTUR PENAGIHAN');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${titleHeader} - ${header.artih_id}</title>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; }
                        body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 10px; color: #000; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        th { border: 1px solid #000; padding: 5px 3px; background-color: #cbd5e1; font-size: 9px; text-align: center; }
                        .no-print-bar { background-color: #1e40af; color: white; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px; text-align: center; }
                        .btn-ctrl { padding: 7px 18px; font-weight: bold; border-radius: 6px; border: none; cursor: pointer; text-transform: uppercase; margin: 0 4px; }
                        @media print { .no-print { display: none !important; } }
                    </style>
                </head>
                <body>
                    <div class="no-print no-print-bar">
                        <button class="btn-ctrl" style="background:#e11d48; color:white;" onclick="window.close()">BATAL</button>
                        <button class="btn-ctrl" style="background:#16a34a; color:white;" onclick="setJudulDoc('FAKTUR PENAGIHAN', ''); window.print();">PRINT</button>
                        <button class="btn-ctrl" style="background:#0284c7; color:white;" onclick="exportTableToExcel('tableFaktur', 'Faktur-${header.artih_id}')">ExpToXLS</button>
                        <button class="btn-ctrl" style="background:#eab308; color:black;" onclick="setJudulDoc('PROFORMA INVOICE', '* DRAF TAGIHAN SEMENTARA *'); window.print();">PROFORMA</button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:6px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${dakotaLogo}" alt="Logo" style="height:38px;" />
                            <div>
                                <h2 style="margin:0; font-size:14px; font-weight:900;">PT DAKOTA LOGISTIK INDONESIA</h2>
                                <div style="font-size:10px; color:#444;">Jl. Wibawa Mukti II No. 99, Jatiasih, Bekasi</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <h2 id="judulDokumen" style="margin:0; font-size:15px; font-weight:900; text-decoration:underline;">${titleHeader}</h2>
                            <div id="subJudulDokumen" style="font-size:10px; font-weight:bold; color:#d97706; margin-top:1px;"></div>
                            <div style="font-size:10px; font-weight:bold; margin-top:2px;">NO. FAKTUR: ${header.artih_id}</div>
                            <div style="font-size:10px; color:#555;">NO. KWITANSI: ${header.artih_nokw || '-'}</div>
                            <div style="font-size:10px; color:#555;">CUSTOMER: ${header.cust_name || header.artih_custname}</div>
                        </div>
                    </div>

                    <table id="tableFaktur">
                        <thead>
                            <tr>
                                <th style="width:3%;">NO</th>
                                <th style="width:10%;">NO. INVOICE</th>
                                <th style="width:16%;">NAMA CUSTOMER</th>
                                <th style="width:10%;">NO. BTT</th>
                                <th style="width:8%;">TANGGAL</th>
                                <th style="width:9%;">KOTA TUJUAN</th>
                                <th style="width:12%;">PENERIMA</th>
                                <th style="width:5%;">SERVICE</th>
                                <th style="width:4%;">KOLI</th>
                                <th style="width:5%;">BERAT</th>
                                <th style="width:4%;">UKURAN</th>
                                <th style="width:6%;">PACKING</th>
                                <th style="width:6%;">PENERUS</th>
                                <th style="width:7%;">BIAYA KIRIM</th>
                                <th style="width:8%;">TOTAL BIAYA</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background-color:#f1f5f9; font-weight:bold; font-family:monospace; font-size:10px;">
                                <td colspan="8" style="border:1px solid #333; padding:5px; text-align:center;">JUMLAH TOTAL :</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">-</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalBerat.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalUkuran}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalPacking.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalBiayaPenerus.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right;">${totalBiayaKirim.toLocaleString('id-ID')}</td>
                                <td style="border:1px solid #333; padding:5px; text-align:right; font-weight:900; color:#b91c1c;">Rp ${grandTotal.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <script>
                        function setJudulDoc(judul, subjudul) {
                            document.getElementById('judulDokumen').innerText = judul;
                            document.getElementById('subJudulDokumen').innerText = subjudul;
                        }
                        function exportTableToExcel(tableID, filename = '') {
                            var downloadLink;
                            var dataType = 'application/vnd.ms-excel';
                            var tableSelect = document.getElementById(tableID);
                            var tableHTML = tableSelect.outerHTML.replace(/ /g, '%20');
                            filename = filename ? filename + '.xls' : 'excel_data.xls';
                            downloadLink = document.createElement("a");
                            document.body.appendChild(downloadLink);
                            if (navigator.msSaveOrOpenBlob) {
                                var blob = new Blob(['\\ufeff', tableHTML], { type: dataType });
                                navigator.msSaveOrOpenBlob(blob, filename);
                            } else {
                                downloadLink.href = 'data:' + dataType + ', ' + tableHTML;
                                downloadLink.download = filename;
                                downloadLink.click();
                            }
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) {
            Swal.fire('Error', 'Gagal memuat dokumen cetak faktur.', 'error');
        }
    };

    const handleDownloadRTF = (item) => {
        if (!item) return;

        const content = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}
\\viewkind4\\uc1\\pard\\qc\\b\\fs24 PT DAKOTA LOGISTIK INDONESIA\\par
\\fs20 TANDA TERIMA TAGIHAN\\par\\b0\\par
\\pard\\fs18
Nomor Invoice : ${item.artih_id}\\par
Nomor Kwitansi: ${item.artih_nokw || '-'}\\par
Pelanggan     : ${item.cust_name || item.artih_custname}\\par
Tanggal       : ${String(item.artih_tanggal || '').substring(0, 10)}\\par
Total Tagihan : Rp ${Number(item.artih_total || 0).toLocaleString('id-ID')}\\par\\par
\\pard\\qc ( Lembar Asli Untuk Pembawa Tagihan )\\par
}`;

        const blob = new Blob([content], { type: 'application/rtf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TandaTerimaTagihan-${item.artih_id}.rtf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // =========================================================================
    // DEFINISI KOLOM GRID DASHBOARD DENGAN 1 KOLOM AKSI LENGKAP
    // =========================================================================
    const columns = [
        {
            header: 'NO. INVOICE',
            accessor: 'artih_id',
            render: (item) => (
                <span className="font-mono font-bold text-sky-600 select-all">
                    {item.artih_id}
                </span>
            )
        },
        {
            header: 'TANGGAL',
            accessor: 'artih_tanggal',
            render: (item) => <span className="font-mono font-bold text-slate-800">{String(item.artih_tanggal || '').split('T')[0]}</span>
        },
        {
            header: 'PELANGGAN',
            accessor: 'cust_name',
            render: (item) => (
                <div>
                    <span className="font-bold text-slate-900 block">{item.cust_name || item.artih_custname}</span>
                    <span className="font-mono text-[10px] text-slate-500">ID: {item.artih_custid}</span>
                </div>
            )
        },
        {
            header: 'NO. KWITANSI',
            accessor: 'artih_nokw',
            render: (item) => <span className="font-mono font-bold text-emerald-700">{item.artih_nokw || '-'}</span>
        },
        {
            header: 'TOTAL TAGIHAN (RP)',
            accessor: 'artih_total',
            render: (item) => <span className="font-mono font-black text-rose-600">Rp {Number(item.artih_total || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'TERBAYAR (RP)',
            accessor: 'terbayar',
            render: (item) => <span className="font-mono font-bold text-slate-800">Rp {Number(item.terbayar || 0).toLocaleString('id-ID')}</span>
        },
        {
            header: 'JENIS',
            accessor: 'artih_jenis',
            render: (item) => {
                if (item.artih_jenis === 'K') return <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[10px] border border-sky-200">KREDIT</span>;
                if (item.artih_jenis === 'B') return <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">TUNAI</span>;
                return <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">TAGIH</span>;
            }
        },
        {
            header: 'STATUS POSTING',
            accessor: 'artih_postingyn',
            render: (item) => item.artih_postingyn === 'Y' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                    <CheckCircle2 size={12} /> POSTED
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                    <XCircle size={12} /> DRAFT
                </span>
            )
        },
        {
            header: 'AKSI',
            accessor: 'artih_id',
            render: (item) => (
                <div className="flex items-center gap-1 justify-center relative" onClick={(e) => e.stopPropagation()}>
                    {/* 1. Tombol Cetak Dokumen dengan Dropdown Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePrintMenuId(activePrintMenuId === item.artih_id ? null : item.artih_id);
                            }}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title="Pilihan Cetak Dokumen"
                        >
                            <Printer size={13} />
                        </button>

                        {activePrintMenuId === item.artih_id && (
                            <div className="absolute right-0 top-8 w-44 bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 z-[999] text-left text-xs font-bold divide-y divide-slate-100 animate-in fade-in">
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'FAKTUR'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-sky-50 hover:text-sky-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <Printer size={12} className="text-sky-600" /> Faktur Penagihan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'KWITANSI_1'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-amber-50 hover:text-amber-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <FileText size={12} className="text-amber-500" /> Kwitansi Tipe 1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'KWITANSI_2'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-sky-50 hover:text-sky-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <FileText size={12} className="text-sky-500" /> Kwitansi Tipe 2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'FAKTUR_2'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <Printer size={12} className="text-indigo-600" /> Faktur Tipe 2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActivePrintMenuId(null); handlePrintDocument(item, 'SUMMARY'); }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 text-left cursor-pointer flex items-center gap-1.5"
                                >
                                    <CheckSquare size={12} className="text-emerald-600" /> Summary Billing
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Tombol Unduh RTF */}
                    <button
                        type="button"
                        onClick={() => handleDownloadRTF(item)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg transition cursor-pointer shadow-2xs"
                        title="Unduh Tanda Terima Tagihan (.rtf)"
                    >
                        <Download size={13} />
                    </button>

                    {/* 3. Tombol Edit Invoice */}
                    <button
                        type="button"
                        onClick={() => handleOpenEditInvoice(item)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition cursor-pointer shadow-2xs"
                        title="Buka / Edit Rincian Invoice"
                    >
                        <Edit3 size={13} />
                    </button>

                    {/* 4. Tombol Posting (jika masih Draft) */}
                    {item.artih_postingyn !== 'Y' && (
                        <button
                            type="button"
                            onClick={() => handlePostingInvoice(item.artih_id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title="Posting Invoice"
                        >
                            <Lock size={13} />
                        </button>
                    )}

                    {/* 5. Tombol Hapus (jika masih Draft) */}
                    {item.artih_postingyn !== 'Y' && (
                        <button
                            type="button"
                            onClick={() => handleDeleteInvoice(item)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title="Hapus Invoice"
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    // =========================================================================
    // ELEMEN MODAL EDIT INVOICE (DIDEKLARASIKAN SEBELUM RETURN)
    // =========================================================================
    const editModalElement = isEditModalOpen && activeInvoice ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity z-[1000]">
            <div className={`w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-6 py-3 bg-[#004b84] text-white flex items-center justify-between">
                    <div className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                        <FileText size={18} className="text-sky-300" />
                        EDIT INVOICE — {activeInvoice.artih_id}
                    </div>
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG / AGEN :</label>
                            <input type="text" readOnly value={activeInvoice.agen_nama || 'DLI PUSAT'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. FAKTUR :</label>
                            <input type="text" readOnly value={activeInvoice.artih_id} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-sky-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. KWITANSI :</label>
                            <input type="text" readOnly value={activeInvoice.artih_nokw || '-'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-emerald-700" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS INVOICE :</label>
                            <input type="text" readOnly value={activeInvoice.artih_jenis === 'K' ? 'Kredit' : activeInvoice.artih_jenis === 'B' ? 'Tunai' : 'Tagih Turun'} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER :</label>
                            <input type="text" readOnly value={`${activeInvoice.cust_name || activeInvoice.artih_custname} [${activeInvoice.artih_custid}]`} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-800" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">TANGGAL INVOICE :</label>
                            <input type="date" readOnly value={activeInvoice.artih_tanggal} className="w-full p-2 bg-slate-100 border border-slate-200 rounded font-bold text-slate-800" />
                        </div>
                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS :</label>
                            <span className={`inline-block p-2 text-center w-full font-black rounded ${activeInvoice.artih_postingyn === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {activeInvoice.artih_postingyn === 'Y' ? 'POSTED' : 'OPEN / DRAFT'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-100 p-4 rounded-xl border border-slate-200 font-bold text-xs">
                        <div>
                            <span className="text-slate-500 block text-[10px]">TOTAL BIAYA KIRIM:</span>
                            <span className="font-mono text-slate-800">
                                Rp {activeBTTList.reduce((s, b) => s + Number(b.bttt_harga || 0), 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px]">TOTAL BIAYA PENERUS:</span>
                            <span className="font-mono text-slate-800">
                                Rp {activeBTTList.reduce((s, b) => s + Number(b.bttt_biayapenerus || 0), 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px]">TOTAL PACKING:</span>
                            <span className="font-mono text-slate-800">
                                Rp {activeBTTList.reduce((s, b) => s + Number(b.biaya_packing || 0), 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div className="text-right border-l pl-4 border-slate-300">
                            <span className="text-slate-500 block text-[10px]">TOTAL TAGIHAN INVOICE:</span>
                            <span className="font-mono font-black text-rose-600 text-base">
                                Rp {Number(activeInvoice.artih_total || 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                            {activeInvoice?.artih_postingyn !== 'Y' && (
                                <button
                                    type="button"
                                    onClick={() => handlePostingInvoice(activeInvoice.artih_id)}
                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl uppercase transition cursor-pointer shadow-lg text-xs flex items-center gap-2"
                                >
                                    <Lock size={15} /> POSTING
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition cursor-pointer shadow-sm text-xs"
                        >
                            BATAL / KELUAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    // =========================================================================
    // ELEMEN MODAL TAMBAH INVOICE (DIDEKLARASIKAN SEBELUM RETURN)
    // =========================================================================
    const addModalElement = isAddModalOpen ? (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity z-[1000]">
            <div className={`w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                <div className="px-6 py-3.5 bg-blue-600 text-white flex items-center justify-between">
                    <div className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                        <Plus size={18} />
                        {addStep === 1 ? 'PEMBUATAN INVOICE (LANGKAH 1 DARI 2)' : 'DAFTAR NOMOR BTT (LANGKAH 2 DARI 2)'}
                    </div>
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {addStep === 1 && (
                    <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="font-bold text-slate-600 block mb-1">TANGGAL INVOICE :</label>
                                <input
                                    type="date"
                                    value={newInvoiceForm.artih_tanggal}
                                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_tanggal: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">CABANG / AGEN :</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={newInvoiceForm.artih_agenname || getActiveAgen().nama}
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-not-allowed select-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="font-bold text-slate-600 block mb-1">CUSTOMER :</label>
                                <select
                                    value={newInvoiceForm.artih_custid}
                                    onChange={(e) => handleSelectCustomerForNewInvoice(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="">-- PILIH CUSTOMER --</option>
                                    {custList.map((cust, i) => (
                                        <option key={i} value={cust.cust_id}>
                                            {cust.cust_name} [{cust.cust_id}]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">CUST ID :</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={newInvoiceForm.artih_custid || '-'}
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-indigo-600 cursor-not-allowed select-none"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">NAMA :</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={newInvoiceForm.artih_custname || '-'}
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-not-allowed select-none"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">JENIS INVOICE :</label>
                                <div className="flex items-center gap-4 mt-2">
                                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="B"
                                            checked={newInvoiceForm.artih_jenis === 'B'}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_jenis: e.target.value })}
                                        /> Tunai
                                    </label>
                                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="K"
                                            checked={newInvoiceForm.artih_jenis === 'K'}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_jenis: e.target.value })}
                                        /> Kredit
                                    </label>
                                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="T"
                                            checked={newInvoiceForm.artih_jenis === 'T'}
                                            onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_jenis: e.target.value })}
                                        /> Tagih Turun
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">KETERANGAN :</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Pembayaran resi kargo..."
                                    value={newInvoiceForm.artih_keterangan}
                                    onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, artih_keterangan: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={handleProceedToDetails}
                                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl uppercase transition cursor-pointer shadow-sm flex items-center gap-2"
                            >
                                TAMBAH RINCIAN <ArrowRight size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition cursor-pointer"
                            >
                                BATAL
                            </button>
                        </div>
                    </div>
                )}

                {addStep === 2 && (
                    <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div>
                                        <label className="font-bold text-slate-700 block text-[11px] mb-1">TANGGAL BTT :</label>
                                        <input
                                            type="date"
                                            value={bttStartDate}
                                            onChange={(e) => handleFilterBTTChange(e.target.value, bttEndDate, bttBypassTanggal, bttDisplayType)}
                                            className="p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer shadow-xs min-w-[145px]"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block text-[11px] mb-1">SAMPAI :</label>
                                        <input
                                            type="date"
                                            value={bttEndDate}
                                            onChange={(e) => handleFilterBTTChange(bttStartDate, e.target.value, bttBypassTanggal, bttDisplayType)}
                                            className="p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer shadow-xs min-w-[145px]"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={bttBypassTanggal}
                                            onChange={(e) => handleFilterBTTChange(bttStartDate, bttEndDate, e.target.checked, bttDisplayType)}
                                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                        />
                                        <span>Bypass Filter Tanggal</span>
                                    </label>

                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                                        <span className="text-slate-500 uppercase text-[10px]">Tampilkan Daftar :</span>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="btt_display_option"
                                                value="UTAMA"
                                                checked={bttDisplayType !== 'PI'}
                                                onChange={() => handleFilterBTTChange(bttStartDate, bttEndDate, bttBypassTanggal, 'UTAMA')}
                                                className="text-blue-600 cursor-pointer"
                                            />
                                            {newInvoiceForm.artih_jenis === 'B' ? 'BTT Tunai' : newInvoiceForm.artih_jenis === 'T' ? 'BTT Tagih' : 'BTT Kredit'}
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="btt_display_option"
                                                value="PI"
                                                checked={bttDisplayType === 'PI'}
                                                onChange={() => handleFilterBTTChange(bttStartDate, bttEndDate, bttBypassTanggal, 'PI')}
                                                className="text-blue-600 cursor-pointer"
                                            />
                                            Proforma Invoice
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => loadUnbilledBTTByDate(newInvoiceForm.artih_custid, bttStartDate, bttEndDate, bttBypassTanggal, bttDisplayType)}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg uppercase flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
                                >
                                    <RefreshCw size={13} className={loadingUnbilled ? 'animate-spin' : ''} /> REFRESH BTT
                                </button>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl max-h-72 overflow-y-auto shadow-inner">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead className="bg-[#004b84] text-white uppercase font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2.5">NO. BTT</th>
                                        <th className="p-2.5">TANGGAL</th>
                                        <th className="p-2.5">PENGIRIM</th>
                                        <th className="p-2.5">ISI KIRIMAN</th>
                                        <th className="p-2.5">KOTA TUJUAN</th>
                                        <th className="p-2.5 font-mono text-center">BERAT</th>
                                        <th className="p-2.5 text-right font-mono">HARGA</th>
                                        <th className="p-2.5 text-right font-mono">PENERUS</th>
                                        <th className="p-2.5 text-right font-mono">JUMLAH</th>
                                        <th className="p-2.5 text-center w-14">
                                            <input
                                                type="checkbox"
                                                checked={unbilledBTTList.length > 0 && newInvoiceForm.selected_btts.length === unbilledBTTList.length}
                                                onChange={() => {
                                                    if (newInvoiceForm.selected_btts.length === unbilledBTTList.length) {
                                                        setNewInvoiceForm(p => ({ ...p, selected_btts: [] }));
                                                    } else {
                                                        setNewInvoiceForm(p => ({ ...p, selected_btts: unbilledBTTList.map(b => b.bttt_id) }));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded cursor-pointer"
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {unbilledBTTList.map((btt, idx) => {
                                        const isChecked = newInvoiceForm.selected_btts.includes(btt.bttt_id);
                                        return (
                                            <tr key={idx} className={`hover:bg-blue-50/50 transition-colors ${isChecked ? 'bg-blue-50/80 font-bold' : ''}`}>
                                                <td className="p-2.5 font-mono text-sky-700">{btt.bttt_id}</td>
                                                <td className="p-2.5 font-mono text-slate-800">{String(btt.bttt_tanggal).split('T')[0]}</td>
                                                <td className="p-2.5 text-slate-900">{btt.bttt_asalname}</td>
                                                <td className="p-2.5 text-slate-800">{btt.bttt_namabarang || 'BARANG'}</td>
                                                <td className="p-2.5 text-slate-800">{btt.bttt_tujuankota}</td>
                                                <td className="p-2.5 font-mono text-center text-slate-800">{btt.bttt_berat} Kg</td>
                                                <td className="p-2.5 text-right font-mono text-slate-800">Rp {Number(btt.bttt_harga || 0).toLocaleString('id-ID')}</td>
                                                <td className="p-2.5 text-right font-mono text-slate-800">Rp {Number(btt.bttt_biayapenerus || 0).toLocaleString('id-ID')}</td>
                                                <td className="p-2.5 text-right font-mono text-rose-600 font-bold">
                                                    Rp {Number(btt.subtotal || btt.bttt_harga || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            setNewInvoiceForm(prev => ({
                                                                ...prev,
                                                                selected_btts: isChecked
                                                                    ? prev.selected_btts.filter(id => id !== btt.bttt_id)
                                                                    : [...prev.selected_btts, btt.bttt_id]
                                                            }));
                                                        }}
                                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {unbilledBTTList.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                                                {loadingUnbilled ? 'Memuat daftar BTT...' : 'Tidak ada resi BTT unbilled pada kriteria ini.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleSaveNewInvoice}
                                    className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl uppercase transition cursor-pointer shadow-md"
                                >
                                    SIMPAN INVOICE
                                </button>
                                <span className="text-slate-600 font-bold font-mono">
                                    {newInvoiceForm.selected_btts.length} Resi Dipilih
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAddStep(1)}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl uppercase transition cursor-pointer"
                            >
                                KEMBALI
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    const modalRoot = document.getElementById('modal-root') || document.body;

    return (
        <div className="space-y-5">
            {/* Panel Filter jika showFilter = true */}
            {showFilter && (
                <form onSubmit={handleApplyFilter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs transition-all">
                    <div className="flex items-center gap-2 font-black uppercase text-slate-700 tracking-wider">
                        <Filter size={16} className="text-sky-600" />
                        FILTER INVOICE PENAGIHAN PIUTANG
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
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="font-bold text-slate-500 block mb-1">TGL AKHIR</label>
                                <input
                                    type="date"
                                    disabled={bypassTanggal}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full p-2 border rounded-lg font-bold outline-none ${bypassTanggal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-800 border-slate-300 focus:border-sky-500'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CABANG</label>
                            <select
                                value={selectedCabang}
                                disabled={!isHoldingUser}
                                onChange={(e) => setSelectedCabang(e.target.value)}
                                className={`w-full p-2 border rounded-lg font-bold outline-none ${!isHoldingUser ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed select-none' : 'bg-white border-slate-300 text-slate-800 focus:border-sky-500 cursor-pointer'}`}
                            >
                                {isHoldingUser && <option value="">-- SEMUA CABANG --</option>}
                                {!isHoldingUser ? (
                                    <option value={currentActiveAgen.id}>{currentActiveAgen.nama}</option>
                                ) : (
                                    cabangList.map((c, i) => (
                                        <option key={i} value={c.agen_id || c.AgenID}>
                                            {c.agen_nama || c.AgenNama}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">JENIS INVOICE</label>
                            <select
                                value={selectedJenis}
                                onChange={(e) => setSelectedJenis(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA JENIS --</option>
                                <option value="K">Kredit (Langganan Tempo)</option>
                                <option value="B">Tunai (Cash)</option>
                                <option value="T">Tagih Turun (COD)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">STATUS PEMBAYARAN</label>
                            <select
                                value={selectedTerbayar}
                                onChange={(e) => setSelectedTerbayar(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            >
                                <option value="">-- SEMUA STATUS --</option>
                                <option value="Y">Lunas</option>
                                <option value="N">Belum Lunas</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">CUSTOMER</label>
                            <input
                                type="text"
                                placeholder="Cari nama customer..."
                                value={searchCustomer}
                                onChange={(e) => setSearchCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. INVOICE</label>
                            <input
                                type="text"
                                placeholder="Nomor invoice..."
                                value={searchInvoice}
                                onChange={(e) => setSearchInvoice(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-500 block mb-1">NO. KWITANSI</label>
                            <input
                                type="text"
                                placeholder="Nomor kwitansi..."
                                value={searchKwitansi}
                                onChange={(e) => setSearchKwitansi(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 mt-5">
                                <input
                                    type="checkbox"
                                    checked={bypassTanggal}
                                    onChange={(e) => setBypassTanggal(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded"
                                />
                                Bypass Filter Tanggal
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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

            {/* Template Tabel Dashboard: HANYA 1 KOLOM AKSI (props onEdit dan onDelete dilepas agar tidak double) */}
            <DataTableTemplate
                title="INVOICE PENAGIHAN"
                columns={columns}
                data={data}
                loading={loading}
                isDarkMode={isDarkMode}
                isAddDisabled={false}
                hideAddButton={false}
                onFilter={() => setShowFilter(prev => !prev)}
                onAdd={() => {
                    const currentAgen = getActiveAgen();
                    setNewInvoiceForm({
                        artih_tanggal: today,
                        artih_custid: '',
                        artih_custname: '',
                        artih_agenid: currentAgen.id,
                        artih_agenname: currentAgen.nama,
                        artih_jenis: 'K',
                        artih_fktpajak: '',
                        artih_keterangan: '',
                        selected_btts: []
                    });
                    setAddStep(1);
                    setUnbilledBTTList([]);
                    setBttBypassTanggal(false);
                    setIsAddModalOpen(true);
                }}
            />

            {addModalElement && ReactDOM.createPortal(addModalElement, modalRoot)}
            {editModalElement && ReactDOM.createPortal(editModalElement, modalRoot)}
        </div>
    );
};

export default Invoice;
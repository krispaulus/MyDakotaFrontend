import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import DataTableTemplate from '../components/organisms/DataTableTemplate';
import { useDarkMode } from '../context/DarkModeContext';
import {
    Truck, RefreshCw, X as XIcon, Save, Printer,
    PackageCheck, CheckCircle2, XCircle, QrCode,
    Trash2, ArrowUpCircle, ArrowDownCircle, PlusCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import dliLogo from '../assets/logoDLI.png';

const Loper = () => {
    const { isDarkMode } = useDarkMode();
    const [loperList, setLoperList] = useState([]);
    const [loading, setLoading] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const [filterTgla, setFilterTgla] = useState('2025-01-01');
    const [filterTgle, setFilterTgle] = useState(today);
    const [filterNoLoper, setFilterNoLoper] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Filter tambahan agar sinkron dengan Cetak & Cetak Detail
    const [filterNoMobil, setFilterNoMobil] = useState('');
    const [filterSopir, setFilterSopir] = useState('');
    const [filterKerani, setFilterKerani] = useState('');
    const [filterNoBtt, setFilterNoBtt] = useState('');

    // State Modal Tambah Loper Langsung dari BTT (opr_t_loper_a_BTT.asp)
    const [isDirectBttOpen, setIsDirectBttOpen] = useState(false);
    const [submittingDirect, setSubmittingDirect] = useState(false);
    const [directForm, setDirectForm] = useState({
        loper_tanggal: today,
        loper_nomobil: '',
        loper_nipsopir: '',
        loper_keraniyn: 'N',
        loper_nipkerani: ''
    });
    const [printingReport, setPrintingReport] = useState(false);


    // Master Data
    const [kendaraanList, setKendaraanList] = useState([]);
    const [sopirList, setSopirList] = useState([]);
    const [approvedLoadings, setApprovedLoadings] = useState([]);

    // =========================================================================
    // STATE MODAL PEMBUATAN SURAT LOPER DARI LOADING (ALUR IMAGE 2 -> 3 -> 4 -> 5)
    // =========================================================================
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingCheckInput, setLoadingCheckInput] = useState('');
    const [checkingLoading, setCheckingLoading] = useState(false);
    const [checkedSummary, setCheckedSummary] = useState(null);
    const [checkedBttList, setCheckedBttList] = useState([]);
    const [showDetailStep, setShowDetailStep] = useState(false);

    const [formLoper, setFormLoper] = useState({
        loper_tanggal: today,
        loper_loadhid: '',
        loper_nomobil: '',
        loper_nipsopir: '',
        loper_keraniyn: 'N',
        loper_nipkerani: '',
        manual_btt_text: ''
    });

    // =========================================================================
    // STATE MODAL EDIT MANIFES LOPER (SESUAI OPR_T_LOPER_E.ASP MODERN)
    // =========================================================================
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editHeader, setEditHeader] = useState({
        loper_eid: '',
        loper_tanggal: '',
        loper_nomobil: '',
        loper_nipsopir: '',
        loper_keraniyn: 'N',
        loper_nipkerani: '',
        loper_otp: '',
        loper_loadhid: ''
    });
    const [editDetails, setEditDetails] = useState([]);
    const [selectedBttToDelete, setSelectedBttToDelete] = useState([]);

    // State Barcode Scan Naik & Turun
    const [scanBttNaik, setScanBttNaik] = useState('');
    const [scanSjNaik, setScanSjNaik] = useState('');
    const [scanBttTurun, setScanBttTurun] = useState('');
    const [scanSjTurun, setScanSjTurun] = useState('');
    const bttNaikInputRef = useRef(null);

    // State Daftar BTT Belum Dipilih (BTT Naik / BTT Turun)
    const [availTglA, setAvailTglA] = useState(today);
    const [availTglE, setAvailTglE] = useState(today);
    const [bypassTgl, setBypassTgl] = useState(false);
    const [availMode, setAvailMode] = useState('');
    const [availableBtts, setAvailableBtts] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [selectedAvailBtts, setSelectedAvailBtts] = useState([]);

    useEffect(() => {
        fetchLoperData();
        fetchMasters();
    }, []);

    const fetchMasters = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [resKend, resSopir] = await Promise.all([
                api.get('/master/kendaraan', { headers }).catch(() => ({ data: [] })),
                api.get('/sopir-list', { headers }).catch(() => api.get('/sopir/list', { headers })).catch(() => ({ data: [] }))
            ]);
            setKendaraanList(resKend.data?.data || resKend.data || []);
            setSopirList(resSopir.data?.data || resSopir.data || []);
        } catch (err) {
            console.error("Gagal memuat master:", err);
        }
    };

    const fetchApprovedLoadings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper/approved-loading', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApprovedLoadings(res.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat daftar loading approved:", err);
        }
    };

    const fetchLoperData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper-list', {
                params: { tgla: filterTgla, tgle: filterTgle, loper_id: filterNoLoper },
                headers: { Authorization: `Bearer ${token}` }
            });
            setLoperList(res.data?.data || []);
        } catch {
            setLoperList([]);
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // HANDLER MODAL 1: PROSES & PEMBUATAN SURAT LOPER DARI LOADING
    // =========================================================================
    const handleOpenCreate = () => {
        setLoadingCheckInput('');
        setCheckedSummary(null);
        setCheckedBttList([]);
        setShowDetailStep(false);
        setFormLoper({
            loper_tanggal: today,
            loper_loadhid: '',
            loper_nomobil: '',
            loper_nipsopir: '',
            loper_keraniyn: 'N',
            loper_nipkerani: '',
            manual_btt_text: ''
        });
        fetchApprovedLoadings();
        setIsCreateOpen(true);
    };

    const handleCheckLoadingId = async (kodeRaw) => {
        const cleanId = (kodeRaw || loadingCheckInput).trim().toUpperCase();
        if (!cleanId) {
            Swal.fire('Peringatan', 'Masukkan Nomor Loading Barang terlebih dahulu!', 'warning');
            return;
        }

        setLoadingCheckInput(cleanId);
        setCheckingLoading(true);
        setCheckedSummary(null);
        setCheckedBttList([]);
        setShowDetailStep(false);

        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper/check-loading', {
                params: { loadh_id: cleanId },
                headers: { Authorization: `Bearer ${token}` }
            });

            const sum = res.data?.summary;
            const btts = res.data?.btt_details || [];

            setCheckedSummary(sum);
            setCheckedBttList(btts);

            const hasKerani = Boolean(sum?.sopir2_nip);
            setFormLoper({
                loper_tanggal: today,
                loper_loadhid: sum?.loadh_id || cleanId,
                loper_nomobil: sum?.loadh_kendid || '',
                loper_nipsopir: sum?.sopir1_nip || '',
                loper_keraniyn: hasKerani ? 'Y' : 'N',
                loper_nipkerani: sum?.sopir2_nip || '',
                manual_btt_text: ''
            });
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Gagal memeriksa Nomor Loading.';
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: errMsg,
                confirmButtonColor: '#004b84'
            });
        } finally {
            setCheckingLoading(false);
        }
    };

    const handleSubmitLoper = async (e) => {
        if (e) e.preventDefault();

        if (!formLoper.loper_nomobil || !formLoper.loper_nipsopir) {
            Swal.fire('Peringatan', 'Nomor Mobil dan Sopir/Pengemudi wajib diisi!', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const agenId = localStorage.getItem('active_agen_id') || '001';
            const res = await api.post('/operasional/loper/create-from-loading', {
                loper_agenid: agenId,
                loper_tanggal: `${formLoper.loper_tanggal} 08:00:00`,
                loper_loadhid: formLoper.loper_loadhid,
                loper_nomobil: formLoper.loper_nomobil,
                loper_nipsopir: formLoper.loper_nipsopir,
                loper_keraniyn: formLoper.loper_keraniyn,
                loper_nipkerani: formLoper.loper_keraniyn === 'Y' ? formLoper.loper_nipkerani : '',
                manual_btt_list: []
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                icon: 'success',
                title: 'Surat Loper Berhasil Diproses!',
                html: `Nomor Loper: <b>${res.data?.loper_eid}</b><br/>OTP Driver: <b style="font-size:16px;color:#059669;">${res.data?.otp}</b><br/>Total BTT Masuk: <b>${res.data?.total_btt} BTT</b>`
            });
            setIsCreateOpen(false);
            fetchLoperData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memproses Surat Loper', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // =========================================================================
    // HANDLER MODAL 2: EDIT & KELOLA LOPER BARANG
    // =========================================================================
    const loadEditDetailData = async (loperId) => {
        setLoadingEdit(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper/detail', {
                params: { loper_id: loperId },
                headers: { Authorization: `Bearer ${token}` }
            });
            const hdr = res.data?.header || {};
            setEditHeader({
                loper_eid: hdr.loper_eid || loperId,
                loper_tanggal: hdr.loper_tanggal ? hdr.loper_tanggal.slice(0, 10) : today,
                loper_nomobil: hdr.loper_nomobil || '',
                loper_nipsopir: hdr.loper_nipsopir !== '-' ? hdr.loper_nipsopir : '',
                loper_keraniyn: hdr.loper_keraniyn === 'Y' ? 'Y' : 'N',
                loper_nipkerani: hdr.loper_nipkerani !== '-' ? hdr.loper_nipkerani : '',
                loper_otp: hdr.loper_otp || '-',
                loper_loadhid: hdr.loper_loadhid || '-'
            });
            setEditDetails(res.data?.details || []);
            setSelectedBttToDelete([]);
        } catch {
            Swal.fire('Gagal', 'Tidak dapat memuat detail Manifes Loper', 'error');
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleOpenEdit = async (item) => {
        setIsEditOpen(true);
        setScanBttNaik('');
        setScanSjNaik('');
        setScanBttTurun('');
        setScanSjTurun('');
        setAvailMode('');
        setAvailableBtts([]);
        setSelectedAvailBtts([]);
        await loadEditDetailData(item.loper_eid);
        setTimeout(() => {
            if (bttNaikInputRef.current) bttNaikInputRef.current.focus();
        }, 250);
    };

    const handleSaveEditHeader = async () => {
        if (!editHeader.loper_nomobil || !editHeader.loper_nipsopir) {
            Swal.fire('Peringatan', 'Nomor Mobil dan Sopir wajib diisi!', 'warning');
            return;
        }
        setSavingEdit(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.put('/operasional/loper/update-header', {
                loper_eid: editHeader.loper_eid,
                loper_tanggal: `${editHeader.loper_tanggal} 08:00:00`,
                loper_nomobil: editHeader.loper_nomobil,
                loper_nipsopir: editHeader.loper_nipsopir,
                loper_keraniyn: editHeader.loper_keraniyn,
                loper_nipkerani: editHeader.loper_keraniyn === 'Y' ? editHeader.loper_nipkerani : ''
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: res.data?.message || 'Perubahan disimpan!',
                showConfirmButton: false,
                timer: 1600
            });
            fetchLoperData();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan perubahan header', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleScanBarcodeSubmit = async (mode, kodeValue, resetSetter) => {
        const cleanCode = (kodeValue || '').trim().toUpperCase();
        if (!cleanCode) return;

        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/operasional/loper/add-btt', {
                loper_eid: editHeader.loper_eid,
                mode,
                kode_scan: cleanCode
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            resetSetter('');
            await loadEditDetailData(editHeader.loper_eid);
            fetchLoperData();
            if (availMode) fetchAvailableBttList(availMode, availTglA, availTglE, bypassTgl);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: res.data?.message || 'Berhasil ditambahkan!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            resetSetter('');
            Swal.fire('Perhatian', err.response?.data?.message || 'Kode tidak valid atau sudah terdaftar', 'warning');
        }
    };

    const handleDeleteCheckedBtts = async () => {
        if (selectedBttToDelete.length === 0) return;

        const confirm = await Swal.fire({
            title: `Hapus ${selectedBttToDelete.length} BTT Terpilih?`,
            text: 'BTT yang dicentang akan dikeluarkan dari Manifes Loper ini.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (!confirm.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            await api.post('/operasional/loper/remove-btt', {
                loper_eid: editHeader.loper_eid,
                btt_list: selectedBttToDelete
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await loadEditDetailData(editHeader.loper_eid);
            fetchLoperData();
            if (availMode) fetchAvailableBttList(availMode, availTglA, availTglE, bypassTgl);
        } catch {
            Swal.fire('Gagal', 'Gagal menghapus BTT terpilih', 'error');
        }
    };

    const fetchAvailableBttList = async (mode, tglA, tglE, isBypass) => {
        if (!mode) return;
        setLoadingAvailable(true);
        setSelectedAvailBtts([]);
        try {
            const token = localStorage.getItem('token');
            const agenId = localStorage.getItem('active_agen_id') || '001';
            const res = await api.get('/operasional/loper/available-btt', {
                params: {
                    tipe: mode,
                    agen_id: agenId,
                    tgla: tglA,
                    tgle: tglE,
                    bypass_tgl: isBypass
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableBtts(res.data?.data || []);
        } catch {
            setAvailableBtts([]);
        } finally {
            setLoadingAvailable(false);
        }
    };

    const handleAddSelectedAvailableBtts = async () => {
        if (selectedAvailBtts.length === 0) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/operasional/loper/add-btt', {
                loper_eid: editHeader.loper_eid,
                mode: 'CHECKLIST',
                btt_list: selectedAvailBtts
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await loadEditDetailData(editHeader.loper_eid);
            fetchLoperData();
            await fetchAvailableBttList(availMode, availTglA, availTglE, bypassTgl);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: res.data?.message || 'BTT berhasil dimasukkan!',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal menambahkan BTT terpilih', 'error');
        }
    };

    const handleDeleteLoper = (item) => {
        Swal.fire({
            title: 'Batalkan Manifes Loper?',
            text: `Yakin ingin membatalkan Manifes Loper ${item.loper_eid}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Ya, Batalkan'
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await api.delete('/operasional/loper/delete', {
                        params: { loper_id: item.loper_eid },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Dibatalkan!', 'Manifes Loper berhasil dinonaktifkan.', 'success');
                    fetchLoperData();
                } catch {
                    Swal.fire('Gagal', 'Gagal membatalkan loper', 'error');
                }
            }
        });
    };

    const handlePrintLoper = () => {
        const printWin = window.open('', '_blank', 'width=1300,height=800');
        if (!printWin) return;

        const adminName = localStorage.getItem('username') || 'ADMIN OPS';
        const agenId = localStorage.getItem('active_agen_id') || '001';
        const isPusat = agenId === '001' || agenId === '1';
        const sopirObj = sopirList.find(s => s.kry_nip === editHeader.loper_nipsopir);
        const keraniObj = sopirList.find(s => s.kry_nip === editHeader.loper_nipkerani);

        // Hitung total berat per alamat & rowspan insentif (sesuai logika opr_t_loper_print.asp)
        const alamatWeightMap = {};
        const alamatCountMap = {};
        editDetails.forEach(d => {
            const al = (d.alamat || '-').trim();
            alamatWeightMap[al] = (alamatWeightMap[al] || 0) + Number(d.berat || 0);
            alamatCountMap[al] = (alamatCountMap[al] || 0) + 1;
        });

        const hitungRateInsentif = (beratTotal) => {
            let rate = 0;
            if (beratTotal >= 1 && beratTotal <= 100) rate = 2500;
            else if (beratTotal >= 101 && beratTotal <= 200) rate = 5000;
            else if (beratTotal >= 201 && beratTotal <= 1000) rate = 10000;
            else if (beratTotal > 1000) rate = 15000;
            return isPusat ? rate : rate / 2;
        };

        let totalJml = 0;
        let totalBerat = 0;
        let totalVol = 0;
        let totalUkuran = 0;
        let totalHarga = 0;
        let totalInsentif = 0;
        let lastAlamat = null;

        const rowsHtml = editDetails.map((d, i) => {
            const jml = Number(d.jml_koli || 0);
            const brt = Number(d.berat || 0);
            const vol = Number(d.berat_vol || 0);
            const ukr = Number(d.ukuran || 0);
            const hrg = Number(d.harga || 0);

            totalJml += jml;
            totalBerat += brt;
            totalVol += vol;
            totalUkuran += ukr;
            totalHarga += hrg;

            const currentAlamat = (d.alamat || '-').trim();
            let insentifCellHtml = '';
            if (currentAlamat !== lastAlamat) {
                const rowspan = alamatCountMap[currentAlamat] || 1;
                const isValidUpdate = /^\d{10}$/.test(String(d.input_oleh || '').trim());
                const nilaiInsentif = (d.status_bbl === 'Diterima' && isValidUpdate)
                    ? hitungRateInsentif(alamatWeightMap[currentAlamat])
                    : 0;
                totalInsentif += nilaiInsentif;
                insentifCellHtml = `<td rowspan="${rowspan}" style="text-align:right; font-weight:bold;">${nilaiInsentif > 0 ? nilaiInsentif.toLocaleString('id-ID') : ''}</td>`;
                lastAlamat = currentAlamat;
            }

            const penerimaText = d.up_penerima && d.up_penerima !== '-'
                ? `${d.penerima} [ ${d.up_penerima} ]`
                : (d.penerima || '-');

            return `
                <tr style="background-color:${i % 2 === 1 ? '#f8fafc' : '#ffffff'};">
                    <td style="text-align:center;">${i + 1}</td>
                    <td style="font-family:monospace; font-weight:bold; white-space:nowrap;">${d.no_btt}</td>
                    <td style="text-align:center; white-space:nowrap;">${d.tgl_btt || '-'}</td>
                    <td>${d.alamat || '-'}</td>
                    <td>${penerimaText}</td>
                    <td>${d.kota || '-'}</td>
                    <td>${d.keterangan || ''}</td>
                    <td style="text-align:right;">${jml.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${brt.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${vol.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${ukr.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${hrg.toLocaleString('id-ID')}</td>
                    <td style="text-align:center;">${d.status_bbl || ''}</td>
                    <td style="text-align:center;">${d.jam_bbl || ''}</td>
                    <td style="text-align:center; font-family:monospace;">${d.input_oleh || ''}</td>
                    ${insentifCellHtml}
                </tr>
            `;
        }).join('');

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loper BTT - ${editHeader.loper_eid}</title>
                <style>
                    @page { size: A4 landscape; margin: 8mm; }
                    body { font-family: Arial, sans-serif; font-size: 9px; color: #0f172a; margin: 0; padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th, td { border: 1px solid #94a3b8; padding: 3.5px 4px; vertical-align: middle; }
                    th { background-color: #004b84 !important; color: #ffffff !important; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.2px; }
                </style>
            </head>
            <body onload="window.print()">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <strong style="font-size:12px; color:#004b84;">PT. DAKOTA LOGISTIK INDONESIA</strong><br/>
                        <span style="font-size:9.5px; color:#475569;">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi Kota</span>
                    </div>
                    <img src="${window.location.origin}${dliLogo}" style="height:36px;" onerror="this.style.display='none'"/>
                </div>
                <div style="text-align:center; margin-top:4px;">
                    <h3 style="margin:0; font-size:13px; letter-spacing:1px;">LOPER BTT</h3>
                    <div style="font-family:monospace; font-size:12px; font-weight:bold; margin-top:2px;">NOMOR LOPER: ${editHeader.loper_eid}</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:8px; font-size:9.5px; background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1;">
                    <!-- KOLOM KIRI (BERSUSUN KE BAWAH) -->
                    <table style="width:auto; border:none; margin:0; border-collapse:collapse;">
                        <tr>
                            <td style="border:none; padding:1.5px 6px 1.5px 0; font-weight:bold;">OTP</td>
                            <td style="border:none; padding:1.5px 6px; font-weight:bold;">:</td>
                            <td style="border:none; padding:1.5px 0; font-weight:bold; font-family:monospace;">${hdrData.loper_otp || '-'}</td>
                        </tr>
                        <tr>
                            <td style="border:none; padding:1.5px 6px 1.5px 0;">Tanggal Loper</td>
                            <td style="border:none; padding:1.5px 6px;">:</td>
                            <td style="border:none; padding:1.5px 0; font-family:monospace;">${hdrData.loper_tanggal}</td>
                        </tr>
                        <tr>
                            <td style="border:none; padding:1.5px 6px 1.5px 0;">No. Mobil</td>
                            <td style="border:none; padding:1.5px 6px;">:</td>
                            <td style="border:none; padding:1.5px 0; font-weight:bold; font-family:monospace;">${hdrData.loper_nomobil}</td>
                        </tr>
                    </table>

                    <!-- KOLOM KANAN (BERSUSUN KE BAWAH) -->
                    <table style="width:auto; border:none; margin:0 15% 0 0; border-collapse:collapse;">
                        <tr>
                            <td style="border:none; padding:1.5px 6px 1.5px 0;">Sopir</td>
                            <td style="border:none; padding:1.5px 6px;">:</td>
                            <td style="border:none; padding:1.5px 0; font-weight:bold;">${sopirObj?.kry_nama || hdrData.nama_sopir || '-'} (${hdrData.loper_nipsopir})</td>
                        </tr>
                        <tr>
                            <td style="border:none; padding:1.5px 6px 1.5px 0;">Kerani</td>
                            <td style="border:none; padding:1.5px 6px;">:</td>
                            <td style="border:none; padding:1.5px 0;">${hdrData.loper_keraniyn === 'Y' ? `${keraniObj?.kry_nama || hdrData.nama_kerani || '-'} (${hdrData.loper_nipkerani})` : ''}</td>
                        </tr>
                        <tr>
                            <td style="border:none; padding:1.5px 6px 1.5px 0;">&nbsp;</td>
                            <td style="border:none; padding:1.5px 6px;">:</td>
                            <td style="border:none; padding:1.5px 0;">&nbsp;</td>
                        </tr>
                    </table>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width:22px;">No</th>
                            <th>No. BTT</th>
                            <th>Tanggal</th>
                            <th>Alamat</th>
                            <th>Penerima</th>
                            <th>Kota</th>
                            <th>Keterangan</th>
                            <th>Jml</th>
                            <th>Berat</th>
                            <th>Berat Volume</th>
                            <th>Ukuran</th>
                            <th>Harga</th>
                            <th>STATUS</th>
                            <th>JAM</th>
                            <th>Diinput Oleh</th>
                            <th>INSENTIF</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr style="font-weight:bold; background:#e2e8f0;">
                            <td colspan="7" style="text-align:right; padding-right:8px;">Total</td>
                            <td style="text-align:right;">${totalJml.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalBerat.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalVol.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalUkuran.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalHarga.toLocaleString('id-ID')}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style="text-align:right;">${totalInsentif > 0 ? totalInsentif.toLocaleString('id-ID') : '0'}</td>
                        </tr>
                    </tfoot>
                </table>
                <div style="display:flex; justify-content:space-around; text-align:center; margin-top:24px; font-size:9.5px;">
                    <div>Mengetahui,<br/><br/><br/>( ____________________ )</div>
                    <div>Pembuat,<br/><br/><br/>( ${adminName} )</div>
                    <div>Sopir / Petugas,<br/><br/><br/>( ____________________ )</div>
                </div>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    const printLoperDocument = (hdrData, detailsData) => {
        const printWin = window.open('', '_blank', 'width=1300,height=800');
        if (!printWin) return;

        const adminName = localStorage.getItem('username') || 'ADMIN OPS';
        const agenId = localStorage.getItem('active_agen_id') || '001';
        const isPusat = agenId === '001' || agenId === '1';
        const sopirObj = sopirList.find(s => s.kry_nip === hdrData.loper_nipsopir);
        const keraniObj = sopirList.find(s => s.kry_nip === hdrData.loper_nipkerani);

        const alamatWeightMap = {};
        const alamatCountMap = {};
        detailsData.forEach(d => {
            const al = (d.alamat || '-').trim();
            alamatWeightMap[al] = (alamatWeightMap[al] || 0) + Number(d.berat || 0);
            alamatCountMap[al] = (alamatCountMap[al] || 0) + 1;
        });

        const hitungRateInsentif = (beratTotal) => {
            let rate = 0;
            if (beratTotal >= 1 && beratTotal <= 100) rate = 2500;
            else if (beratTotal >= 101 && beratTotal <= 200) rate = 5000;
            else if (beratTotal >= 201 && beratTotal <= 1000) rate = 10000;
            else if (beratTotal > 1000) rate = 15000;
            return isPusat ? rate : rate / 2;
        };

        let totalJml = 0;
        let totalBerat = 0;
        let totalVol = 0;
        let totalUkuran = 0;
        let totalHarga = 0;
        let totalInsentif = 0;
        let lastAlamat = null;

        const rowsHtml = detailsData.map((d, i) => {
            const jml = Number(d.jml_koli || 0);
            const brt = Number(d.berat || 0);
            const vol = Number(d.berat_vol || 0);
            const ukr = Number(d.ukuran || 0);
            const hrg = Number(d.harga || 0);

            totalJml += jml;
            totalBerat += brt;
            totalVol += vol;
            totalUkuran += ukr;
            totalHarga += hrg;

            const currentAlamat = (d.alamat || '-').trim();
            let insentifCellHtml = '';
            if (currentAlamat !== lastAlamat) {
                const rowspan = alamatCountMap[currentAlamat] || 1;
                const isValidUpdate = /^\d{10}$/.test(String(d.input_oleh || '').trim());
                const nilaiInsentif = (d.status_bbl === 'Diterima' && isValidUpdate)
                    ? hitungRateInsentif(alamatWeightMap[currentAlamat])
                    : 0;
                totalInsentif += nilaiInsentif;
                insentifCellHtml = `<td rowspan="${rowspan}" style="text-align:right; font-weight:bold;">${nilaiInsentif > 0 ? nilaiInsentif.toLocaleString('id-ID') : ''}</td>`;
                lastAlamat = currentAlamat;
            }

            const penerimaText = d.up_penerima && d.up_penerima !== '-'
                ? `${d.penerima} [ ${d.up_penerima} ]`
                : (d.penerima || '-');

            return `
                <tr style="background-color:${i % 2 === 1 ? '#f8fafc' : '#ffffff'};">
                    <td style="text-align:center;">${i + 1}</td>
                    <td style="font-family:monospace; font-weight:bold; white-space:nowrap;">${d.no_btt}</td>
                    <td style="text-align:center; white-space:nowrap;">${d.tgl_btt || '-'}</td>
                    <td>${d.alamat || '-'}</td>
                    <td>${penerimaText}</td>
                    <td>${d.kota || '-'}</td>
                    <td>${d.keterangan || ''}</td>
                    <td style="text-align:right;">${jml.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${brt.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${vol.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${ukr.toLocaleString('id-ID')}</td>
                    <td style="text-align:right;">${hrg.toLocaleString('id-ID')}</td>
                    <td style="text-align:center;">${d.status_bbl || ''}</td>
                    <td style="text-align:center;">${d.jam_bbl || ''}</td>
                    <td style="text-align:center; font-family:monospace;">${d.input_oleh || ''}</td>
                    ${insentifCellHtml}
                </tr>
            `;
        }).join('');

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loper BTT - ${hdrData.loper_eid}</title>
                <style>
                    @page { size: A4 landscape; margin: 8mm; }
                    body { font-family: Arial, sans-serif; font-size: 9px; color: #0f172a; margin: 0; padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th, td { border: 1px solid #94a3b8; padding: 3.5px 4px; vertical-align: middle; }
                    th { background-color: #004b84 !important; color: #ffffff !important; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.2px; }
                </style>
            </head>
            <body onload="window.print()">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <strong style="font-size:12px; color:#004b84;">PT. DAKOTA LOGISTIK INDONESIA</strong><br/>
                        <span style="font-size:9.5px; color:#475569;">Jl. Wibawa Mukti II No. 8 Jatiasih, Bekasi Kota</span>
                    </div>
                    <img src="${window.location.origin}${dliLogo}" style="height:36px;" onerror="this.style.display='none'"/>
                </div>
                <div style="text-align:center; margin-top:4px;">
                    <h3 style="margin:0; font-size:13px; letter-spacing:1px;">LOPER BTT</h3>
                    <div style="font-family:monospace; font-size:12px; font-weight:bold; margin-top:2px;">NOMOR LOPER: ${hdrData.loper_eid}</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:8px; font-size:9.5px; background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1;">
                <!-- KOLOM KIRI (BERSUSUN KE BAWAH) -->
                <table style="width:auto; border:none; margin:0; border-collapse:collapse;">
                    <tr>
                        <td style="border:none; padding:1.5px 6px 1.5px 0; font-weight:bold;">OTP</td>
                        <td style="border:none; padding:1.5px 6px; font-weight:bold;">:</td>
                        <td style="border:none; padding:1.5px 0; font-weight:bold; font-family:monospace;">${hdrData.loper_otp || '-'}</td>
                    </tr>
                    <tr>
                        <td style="border:none; padding:1.5px 6px 1.5px 0;">Tanggal Loper</td>
                        <td style="border:none; padding:1.5px 6px;">:</td>
                        <td style="border:none; padding:1.5px 0; font-family:monospace;">${hdrData.loper_tanggal}</td>
                    </tr>
                    <tr>
                        <td style="border:none; padding:1.5px 6px 1.5px 0;">No. Mobil</td>
                        <td style="border:none; padding:1.5px 6px;">:</td>
                        <td style="border:none; padding:1.5px 0; font-weight:bold; font-family:monospace;">${hdrData.loper_nomobil}</td>
                    </tr>
                </table>

                <!-- KOLOM KANAN (BERSUSUN KE BAWAH) -->
                <table style="width:auto; border:none; margin:0 15% 0 0; border-collapse:collapse;">
                    <tr>
                        <td style="border:none; padding:1.5px 6px 1.5px 0;">Sopir</td>
                        <td style="border:none; padding:1.5px 6px;">:</td>
                        <td style="border:none; padding:1.5px 0; font-weight:bold;">${sopirObj?.kry_nama || hdrData.nama_sopir || '-'} (${hdrData.loper_nipsopir})</td>
                    </tr>
                    <tr>
                        <td style="border:none; padding:1.5px 6px 1.5px 0;">Kerani</td>
                        <td style="border:none; padding:1.5px 6px;">:</td>
                        <td style="border:none; padding:1.5px 0;">${hdrData.loper_keraniyn === 'Y' ? `${keraniObj?.kry_nama || hdrData.nama_kerani || '-'} (${hdrData.loper_nipkerani})` : ''}</td>
                    </tr>
                </table>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width:22px;">No</th>
                            <th>No. BTT</th>
                            <th>Tanggal</th>
                            <th>Alamat</th>
                            <th>Penerima</th>
                            <th>Kota</th>
                            <th>Keterangan</th>
                            <th>Jml</th>
                            <th>Berat</th>
                            <th>Berat Volume</th>
                            <th>Ukuran</th>
                            <th>Harga</th>
                            <th>STATUS</th>
                            <th>JAM</th>
                            <th>Diinput Oleh</th>
                            <th>INSENTIF</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr style="font-weight:bold; background:#e2e8f0;">
                            <td colspan="7" style="text-align:right; padding-right:8px;">Total</td>
                            <td style="text-align:right;">${totalJml.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalBerat.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalVol.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalUkuran.toLocaleString('id-ID')}</td>
                            <td style="text-align:right;">${totalHarga.toLocaleString('id-ID')}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style="text-align:right;">${totalInsentif > 0 ? totalInsentif.toLocaleString('id-ID') : '0'}</td>
                        </tr>
                    </tfoot>
                </table>
                <div style="display:flex; justify-content:space-around; text-align:center; margin-top:24px; font-size:9.5px;">
                    <div>Mengetahui,<br/><br/><br/>( ____________________ )</div>
                    <div>Pembuat,<br/><br/><br/>( ${adminName} )</div>
                    <div>Sopir / Petugas,<br/><br/><br/>( ____________________ )</div>
                </div>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    const handleDirectPrintFromRow = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper/detail', {
                params: { loper_id: item.loper_eid },
                headers: { Authorization: `Bearer ${token}` }
            });
            const hdr = res.data?.header || item;
            const dets = res.data?.details || [];
            setEditHeader({
                loper_eid: hdr.loper_eid || item.loper_eid,
                loper_tanggal: hdr.loper_tanggal ? hdr.loper_tanggal.slice(0, 10) : today,
                loper_nomobil: hdr.loper_nomobil || item.loper_nomobil || '',
                loper_nipsopir: hdr.loper_nipsopir !== '-' ? hdr.loper_nipsopir : '',
                loper_keraniyn: hdr.loper_keraniyn === 'Y' ? 'Y' : 'N',
                loper_nipkerani: hdr.loper_nipkerani !== '-' ? hdr.loper_nipkerani : '',
                loper_otp: hdr.loper_otp || '-',
                loper_loadhid: hdr.loper_loadhid || '-'
            });
            setEditDetails(dets);
            // Panggil fungsi cetak dengan data terbaru
            printLoperDocument(hdr, dets);
        } catch {
            Swal.fire('Gagal', 'Tidak dapat memuat data untuk cetak Surat Loper', 'error');
        }
    };

    const columns = [
        {
            header: 'NO. MANIFES LOPER',
            accessor: 'loper_eid',
            render: (i) => (
                <button type="button" onClick={() => handleOpenEdit(i)} className="font-mono font-bold text-indigo-700 hover:underline cursor-pointer">
                    {i.loper_eid}
                </button>
            )
        },
        {
            header: 'TANGGAL LOPER',
            accessor: 'loper_tanggal',
            render: (i) => <span className="font-mono text-slate-600">{i.loper_tanggal}</span>
        },
        {
            header: 'NO. MOBIL',
            accessor: 'loper_nomobil',
            render: (i) => <span className="bg-slate-800 text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded text-xs">{i.loper_nomobil}</span>
        },
        {
            header: 'SOPIR',
            accessor: 'nama_sopir',
            render: (i) => <span className="font-bold uppercase text-slate-800">{i.nama_sopir} ({i.loper_nipsopir})</span>
        },
        {
            header: 'KERANI / HELPER',
            accessor: 'nama_kerani',
            render: (i) => <span className="text-slate-600 uppercase">{i.loper_keraniyn === 'Y' ? `${i.nama_kerani} (${i.loper_nipkerani})` : '-'}</span>
        },
        {
            header: 'TOTAL BTT',
            accessor: 'total_btt',
            render: (i) => <span className="font-mono font-bold text-slate-800">{i.total_btt} Resi</span>
        },
        {
            header: 'STATUS',
            accessor: 'loper_aktifyn',
            render: (i) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${i.loper_aktifyn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {i.loper_aktifyn === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {i.loper_aktifyn === 'Y' ? 'AKTIF' : 'BATAL'}
                </span>
            )
        },

        {
            header: 'ACTION',
            accessor: 'action',
            render: (item) => (
                <div className="flex items-center justify-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Manifes Loper"
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                    >
                        <Truck size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDirectPrintFromRow(item)}
                        title="Cetak Surat Loper"
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                    >
                        <Printer size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteLoper(item)}
                        title="Hapus Manifes Loper"
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )
        }
    ];

    const filteredList = loperList.filter(item => {
        if (item.loper_aktifyn === 'N') return false;
        if (!globalSearch.trim()) return true;
        const q = globalSearch.toLowerCase();
        return (
            (item.loper_eid && item.loper_eid.toLowerCase().includes(q)) ||
            (item.loper_nomobil && item.loper_nomobil.toLowerCase().includes(q)) ||
            (item.nama_sopir && item.nama_sopir.toLowerCase().includes(q))
        );
    });

    // 1. HANDLER TAMBAH LOPER LANGSUNG DARI BTT (opr_t_loper_a_BTT.asp)
    const handleOpenDirectBtt = () => {
        setDirectForm({
            loper_tanggal: today,
            loper_nomobil: '',
            loper_nipsopir: '',
            loper_keraniyn: 'N',
            loper_nipkerani: ''
        });
        setIsDirectBttOpen(true);
    };

    const handleSubmitDirectBtt = async (e) => {
        e.preventDefault();
        if (!directForm.loper_nomobil || !directForm.loper_nipsopir) {
            Swal.fire('Peringatan', 'Nomor Mobil dan Sopir/Pengemudi wajib dipilih!', 'warning');
            return;
        }
        if (directForm.loper_keraniyn === 'Y' && !directForm.loper_nipkerani) {
            Swal.fire('Peringatan', 'Nama Kerani wajib dipilih jika Kerani = Ya!', 'warning');
            return;
        }

        setSubmittingDirect(true);
        try {
            const token = localStorage.getItem('token');
            const agenId = localStorage.getItem('active_agen_id') || '001';
            const res = await api.post('/operasional/loper/create-direct-btt', {
                loper_agenid: agenId,
                loper_tanggal: directForm.loper_tanggal,
                loper_nomobil: directForm.loper_nomobil,
                loper_nipsopir: directForm.loper_nipsopir,
                loper_keraniyn: directForm.loper_keraniyn,
                loper_nipkerani: directForm.loper_keraniyn === 'Y' ? directForm.loper_nipkerani : ''
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newLoperId = res.data?.loper_eid;
            setIsDirectBttOpen(false);
            fetchLoperData();

            // Langsung buka modal Edit/Scan BTT untuk Nomor Loper yang baru dibuat (persis alur ASP)
            if (newLoperId) {
                await handleOpenEdit({ loper_eid: newLoperId });
            }
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal membuat header Loper', 'error');
        } finally {
            setSubmittingDirect(false);
        }
    };

    // 2. HANDLER CETAK REKAP LAPORAN LOPER (opr_t_laporan_loper.asp)
    const handleCetakRekapLoper = async () => {
        setPrintingReport(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper/report-rekap', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    no_loper: filterNoLoper,
                    no_mobil: filterNoMobil,
                    sopir: filterSopir,
                    kerani: filterKerani,
                    no_btt: filterNoBtt
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            const rows = res.data?.data || [];
            if (rows.length === 0) {
                Swal.fire('Info', 'Tidak ada data Loper pada periode/filter ini untuk dicetak.', 'info');
                return;
            }

            const printWin = window.open('', '_blank', 'width=1350,height=800');
            if (!printWin) return;

            const adminName = localStorage.getItem('username') || 'ADMIN OPS';
            const cabangNama = localStorage.getItem('active_cabang_nama') || 'DLI PUSAT';

            let tBtt = 0, tTerloper = 0, tGagal = 0, tBlm = 0;
            let tKoliOk = 0, tBeratOk = 0, tVolOk = 0, tUkrOk = 0, tCodOk = 0;
            let tKoliNo = 0, tBeratNo = 0, tVolNo = 0, tUkrNo = 0, tCodNo = 0;

            const bodyHtml = rows.map((r, i) => {
                tBtt += Number(r.jbtt || 0);
                tTerloper += Number(r.jbtt_terloper || 0);
                tGagal += Number(r.jbtt_gagal || 0);
                tBlm += Number(r.jbtt_blm_input || 0);

                tKoliOk += Number(r.koli_berhasil || 0);
                tBeratOk += Number(r.berat_berhasil || 0);
                tVolOk += Number(r.vol_berhasil || 0);
                tUkrOk += Number(r.ukuran_berhasil || 0);
                tCodOk += Number(r.cod_berhasil || 0);

                tKoliNo += Number(r.koli_gagal || 0);
                tBeratNo += Number(r.berat_gagal || 0);
                tVolNo += Number(r.vol_gagal || 0);
                tUkrNo += Number(r.ukuran_gagal || 0);
                tCodNo += Number(r.cod_gagal || 0);

                return `
                    <tr style="background:${i % 2 === 1 ? '#f8fafc' : '#ffffff'};">
                        <td style="font-family:monospace; font-weight:bold; white-space:nowrap;">${r.loper_eid}</td>
                        <td style="text-align:center;">${r.loper_tanggal}</td>
                        <td style="font-family:monospace; font-weight:bold;">${r.loper_nomobil}</td>
                        <td>${r.nama_sopir} [ Nip : ${r.nip_sopir} ]</td>
                        <td>${r.nama_kerani !== '-' ? `${r.nama_kerani} [ Nip : ${r.nip_kerani} ]` : '-'}</td>
                        <td style="text-align:right; font-weight:bold;">${Number(r.jbtt).toLocaleString('id-ID')}</td>
                        <td style="text-align:right; color:#059669; font-weight:bold;">${Number(r.jbtt_terloper).toLocaleString('id-ID')}</td>
                        <td style="text-align:right; color:#e11d48; font-weight:bold;">${Number(r.jbtt_gagal).toLocaleString('id-ID')}</td>
                        <td style="text-align:right; color:#d97706; font-weight:bold;">${Number(r.jbtt_blm_input).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.koli_berhasil).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.berat_berhasil).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.vol_berhasil).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.ukuran_berhasil).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.cod_berhasil).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.koli_gagal).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.berat_gagal).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.vol_gagal).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.ukuran_gagal).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.cod_gagal).toLocaleString('id-ID')}</td>
                    </tr>
                `;
            }).join('');

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Laporan Loper Barang / BTT</title>
                    <style>
                        @page { size: A4 landscape; margin: 7mm; }
                        body { font-family: Arial, sans-serif; font-size: 8.5px; color: #0f172a; margin: 0; padding: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        th, td { border: 1px solid #94a3b8; padding: 3px 4px; vertical-align: middle; }
                        th { background-color: #004b84 !important; color: #ffffff !important; font-size: 8px; text-transform: uppercase; }
                    </style>
                </head>
                <body onload="window.print()">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <strong style="font-size:12px; color:#004b84;">DAKOTA LOGISTIK INDONESIA</strong><br/>
                            <span style="font-size:9px;">Cabang: <b>${cabangNama}</b> | Periode: <b>${filterTgla} s/d ${filterTgle}</b> | Dicetak oleh: <b>${adminName}</b></span>
                        </div>
                        <img src="${window.location.origin}${dliLogo}" style="height:34px;" onerror="this.style.display='none'"/>
                    </div>
                    <h3 style="text-align:center; margin:6px 0; font-size:13px; letter-spacing:1px;">LAPORAN LOPER BARANG / BTT</h3>
                    <table>
                        <thead>
                            <tr>
                                <th rowspan="2">No. Loper</th>
                                <th rowspan="2">Tanggal</th>
                                <th rowspan="2">No. Mobil</th>
                                <th rowspan="2">Supir</th>
                                <th rowspan="2">Kerani</th>
                                <th rowspan="2">BTT Keseluruhan</th>
                                <th rowspan="2">BTT Berhasil Diloper</th>
                                <th rowspan="2">BTT Gagal Diloper</th>
                                <th rowspan="2">BTT Blm Diinput</th>
                                <th colspan="5">BERHASIL DILOPER</th>
                                <th colspan="5">GAGAL DILOPER</th>
                            </tr>
                            <tr>
                                <th>Koli</th><th>Kilo</th><th>Volume</th><th>Ukuran</th><th>COD</th>
                                <th>Koli</th><th>Kilo</th><th>Volume</th><th>Ukuran</th><th>COD</th>
                            </tr>
                        </thead>
                        <tbody>${bodyHtml}</tbody>
                        <tfoot>
                            <tr style="font-weight:bold; background:#e2e8f0;">
                                <td colspan="5" style="text-align:right;">TOTAL KESELURUHAN :</td>
                                <td style="text-align:right;">${tBtt.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tTerloper.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tGagal.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tBlm.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tKoliOk.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tBeratOk.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tVolOk.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tUkrOk.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tCodOk.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tKoliNo.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tBeratNo.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tVolNo.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tUkrNo.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tCodNo.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `);
            printWin.document.close();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memuat laporan rekap loper', 'error');
        } finally {
            setPrintingReport(false);
        }
    };

    // 3. HANDLER CETAK DETAIL LAPORAN LOPER (opr_t_laporan_loper_detail.asp)
    const handleCetakDetailLoper = async () => {
        setPrintingReport(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/operasional/loper/report-detail', {
                params: {
                    tgla: filterTgla,
                    tgle: filterTgle,
                    no_loper: filterNoLoper,
                    no_mobil: filterNoMobil,
                    sopir: filterSopir,
                    kerani: filterKerani,
                    no_btt: filterNoBtt
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            const rows = res.data?.data || [];
            if (rows.length === 0) {
                Swal.fire('Info', 'Tidak ada data detail BTT Loper pada periode/filter ini untuk dicetak.', 'info');
                return;
            }

            const printWin = window.open('', '_blank', 'width=1250,height=800');
            if (!printWin) return;

            const adminName = localStorage.getItem('username') || 'ADMIN OPS';
            const cabangNama = localStorage.getItem('active_cabang_nama') || 'DLI PUSAT';

            let tColly = 0, tBerat = 0, tHarga = 0, tPenerus = 0;

            const bodyHtml = rows.map((r, i) => {
                tColly += Number(r.colly || 0);
                tBerat += Number(r.berat || 0);
                tHarga += Number(r.harga || 0);
                tPenerus += Number(r.biaya_penerus || 0);

                return `
                    <tr style="background:${i % 2 === 1 ? '#f8fafc' : '#ffffff'};">
                        <td style="font-family:monospace; font-weight:bold; white-space:nowrap;">${r.loper_eid}</td>
                        <td style="text-align:center;">${r.loper_tanggal}</td>
                        <td style="font-family:monospace; font-weight:bold;">${r.loper_nomobil}</td>
                        <td>${r.nama_sopir} [ Nip : ${r.nip_sopir} ]</td>
                        <td>${r.nama_kerani !== '-' ? `${r.nama_kerani} [ Nip : ${r.nip_kerani} ]` : '-'}</td>
                        <td style="font-family:monospace; font-weight:bold;">${r.no_btt}</td>
                        <td style="text-align:right;">${Number(r.colly).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.berat).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="text-align:right;">${Number(r.harga).toLocaleString('id-ID')}</td>
                        <td style="text-align:right;">${Number(r.biaya_penerus).toLocaleString('id-ID')}</td>
                    </tr>
                `;
            }).join('');

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Laporan Detail Loper Barang / BTT</title>
                    <style>
                        @page { size: A4 landscape; margin: 8mm; }
                        body { font-family: Arial, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        th, td { border: 1px solid #94a3b8; padding: 4px 5px; vertical-align: middle; }
                        th { background-color: #004b84 !important; color: #ffffff !important; font-size: 9px; text-transform: uppercase; }
                    </style>
                </head>
                <body onload="window.print()">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <strong style="font-size:12px; color:#004b84;">DAKOTA LOGISTIK INDONESIA</strong><br/>
                            <span style="font-size:9.5px;">Cabang: <b>${cabangNama}</b> | Periode: <b>${filterTgla} s/d ${filterTgle}</b> | Dicetak oleh: <b>${adminName}</b></span>
                        </div>
                        <img src="${window.location.origin}${dliLogo}" style="height:36px;" onerror="this.style.display='none'"/>
                    </div>
                    <h3 style="text-align:center; margin:8px 0; font-size:13px; letter-spacing:1px;">LAPORAN DETAIL LOPER BARANG / BTT</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>No. Loper</th>
                                <th>Tanggal</th>
                                <th>No. Mobil</th>
                                <th>Supir</th>
                                <th>Kerani</th>
                                <th>No. BTT</th>
                                <th>Colly</th>
                                <th>Berat</th>
                                <th>Harga</th>
                                <th>Penerus</th>
                            </tr>
                        </thead>
                        <tbody>${bodyHtml}</tbody>
                        <tfoot>
                            <tr style="font-weight:bold; background:#e2e8f0;">
                                <td colspan="5" style="text-align:right;">TOTAL KESELURUHAN :</td>
                                <td style="text-align:right;">${rows.length.toLocaleString('id-ID')} BTT</td>
                                <td style="text-align:right;">${tColly.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tBerat.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style="text-align:right;">${tHarga.toLocaleString('id-ID')}</td>
                                <td style="text-align:right;">${tPenerus.toLocaleString('id-ID')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `);
            printWin.document.close();
        } catch (err) {
            Swal.fire('Gagal', err.response?.data?.message || 'Gagal memuat laporan detail loper', 'error');
        } finally {
            setPrintingReport(false);
        }
    };

    return (
        <div className="space-y-4 font-sans">
            {/* PANEL FILTER ATAS */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 space-y-3 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                        <label className="block mb-1 uppercase">PERIODE TANGGAL AWAL</label>
                        <input type="date" value={filterTgla} onChange={e => setFilterTgla(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg" />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block mb-1 uppercase">PERIODE TANGGAL AKHIR</label>
                        <input type="date" value={filterTgle} onChange={e => setFilterTgle(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg" />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block mb-1 uppercase">CARI NO. MANIFES LOPER</label>
                        <input type="text" placeholder="CARI NO LOPER..." value={filterNoLoper} onChange={e => setFilterNoLoper(e.target.value.toUpperCase())} className="w-full p-2.5 border border-slate-200 rounded-lg uppercase" />
                    </div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                    <button type="button" onClick={fetchLoperData} className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-2 font-black text-xs uppercase cursor-pointer">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH DATA MANIFES
                    </button>
                </div>
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchLoperData}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 font-black text-xs uppercase cursor-pointer shadow-xs"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> REFRESH
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="px-4 py-2.5 bg-[#004b84] hover:bg-[#003863] text-white rounded-lg flex items-center gap-1.5 font-black text-xs uppercase cursor-pointer shadow-xs"
                    >
                        <PackageCheck size={14} /> TAMBAH LOPER DARI PROSES LOADING
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenDirectBtt}
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center gap-1.5 font-black text-xs uppercase cursor-pointer shadow-xs"
                    >
                        <PlusCircle size={14} /> TAMBAH LOPER LANGSUNG DARI BTT
                    </button>

                    <button
                        type="button"
                        disabled={printingReport}
                        onClick={handleCetakRekapLoper}
                        className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 font-black text-xs uppercase cursor-pointer shadow-xs"
                    >
                        <Printer size={14} /> CETAK
                    </button>

                    <button
                        type="button"
                        disabled={printingReport}
                        onClick={handleCetakDetailLoper}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 font-black text-xs uppercase cursor-pointer shadow-xs"
                    >
                        <Printer size={14} /> CETAK DETAIL
                    </button>
                </div>
            </div>

            <DataTableTemplate
                title="DAFTAR MANIFES LOPER BARANG (OPR_T_ELOPER)"
                columns={columns}
                data={filteredList}
                loading={loading}
                isDarkMode={isDarkMode}
                searchValue={globalSearch}
                onSearchChange={e => setGlobalSearch(e.target.value)}
                onAdd={handleOpenCreate}
                onFilter={null}
            />

            {/* ========================================================================= */}
            {/* MODAL 1: PROSES & PEMBUATAN SURAT LOPER (SESUAI ALUR IMAGE 2 -> 3 -> 4)   */}
            {/* ========================================================================= */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">

                        {/* HEADER MODAL */}
                        <div className="px-6 py-4 bg-[#004b84] text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-base uppercase tracking-wide flex items-center gap-2">
                                    <Truck size={20} /> {showDetailStep ? 'PEMBUATAN SURAT LOPER' : 'PROSES SURAT LOPER'}
                                </h3>
                                {checkedSummary && (
                                    <p className="text-xs font-mono text-sky-200 mt-0.5">
                                        LOADING ID: <b>{checkedSummary.loadh_id}</b>
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setIsCreateOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* BODY SCROLLABLE */}
                        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 bg-slate-50/50">

                            {/* STEP 1: INPUT / SCAN NOMOR LOADING BARANG */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                                <label className="font-black text-slate-700 uppercase flex items-center gap-1.5">
                                    <PackageCheck size={16} className="text-sky-600" />
                                    MASUKKAN / SCAN NOMOR LOADING BARANG :
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                    <form
                                        onSubmit={e => { e.preventDefault(); handleCheckLoadingId(loadingCheckInput); }}
                                        className="md:col-span-6 flex gap-2"
                                    >
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Ketik / Paste No. Loading (Contoh: LC0012026110000002)..."
                                            value={loadingCheckInput}
                                            onChange={e => setLoadingCheckInput(e.target.value.toUpperCase())}
                                            className="flex-1 p-2.5 bg-sky-50/50 border border-sky-400 rounded-lg font-mono font-black text-indigo-900 uppercase outline-none focus:ring-2 focus:ring-sky-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={checkingLoading}
                                            className="px-4 py-2.5 bg-[#004b84] hover:bg-[#003863] text-white font-black rounded-lg uppercase cursor-pointer shrink-0"
                                        >
                                            {checkingLoading ? 'Cek...' : 'Cek Loading'}
                                        </button>
                                    </form>

                                    <select
                                        value={loadingCheckInput}
                                        onChange={e => handleCheckLoadingId(e.target.value)}
                                        className="md:col-span-6 p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 cursor-pointer"
                                    >
                                        <option value="">-- ATAU PILIH LOADING YANG SUDAH APPROVED --</option>
                                        {approvedLoadings.map((ld, idx) => (
                                            <option key={idx} value={ld.loadh_id}>
                                                {ld.loadh_id} | {ld.loadh_kendid} ({ld.jml_btt} BTT)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* STEP 2: SUMMARY DATA LOADING (PERSIS IMAGE 3 - OPR_T_LOPER_D.ASP) */}
                            {checkedSummary && !showDetailStep && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-4">
                                    <div className="text-center font-black text-sky-900 uppercase tracking-wider text-xs">
                                        SUMMARY DATA LOADING
                                    </div>

                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-[#004b84] text-white uppercase text-[10px]">
                                                <tr>
                                                    <th className="p-2.5">NO. SJ</th>
                                                    <th className="p-2.5">PENGEMUDI 1</th>
                                                    <th className="p-2.5">PENGEMUDI 2</th>
                                                    <th className="p-2.5">NO. KENDARAAN</th>
                                                    <th className="p-2.5 text-center">JML BTT</th>
                                                    <th className="p-2.5">NO. LOPER</th>
                                                </tr>
                                            </thead>
                                            <tbody className="font-bold text-slate-800">
                                                <tr>
                                                    <td className="p-3 font-mono">{checkedSummary.sjh_id || '-'}</td>
                                                    <td className="p-3 uppercase">
                                                        {checkedSummary.sopir1_nip ? `${checkedSummary.sopir1_nama} (${checkedSummary.sopir1_nip})` : '-'}
                                                    </td>
                                                    <td className="p-3 uppercase">
                                                        {checkedSummary.sopir2_nip ? `${checkedSummary.sopir2_nama} (${checkedSummary.sopir2_nip})` : '-'}
                                                    </td>
                                                    <td className="p-3 font-mono">{checkedSummary.loadh_kendid || '-'}</td>
                                                    <td className="p-3 text-center">
                                                        {!checkedSummary.existing_loper ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!checkedSummary.sopir1_nip) {
                                                                        Swal.fire(
                                                                            'Driver Belum Dipilih',
                                                                            `Silakan pilih driver terlebih dahulu pada menu Surat Tugas, kemudian tekan tombol 'Jalankan Tugas' pada nomor surat tugas: ${checkedSummary.sjh_id}`,
                                                                            'warning'
                                                                        );
                                                                        return;
                                                                    }
                                                                    setShowDetailStep(true);
                                                                }}
                                                                title="Klik Untuk Proses Surat Loper"
                                                                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-mono font-black rounded-lg shadow-xs cursor-pointer transition active:scale-95"
                                                            >
                                                                {checkedBttList.length}
                                                            </button>
                                                        ) : (
                                                            <span className="font-mono">{checkedBttList.length}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 font-mono">
                                                        {checkedSummary.existing_loper ? (
                                                            <span className="text-emerald-700 font-black">{checkedSummary.existing_loper}</span>
                                                        ) : (
                                                            <span className="text-amber-600 font-black">SURAT LOPER BELUM DIBUAT</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[11px] text-slate-500 italic text-center">
                                        * Klik angka biru pada kolom <b>JML BTT</b> untuk melanjutkan ke tahap Pembuatan Surat Loper.
                                    </p>
                                </div>
                            )}

                            {/* STEP 3: DETAIL PEMBUATAN SURAT LOPER + TOMBOL PROSES (PERSIS IMAGE 4 - OPR_T_LOPER_F.ASP) */}
                            {checkedSummary && showDetailStep && (
                                <form onSubmit={handleSubmitLoper} className="space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                                        <div className="font-black text-sky-900 uppercase border-b border-slate-100 pb-2">
                                            DETAIL SURAT LOPER
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-3">
                                                <label className="block font-black text-slate-500 uppercase mb-1">TGL LOADING :</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={checkedSummary.loadh_tanggal?.slice(0, 10) || '-'}
                                                    className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-mono font-bold text-slate-700"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block font-black text-slate-600 uppercase mb-1">TANGGAL LOPER :</label>
                                                <input
                                                    type="date"
                                                    value={formLoper.loper_tanggal}
                                                    onChange={e => setFormLoper({ ...formLoper, loper_tanggal: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block font-black text-slate-500 uppercase mb-1">NO MOBIL :</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={formLoper.loper_nomobil}
                                                    className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-mono font-black text-slate-900"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block font-black text-slate-600 uppercase mb-1">SOPIR / PENGEMUDI :</label>
                                                <select
                                                    value={formLoper.loper_nipsopir}
                                                    onChange={e => setFormLoper({ ...formLoper, loper_nipsopir: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold uppercase cursor-pointer"
                                                    required
                                                >
                                                    <option value="">-- PILIH SOPIR --</option>
                                                    {sopirList.map((s, idx) => (
                                                        <option key={idx} value={s.kry_nip}>{s.kry_nama}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-100">
                                            <div className="md:col-span-3">
                                                <label className="block font-black text-slate-600 uppercase mb-1">KERANI :</label>
                                                <div className="flex items-center gap-4 pt-2 font-bold">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={formLoper.loper_keraniyn === 'Y'}
                                                            onChange={() => setFormLoper({ ...formLoper, loper_keraniyn: 'Y' })}
                                                        />
                                                        <span>Ya</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={formLoper.loper_keraniyn !== 'Y'}
                                                            onChange={() => setFormLoper({ ...formLoper, loper_keraniyn: 'N', loper_nipkerani: '' })}
                                                        />
                                                        <span>Tidak</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {formLoper.loper_keraniyn === 'Y' && (
                                                <div className="md:col-span-5">
                                                    <label className="block font-black text-slate-600 uppercase mb-1">NAMA KERANI :</label>
                                                    <select
                                                        value={formLoper.loper_nipkerani}
                                                        onChange={e => setFormLoper({ ...formLoper, loper_nipkerani: e.target.value })}
                                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold uppercase cursor-pointer"
                                                    >
                                                        <option value="">-- PILIH KERANI --</option>
                                                        {sopirList.map((s, idx) => (
                                                            <option key={idx} value={s.kry_nip}>{s.kry_nama}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ACTION BAR + TABEL RINCIAN BTT DARI LOADING (IMAGE 4) */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
                                            <button
                                                type="submit"
                                                disabled={submitting || checkedBttList.length === 0}
                                                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-lg uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-50"
                                            >
                                                {submitting ? 'MEMPROSES...' : 'PROSES'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setIsCreateOpen(false)}
                                                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg uppercase cursor-pointer"
                                            >
                                                BATAL
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto max-h-64">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                                <thead className="bg-[#004b84] text-white uppercase text-[10px] sticky top-0">
                                                    <tr>
                                                        <th className="p-2 text-center w-9">NO.</th>
                                                        <th className="p-2">NO. BTT</th>
                                                        <th className="p-2">SURAT JALAN</th>
                                                        <th className="p-2 text-center">TGL. BTT</th>
                                                        <th className="p-2">PENGIRIM</th>
                                                        <th className="p-2">PENERIMA</th>
                                                        <th className="p-2">ALAMAT</th>
                                                        <th className="p-2">KOTA</th>
                                                        <th className="p-2">TELP</th>
                                                        <th className="p-2 text-right">JUMLAH</th>
                                                        <th className="p-2 text-right">BERAT</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                    {checkedBttList.map((row, idx) => (
                                                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                                                            <td className="p-2 text-center font-mono">{idx + 1}</td>
                                                            <td className="p-2 font-mono font-bold text-indigo-700">{row.no_btt}</td>
                                                            <td className="p-2 font-mono text-slate-500">{row.surat_jalan}</td>
                                                            <td className="p-2 text-center font-mono">{row.tgl_btt}</td>
                                                            <td className="p-2 uppercase">{row.pengirim}</td>
                                                            <td className="p-2 uppercase font-bold">{row.penerima}</td>
                                                            <td className="p-2 max-w-[180px] truncate" title={row.alamat}>{row.alamat}</td>
                                                            <td className="p-2 uppercase">{row.kota}</td>
                                                            <td className="p-2 font-mono">{row.telp}</td>
                                                            <td className="p-2 text-right font-mono">{row.jml_koli}</td>
                                                            <td className="p-2 text-right font-mono">{Number(row.berat).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 2: EDIT & KELOLA LOPER BARANG (FULL FITUR OPR_T_LOPER_E.ASP MODERN) */}
            {/* ========================================================================= */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-5">
                    <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">

                        {/* HEADER MODAL */}
                        <div className="px-6 py-4 bg-gradient-to-r from-[#004b84] to-[#0066a1] text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-base uppercase tracking-wide flex items-center gap-2">
                                    <Truck size={20} /> PEMBUATAN & EDIT LOPER BARANG
                                </h3>
                                <p className="text-xs font-mono text-sky-200 mt-0.5">
                                    No. Loper: <b>{editHeader.loper_eid}</b> | OTP: <b>{editHeader.loper_otp}</b> | Ref Loading: <b>{editHeader.loper_loadhid}</b>
                                </p>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* BODY SCROLLABLE */}
                        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1 bg-slate-50/60">

                            {/* 1. BLOK HEADER FORM */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-4">
                                        <label className="block font-black text-slate-600 uppercase mb-1">NOMOR LOPER :</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={editHeader.loper_eid}
                                            className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-mono font-black text-indigo-800 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block font-black text-slate-600 uppercase mb-1">TANGGAL LOPER :</label>
                                        <input
                                            type="date"
                                            value={editHeader.loper_tanggal}
                                            onChange={e => setEditHeader({ ...editHeader, loper_tanggal: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                                        />
                                    </div>
                                    <div className="md:col-span-4 flex items-end justify-end">
                                        <button
                                            type="button"
                                            disabled={savingEdit}
                                            onClick={handleSaveEditHeader}
                                            className="w-full md:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer uppercase"
                                        >
                                            <Save size={15} /> {savingEdit ? 'Menyimpan...' : 'Simpan Header'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-slate-100">
                                    <div className="md:col-span-3">
                                        <label className="block font-black text-slate-600 uppercase mb-1">NOMOR MOBIL :</label>
                                        <select
                                            value={editHeader.loper_nomobil}
                                            onChange={e => setEditHeader({ ...editHeader, loper_nomobil: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-black uppercase cursor-pointer"
                                        >
                                            <option value="">-- PILIH ARMADA --</option>
                                            {editHeader.loper_nomobil && !kendaraanList.some(k => (k.kend_id || k.kend_identid) === editHeader.loper_nomobil) && (
                                                <option value={editHeader.loper_nomobil}>{editHeader.loper_nomobil}</option>
                                            )}
                                            {kendaraanList.map((k, idx) => {
                                                const plat = k.kend_identid || k.kend_id;
                                                return <option key={idx} value={plat}>{plat}</option>;
                                            })}
                                        </select>
                                    </div>

                                    <div className="md:col-span-4">
                                        <label className="block font-black text-slate-600 uppercase mb-1">SOPIR / PENGEMUDI :</label>
                                        <select
                                            value={editHeader.loper_nipsopir}
                                            onChange={e => setEditHeader({ ...editHeader, loper_nipsopir: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold uppercase cursor-pointer"
                                        >
                                            <option value="">-- PILIH SOPIR --</option>
                                            {sopirList.map((s, idx) => (
                                                <option key={idx} value={s.kry_nip}>{s.kry_nama} [{s.kry_nip}]</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block font-black text-slate-600 uppercase mb-1">KERANI :</label>
                                        <div className="flex items-center gap-4 pt-2 font-bold">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="edit_keraniyn"
                                                    checked={editHeader.loper_keraniyn === 'Y'}
                                                    onChange={() => setEditHeader({ ...editHeader, loper_keraniyn: 'Y' })}
                                                    className="w-4 h-4 text-sky-600"
                                                />
                                                <span>Ya</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="edit_keraniyn"
                                                    checked={editHeader.loper_keraniyn !== 'Y'}
                                                    onChange={() => setEditHeader({ ...editHeader, loper_keraniyn: 'N', loper_nipkerani: '' })}
                                                    className="w-4 h-4 text-sky-600"
                                                />
                                                <span>Tidak</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="block font-black text-slate-600 uppercase mb-1">NAMA KERANI :</label>
                                        <select
                                            disabled={editHeader.loper_keraniyn !== 'Y'}
                                            value={editHeader.loper_nipkerani}
                                            onChange={e => setEditHeader({ ...editHeader, loper_nipkerani: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold uppercase cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                                        >
                                            <option value="">-- PILIH KERANI --</option>
                                            {sopirList.map((s, idx) => (
                                                <option key={idx} value={s.kry_nip}>{s.kry_nama} [{s.kry_nip}]</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* 2. BLOK BARCODE SCAN BARANG NAIK & BARANG TURUN */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border-2 border-emerald-200 shadow-2xs space-y-3">
                                    <div className="flex items-center gap-1.5 font-black text-emerald-700 uppercase text-xs">
                                        <ArrowUpCircle size={16} /> BARCODE SCAN BARANG NAIK
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <form onSubmit={e => { e.preventDefault(); handleScanBarcodeSubmit('BTT_NAIK', scanBttNaik, setScanBttNaik); }}>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">BTT NAIK (TEKAN ENTER) :</label>
                                            <div className="relative">
                                                <input
                                                    ref={bttNaikInputRef}
                                                    type="text"
                                                    placeholder="Scan / Ketik BTT Naik..."
                                                    value={scanBttNaik}
                                                    onChange={e => setScanBttNaik(e.target.value.toUpperCase())}
                                                    className="w-full p-2.5 pr-8 bg-emerald-50/60 border border-emerald-400 rounded-lg font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-400"
                                                />
                                                <QrCode size={15} className="absolute right-2.5 top-3 text-emerald-600" />
                                            </div>
                                        </form>

                                        <form onSubmit={e => { e.preventDefault(); handleScanBarcodeSubmit('SJ_NAIK', scanSjNaik, setScanSjNaik); }}>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">SURAT JALAN NAIK (ENTER) :</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Scan / Ketik SJ Naik..."
                                                    value={scanSjNaik}
                                                    onChange={e => setScanSjNaik(e.target.value.toUpperCase())}
                                                    className="w-full p-2.5 pr-8 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase outline-none focus:border-emerald-500"
                                                />
                                                <QrCode size={15} className="absolute right-2.5 top-3 text-slate-400" />
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border-2 border-sky-200 shadow-2xs space-y-3">
                                    <div className="flex items-center gap-1.5 font-black text-sky-700 uppercase text-xs">
                                        <ArrowDownCircle size={16} /> BARCODE SCAN BARANG TURUN
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <form onSubmit={e => { e.preventDefault(); handleScanBarcodeSubmit('BTT_TURUN', scanBttTurun, setScanBttTurun); }}>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">BTT TURUN (TEKAN ENTER) :</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Scan / Ketik BTT Turun..."
                                                    value={scanBttTurun}
                                                    onChange={e => setScanBttTurun(e.target.value.toUpperCase())}
                                                    className="w-full p-2.5 pr-8 bg-sky-50/50 border border-sky-300 rounded-lg font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-sky-400"
                                                />
                                                <QrCode size={15} className="absolute right-2.5 top-3 text-sky-600" />
                                            </div>
                                        </form>

                                        <form onSubmit={e => { e.preventDefault(); handleScanBarcodeSubmit('SJ_TURUN', scanSjTurun, setScanSjTurun); }}>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">SURAT JALAN TURUN (ENTER) :</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Scan / Ketik SJ Turun..."
                                                    value={scanSjTurun}
                                                    onChange={e => setScanSjTurun(e.target.value.toUpperCase())}
                                                    className="w-full p-2.5 pr-8 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase outline-none focus:border-sky-500"
                                                />
                                                <QrCode size={15} className="absolute right-2.5 top-3 text-slate-400" />
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* 3. TABEL BTT YANG SUDAH DIPILIH */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex flex-wrap justify-between items-center gap-2">
                                    <div>
                                        <span className="font-black text-emerald-800 uppercase">
                                            BTT YANG SUDAH DIPILIH : {editDetails.length} RESI
                                        </span>
                                        <span className="text-[11px] text-emerald-700 ml-2 italic">
                                            (Data Pertama Adalah Data Barang yang Terakhir diinput)
                                        </span>
                                    </div>

                                    {selectedBttToDelete.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteCheckedBtts}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                                        >
                                            <Trash2 size={13} /> Hapus {selectedBttToDelete.length} BTT Tercentang
                                        </button>
                                    )}
                                </div>

                                <div className="overflow-x-auto max-h-72">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                        <thead className="bg-[#004b84] text-white uppercase text-[10px] sticky top-0 z-10">
                                            <tr>
                                                <th className="p-2 text-center w-9">NO.</th>
                                                <th className="p-2">NO. BTT</th>
                                                <th className="p-2">SURAT JALAN</th>
                                                <th className="p-2 text-center">TGL. BTT</th>
                                                <th className="p-2">PENGIRIM</th>
                                                <th className="p-2">PENERIMA</th>
                                                <th className="p-2">ALAMAT</th>
                                                <th className="p-2">KOTA</th>
                                                <th className="p-2 text-right">JUMLAH</th>
                                                <th className="p-2 text-right">BERAT</th>
                                                <th className="p-2 text-right">COD</th>
                                                <th className="p-2 text-center w-14">HAPUS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                            {loadingEdit ? (
                                                <tr><td colSpan={12} className="p-6 text-center text-slate-400">Memuat rincian BTT...</td></tr>
                                            ) : editDetails.length === 0 ? (
                                                <tr><td colSpan={12} className="p-6 text-center text-slate-400 italic">Belum ada BTT yang terdaftar pada Manifes Loper ini. Silakan scan barcode atau pilih dari daftar BTT di bawah.</td></tr>
                                            ) : (
                                                editDetails.map((row, idx) => {
                                                    const isChecked = selectedBttToDelete.includes(row.no_btt);
                                                    return (
                                                        <tr key={idx} className={isChecked ? 'bg-rose-50' : idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                                                            <td className="p-2 text-center font-mono">{idx + 1}</td>
                                                            <td className="p-2 font-mono font-bold text-indigo-700">{row.no_btt}</td>
                                                            <td className="p-2 font-mono text-slate-500">{row.surat_jalan || '-'}</td>
                                                            <td className="p-2 text-center font-mono">{row.tgl_btt || '-'}</td>
                                                            <td className="p-2 uppercase">{row.pengirim}</td>
                                                            <td className="p-2 uppercase font-bold text-slate-900">{row.penerima}</td>
                                                            <td className="p-2 max-w-[200px] truncate" title={row.alamat}>{row.alamat}</td>
                                                            <td className="p-2 uppercase">{row.kota}</td>
                                                            <td className="p-2 text-right font-mono">{row.jml_koli}</td>
                                                            <td className="p-2 text-right font-mono">{Number(row.berat).toLocaleString('id-ID')}</td>
                                                            <td className="p-2 text-right font-mono text-emerald-700">
                                                                {Number(row.cod) > 0 ? Number(row.cod).toLocaleString('id-ID') : ''}
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setSelectedBttToDelete([...selectedBttToDelete, row.no_btt]);
                                                                        } else {
                                                                            setSelectedBttToDelete(selectedBttToDelete.filter(id => id !== row.no_btt));
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4. DAFTAR NOMOR BTT YANG BELUM DIPILIH (BTT NAIK / BTT TURUN) */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                <div className="flex flex-wrap items-end justify-between gap-4">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">TANGGAL BTT :</label>
                                            <input
                                                type="date"
                                                disabled={bypassTgl}
                                                value={availTglA}
                                                onChange={e => {
                                                    setAvailTglA(e.target.value);
                                                    if (availMode) fetchAvailableBttList(availMode, e.target.value, availTglE, bypassTgl);
                                                }}
                                                className="p-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">SAMPAI :</label>
                                            <input
                                                type="date"
                                                disabled={bypassTgl}
                                                value={availTglE}
                                                onChange={e => {
                                                    setAvailTglE(e.target.value);
                                                    if (availMode) fetchAvailableBttList(availMode, availTglA, e.target.value, bypassTgl);
                                                }}
                                                className="p-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
                                            />
                                        </div>
                                        <label className="flex items-center gap-1.5 pb-2 font-bold text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={bypassTgl}
                                                onChange={e => {
                                                    setBypassTgl(e.target.checked);
                                                    if (availMode) fetchAvailableBttList(availMode, availTglA, availTglE, e.target.checked);
                                                }}
                                                className="w-4 h-4 text-indigo-600 rounded"
                                            />
                                            <span>BYPASS FILTER TANGGAL</span>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-4 pb-1.5">
                                        <span className="font-black text-slate-600 uppercase">TAMPILKAN BTT :</span>
                                        <label className="flex items-center gap-1.5 font-bold text-emerald-700 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="optionbtt"
                                                checked={availMode === 'NAIK'}
                                                onChange={() => {
                                                    setAvailMode('NAIK');
                                                    fetchAvailableBttList('NAIK', availTglA, availTglE, bypassTgl);
                                                }}
                                                className="w-4 h-4 text-emerald-600"
                                            />
                                            <span>BTT Naik</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 font-bold text-sky-700 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="optionbtt"
                                                checked={availMode === 'TURUN'}
                                                onChange={() => {
                                                    setAvailMode('TURUN');
                                                    fetchAvailableBttList('TURUN', availTglA, availTglE, bypassTgl);
                                                }}
                                                className="w-4 h-4 text-sky-600"
                                            />
                                            <span>BTT Turun</span>
                                        </label>
                                    </div>
                                </div>

                                {availMode && (
                                    <div className="space-y-2 pt-2 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-600">
                                                Daftar BTT {availMode} Tersedia ({availableBtts.length} Resi)
                                            </span>
                                            {selectedAvailBtts.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleAddSelectedAvailableBtts}
                                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                >
                                                    <PlusCircle size={14} /> Masukkan {selectedAvailBtts.length} BTT Terpilih ke Loper
                                                </button>
                                            )}
                                        </div>

                                        <div className="overflow-x-auto max-h-56 border border-slate-200 rounded-lg">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                                <thead className="bg-slate-700 text-white uppercase text-[10px] sticky top-0">
                                                    <tr>
                                                        <th className="p-2 text-center w-10">
                                                            <input
                                                                type="checkbox"
                                                                checked={availableBtts.length > 0 && selectedAvailBtts.length === availableBtts.length}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setSelectedAvailBtts(availableBtts.map(b => b.no_btt));
                                                                    } else {
                                                                        setSelectedAvailBtts([]);
                                                                    }
                                                                }}
                                                            />
                                                        </th>
                                                        <th className="p-2">NO. BTT</th>
                                                        <th className="p-2">SURAT JALAN</th>
                                                        <th className="p-2 text-center">TGL. BTT</th>
                                                        <th className="p-2">PENGIRIM</th>
                                                        <th className="p-2">PENERIMA</th>
                                                        <th className="p-2">KOTA</th>
                                                        <th className="p-2 text-right">KOLI</th>
                                                        <th className="p-2 text-right">BERAT</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-semibold">
                                                    {loadingAvailable ? (
                                                        <tr><td colSpan={9} className="p-4 text-center text-slate-400">Mencari daftar BTT {availMode}...</td></tr>
                                                    ) : availableBtts.length === 0 ? (
                                                        <tr><td colSpan={9} className="p-4 text-center text-slate-400 italic">Tidak ada BTT {availMode} yang tersedia pada periode ini.</td></tr>
                                                    ) : (
                                                        availableBtts.map((b, bIdx) => {
                                                            const checked = selectedAvailBtts.includes(b.no_btt);
                                                            return (
                                                                <tr key={bIdx} className={checked ? 'bg-emerald-50' : 'hover:bg-slate-50'}>
                                                                    <td className="p-2 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={e => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedAvailBtts([...selectedAvailBtts, b.no_btt]);
                                                                                } else {
                                                                                    setSelectedAvailBtts(selectedAvailBtts.filter(id => id !== b.no_btt));
                                                                                }
                                                                            }}
                                                                            className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2 font-mono font-bold text-indigo-700">{b.no_btt}</td>
                                                                    <td className="p-2 font-mono text-slate-500">{b.surat_jalan}</td>
                                                                    <td className="p-2 text-center font-mono">{b.tgl_btt}</td>
                                                                    <td className="p-2 uppercase">{b.pengirim}</td>
                                                                    <td className="p-2 uppercase">{b.penerima}</td>
                                                                    <td className="p-2 uppercase">{b.kota}</td>
                                                                    <td className="p-2 text-right font-mono">{b.jml_koli}</td>
                                                                    <td className="p-2 text-right font-mono">{Number(b.berat).toLocaleString('id-ID')}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FOOTER MODAL ACTION */}
                        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 shrink-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={savingEdit}
                                    onClick={handleSaveEditHeader}
                                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                    <Save size={15} /> SIMPAN
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintLoper}
                                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                    <Printer size={15} /> CETAK SURAT LOPER
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsEditOpen(false)}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-sm"
                            >
                                KEMBALI KE DAFTAR LOPER
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 3: TAMBAH LOPER LANGSUNG DARI BTT (OPR_T_LOPER_A_BTT.ASP MODERN)    */}
            {/* ========================================================================= */}
            {isDirectBttOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 bg-gradient-to-r from-sky-700 to-[#004b84] text-white flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                                <Truck size={18} /> PEMBUATAN LOPER BARANG (LANGSUNG DARI BTT)
                            </h3>
                            <button onClick={() => setIsDirectBttOpen(false)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitDirectBtt} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <div>
                                    <label className="block font-black text-slate-600 uppercase mb-1">TANGGAL LOPER :</label>
                                    <input
                                        type="date"
                                        value={directForm.loper_tanggal}
                                        onChange={e => setDirectForm({ ...directForm, loper_tanggal: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block font-black text-slate-600 uppercase mb-1">NOMOR MOBIL :</label>
                                    <select
                                        value={directForm.loper_nomobil}
                                        onChange={e => setDirectForm({ ...directForm, loper_nomobil: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase cursor-pointer"
                                        required
                                    >
                                        <option value="">-- PILIH NOMOR MOBIL --</option>
                                        {kendaraanList.map((k, idx) => {
                                            const plat = k.kend_identid || k.kend_id;
                                            return <option key={idx} value={plat}>{plat}</option>;
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-black text-slate-600 uppercase mb-1">SOPIR / PENGEMUDI :</label>
                                    <select
                                        value={directForm.loper_nipsopir}
                                        onChange={e => setDirectForm({ ...directForm, loper_nipsopir: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold uppercase cursor-pointer"
                                        required
                                    >
                                        <option value="">-- PILIH SOPIR --</option>
                                        {sopirList.map((s, idx) => (
                                            <option key={idx} value={s.kry_nip}>{s.kry_nama} [{s.kry_nip}]</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-black text-slate-600 uppercase mb-1">KERANI :</label>
                                    <div className="flex items-center gap-4 pt-2 font-bold">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="direct_keraniyn"
                                                checked={directForm.loper_keraniyn === 'Y'}
                                                onChange={() => setDirectForm({ ...directForm, loper_keraniyn: 'Y' })}
                                            />
                                            <span>Ya</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="direct_keraniyn"
                                                checked={directForm.loper_keraniyn !== 'Y'}
                                                onChange={() => setDirectForm({ ...directForm, loper_keraniyn: 'N', loper_nipkerani: '' })}
                                            />
                                            <span>Tidak</span>
                                        </label>
                                    </div>
                                </div>

                                {directForm.loper_keraniyn === 'Y' && (
                                    <div className="md:col-span-2">
                                        <label className="block font-black text-slate-600 uppercase mb-1">NAMA KERANI :</label>
                                        <select
                                            value={directForm.loper_nipkerani}
                                            onChange={e => setDirectForm({ ...directForm, loper_nipkerani: e.target.value })}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold uppercase cursor-pointer"
                                            required
                                        >
                                            <option value="">-- PILIH KERANI --</option>
                                            {sopirList.map((s, idx) => (
                                                <option key={idx} value={s.kry_nip}>{s.kry_nama} [{s.kry_nip}]</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                <button
                                    type="submit"
                                    disabled={submittingDirect}
                                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                    <PlusCircle size={15} /> {submittingDirect ? 'MEMPROSES...' : 'TAMBAH RINCIAN'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsDirectBttOpen(false)}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer"
                                >
                                    BATAL
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Loper;
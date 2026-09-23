import React, { useState, useEffect } from "react";
import api from "../api/axios";
import DataTableTemplate from "../components/organisms/DataTableTemplate";
import { Search, Printer, Trash2, X, Barcode, CheckCircle2, DollarSign } from "lucide-react";
import Swal from "sweetalert2";

export default function PenerimaanPembayaranKasir() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Toggle Panel Filter
    const [showFilter, setShowFilter] = useState(false);

    // Checkbox Filter
    const [chkDate, setChkDate] = useState(true);
    const [chkNoBTT, setChkNoBTT] = useState(false);

    // Nilai Filter
    const today = new Date().toISOString().split("T")[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [noBTT, setNoBTT] = useState("");

    // Modal Aksi Baris Data
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Modal Input Tambah Kasir (mkt_t_econote_bayar_a.asp)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [inputDate, setInputDate] = useState(today);
    const [inputBTT, setInputBTT] = useState("");
    const [inputBayar, setInputBayar] = useState("");
    const [bttDetail, setBttDetail] = useState(null);
    const [checkingBTT, setCheckingBTT] = useState(false);
    const [savingBayar, setSavingBayar] = useState(false);

    const fetchBayar = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ limit: "500" });

            if (chkDate) {
                params.append("start_date", startDate);
                params.append("end_date", endDate);
            }
            if (chkNoBTT && noBTT) params.append("no_btt", noBTT);

            const res = await api.get(`/marketing/econote-bayar?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat data kasir:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBayar();
    }, []);

    // Pengecekan BTT via Scanner/Input (16 digit)
    const handleCheckBTT = async (val) => {
        const cleanBTT = val.trim().toUpperCase();
        setInputBTT(cleanBTT);

        if (cleanBTT.length === 12 || cleanBTT.length === 16) {
            setCheckingBTT(true);
            try {
                const token = localStorage.getItem("token");
                const res = await api.get(`/marketing/econote-bayar/check/${cleanBTT}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const d = res.data?.data;
                setBttDetail(d);
                // Otomatis isi default bayar dengan sisa biaya kirim
                setInputBayar(d?.sisa_bayar || d?.total_biaya || 0);
            } catch (err) {
                setBttDetail(null);
                setInputBayar("");
                Swal.fire("Peringatan", err.response?.data?.message || "Nomor BTT tidak ditemukan", "warning");
            } finally {
                setCheckingBTT(false);
            }
        } else {
            setBttDetail(null);
            setInputBayar("");
        }
    };

    // Simpan data pembayaran kasir
    const handleSaveBayar = async (e) => {
        e.preventDefault();
        const nominal = Number(inputBayar);
        if (!inputBTT || !bttDetail) {
            Swal.fire("Perhatian", "Pastikan Nomor BTT valid dan sudah dicek", "warning");
            return;
        }
        if (nominal <= 0) {
            Swal.fire("Perhatian", "Nominal pembayaran harus lebih dari 0", "warning");
            return;
        }

        setSavingBayar(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.post(
                "/marketing/econote-bayar",
                { no_btt: inputBTT, tanggal: inputDate, bayar: nominal },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Swal.fire("Berhasil", res.data?.message || "Pembayaran berhasil disimpan!", "success");
            setIsAddModalOpen(false);
            setInputBTT("");
            setInputBayar("");
            setBttDetail(null);
            fetchBayar();
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal menyimpan pembayaran", "error");
        } finally {
            setSavingBayar(false);
        }
    };

    const columns = [
        {
            header: "KODE PEMBAYARAN",
            accessor: "ppk_eid",
            render: (item) => (
                <button
                    type="button"
                    onClick={() => {
                        setSelectedItem(item);
                        setIsActionModalOpen(true);
                    }}
                    className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                    {item.ppk_eid}
                </button>
            ),
        },
        { header: "TANGGAL", accessor: "ppk_tanggal" },
        { header: "CABANG/AGEN", accessor: "agen_nama" },
        { header: "NO. BTT", accessor: "no_btt" },
        { header: "PELANGGAN", accessor: "pelanggan" },
        {
            header: "BIAYA KIRIM",
            accessor: "biaya_kirim",
            render: (item) => (
                <span className="font-mono font-semibold">
                    Rp {Number(item.biaya_kirim || 0).toLocaleString("id-ID")}
                </span>
            ),
        },
        {
            header: "DIBAYAR",
            accessor: "dibayar",
            render: (item) => (
                <span className="font-mono font-bold text-emerald-600">
                    Rp {Number(item.dibayar || 0).toLocaleString("id-ID")}
                </span>
            ),
        },
        {
            header: "AKTIF",
            accessor: "aktif",
            render: (item) => (
                <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.aktif === "Ya"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-rose-100 text-rose-700 border border-rose-300"
                        }`}
                >
                    {item.aktif}
                </span>
            ),
        },
    ];

    const handleDeactivate = (item) => {
        Swal.fire({
            title: "Batalkan Pembayaran?",
            text: `Yakin ingin menonaktifkan kode pembayaran: ${item.ppk_eid}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#e11d48",
            confirmButtonText: "Ya, Batalkan!",
            cancelButtonText: "Batal",
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem("token");
                    await api.put(
                        `/marketing/econote-bayar/deactivate/${item.ppk_eid}`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    Swal.fire("Sukses", "Pembayaran berhasil dinonaktifkan", "success");
                    fetchBayar();
                } catch {
                    Swal.fire("Gagal", "Gagal memproses penonaktifan", "error");
                }
            }
        });
    };

    // Hitung sisa pembayaran dinamis di modal
    const sisaDihitung = bttDetail
        ? Math.max(0, Number(bttDetail.total_biaya || 0) - Number(bttDetail.sudah_dibayar || 0) - Number(inputBayar || 0))
        : 0;

    return (
        <div className="space-y-4">
            {/* Panel Filter */}
            {showFilter && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={chkDate}
                                    onChange={(e) => setChkDate(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                Filter Tanggal
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                <input
                                    type="date"
                                    disabled={!chkDate}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="p-2 border border-slate-300 rounded-xl outline-none bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                                />
                                <input
                                    type="date"
                                    disabled={!chkDate}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="p-2 border border-slate-300 rounded-xl outline-none bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={chkNoBTT}
                                    onChange={(e) => setChkNoBTT(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                No. BTT
                            </label>
                            <input
                                type="text"
                                disabled={!chkNoBTT}
                                placeholder="Masukkan No. BTT..."
                                value={noBTT}
                                onChange={(e) => setNoBTT(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-xl outline-none bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={fetchBayar}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                            <Search size={14} /> REFRESH FILTER
                        </button>
                    </div>
                </div>
            )}

            {/* Template Tabel */}
            <DataTableTemplate
                title="PENERIMAAN PEMBAYARAN KASIR"
                columns={columns}
                data={data}
                loading={loading}
                onAdd={() => setIsAddModalOpen(true)}
                onEdit={(item) => Swal.fire("Edit", `Edit pembayaran ${item.ppk_eid}`, "info")}
                onDelete={handleDeactivate}
                onFilter={() => setShowFilter((prev) => !prev)}
            />

            {/* MODAL INPUT PEMBAYARAN BTT (mkt_t_econote_bayar_a.asp) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 bg-white text-slate-800 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Barcode size={22} />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Form Penerimaan Pembayaran Kasir</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-white/80 hover:text-white cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBayar} className="p-6 space-y-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Pembayaran</label>
                                    <input
                                        type="date"
                                        required
                                        value={inputDate}
                                        onChange={(e) => setInputDate(e.target.value)}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none bg-white text-slate-800 font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor BTT (Barcode Scanner)</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        placeholder="Scan / Masukkan No. BTT"
                                        value={inputBTT}
                                        onChange={(e) => handleCheckBTT(e.target.value)}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none bg-white text-slate-900 font-mono font-bold uppercase tracking-wider focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {checkingBTT && (
                                <div className="text-xs text-blue-600 flex items-center gap-2 py-1 font-semibold">
                                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    Mengecek data BTT Conote...
                                </div>
                            )}

                            {/* Rincian Tagihan BTT */}
                            {bttDetail && (
                                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-xs space-y-2.5">
                                    <div className="flex items-center gap-2 font-bold text-blue-700">
                                        <CheckCircle2 size={16} /> BTT Valid & Ditemukan
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                                        <div>Pengirim: <span className="font-bold">{bttDetail.pengirim}</span></div>
                                        <div>Penerima: <span className="font-bold">{bttDetail.penerima}</span></div>
                                        <div>Tujuan: <span className="font-bold">{bttDetail.kota_tujuan}</span></div>
                                        <div>Tgl. BTT: <span className="font-bold">{bttDetail.tgl_btt}</span></div>
                                    </div>

                                    <div className="border-t border-blue-200 pt-2 grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                                            <span className="text-[10px] text-slate-500 font-bold block">TOTAL BIAYA</span>
                                            <span className="font-mono font-bold text-slate-800">
                                                Rp {Number(bttDetail.total_biaya || 0).toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                                            <span className="text-[10px] text-slate-500 font-bold block">SUDAH DIBAYAR</span>
                                            <span className="font-mono font-bold text-emerald-600">
                                                Rp {Number(bttDetail.sudah_dibayar || 0).toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-blue-100">
                                            <span className="text-[10px] text-slate-500 font-bold block">SISA TAGIHAN</span>
                                            <span className="font-mono font-bold text-rose-600">
                                                Rp {Number(bttDetail.sisa_bayar || 0).toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Input Jumlah Bayar */}
                                    <div className="pt-2">
                                        <label className="block text-xs font-bold text-slate-800 mb-1">
                                            Jumlah Uang Diterima / Dibayar (Rp)
                                        </label>
                                        <div className="relative">
                                            <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                placeholder="Masukkan nominal bayar..."
                                                value={inputBayar}
                                                onChange={(e) => setInputBayar(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 bg-white outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                                            <span>Sisa setelah pembayaran:</span>
                                            <span className="font-mono font-bold text-slate-800">
                                                Rp {sisaDihitung.toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!bttDetail || savingBayar || Number(inputBayar) <= 0}
                                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
                                >
                                    {savingBayar ? "Menyimpan..." : "Simpan Pembayaran Kasir"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Aksi Pop-up Kwitansi */}
            {isActionModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 bg-white text-slate-800 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">
                                    KODE PEMBAYARAN TERPILIH
                                </span>
                                <h3 className="text-xl font-mono font-black">{selectedItem.ppk_eid}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsActionModalOpen(false)}
                                className="text-white/80 hover:text-white cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-3 text-center">
                            <div
                                onClick={() => Swal.fire("Print", `Cetak kwitansi ${selectedItem.ppk_eid}`, "info")}
                                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 flex flex-col items-center gap-2 cursor-pointer transition"
                            >
                                <Printer size={20} className="text-blue-600" />
                                <span className="text-xs font-bold">Print Kwitansi</span>
                            </div>
                            <div
                                onClick={() => {
                                    setIsActionModalOpen(false);
                                    handleDeactivate(selectedItem);
                                }}
                                className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 flex flex-col items-center gap-2 cursor-pointer transition"
                            >
                                <Trash2 size={20} className="text-rose-600" />
                                <span className="text-xs font-bold">Batalkan / Hapus</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
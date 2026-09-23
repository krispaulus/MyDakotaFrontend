import React, { useState, useEffect } from "react";
import api from "../api/axios";
import DataTableTemplate from "../components/organisms/DataTableTemplate";
import { Search, Printer, Trash2, X, Barcode, CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";

export default function PenerimaanRetur() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Toggle Panel Filter
    const [showFilter, setShowFilter] = useState(false);

    // Opsi Dropdown dari Backend
    const [optKota, setOptKota] = useState([]);
    const [optCustomer, setOptCustomer] = useState([]);

    // Toggle Checkbox Filter Aktif
    const [chkDate, setChkDate] = useState(true);
    const [chkPayment, setChkPayment] = useState(false);
    const [chkNoBTT, setChkNoBTT] = useState(false);
    const [chkKotaTujuan, setChkKotaTujuan] = useState(false);
    const [chkCustomer, setChkCustomer] = useState(false);

    // Nilai Filter
    const today = new Date().toISOString().split("T")[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [pembayaran, setPembayaran] = useState("1");
    const [noBTT, setNoBTT] = useState("");
    const [kotaTujuan, setKotaTujuan] = useState("");
    const [customer, setCustomer] = useState("");

    // Modal Detail & Input
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedBTT, setSelectedBTT] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [inputDate, setInputDate] = useState(today);
    const [inputBTT, setInputBTT] = useState("");
    const [bttDetail, setBttDetail] = useState(null);
    const [checkingBTT, setCheckingBTT] = useState(false);
    const [savingRetur, setSavingRetur] = useState(false);

    // Ambil opsi dropdown saat komponen dimuat
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await api.get("/marketing/terima-retur/options", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setOptKota(res.data?.kota || []);
                setOptCustomer(res.data?.cust || []);
            } catch (err) {
                console.error("Gagal mengambil opsi filter:", err);
            }
        };
        fetchOptions();
        fetchRetur();
    }, []);

    const fetchRetur = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ limit: "500" });

            if (chkDate) {
                params.append("start_date", startDate);
                params.append("end_date", endDate);
            }
            if (chkPayment && pembayaran) params.append("pembayaran", pembayaran);
            if (chkNoBTT && noBTT) params.append("no_btt", noBTT);
            if (chkKotaTujuan && kotaTujuan) params.append("kota", kotaTujuan);
            if (chkCustomer && customer) params.append("customer", customer);

            const res = await api.get(`/marketing/terima-retur?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setData(res.data?.data || []);
        } catch (err) {
            console.error("Gagal memuat data retur:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckBTT = async (val) => {
        const cleanBTT = val.trim().toUpperCase();
        setInputBTT(cleanBTT);

        if (cleanBTT.length === 12 || cleanBTT.length === 16) {
            setCheckingBTT(true);
            try {
                const token = localStorage.getItem("token");
                const res = await api.get(`/marketing/terima-retur/check/${cleanBTT}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setBttDetail(res.data?.data || null);
            } catch (err) {
                setBttDetail(null);
                Swal.fire("Peringatan", err.response?.data?.message || "Nomor BTT tidak valid", "warning");
            } finally {
                setCheckingBTT(false);
            }
        } else {
            setBttDetail(null);
        }
    };

    const handleSaveRetur = async (e) => {
        e.preventDefault();
        if (!inputBTT || !bttDetail) {
            Swal.fire("Perhatian", "Pastikan Nomor BTT valid dan ditemukan", "warning");
            return;
        }

        setSavingRetur(true);
        try {
            const token = localStorage.getItem("token");
            await api.post(
                "/marketing/terima-retur",
                { no_btt: inputBTT, tgl_kembali: inputDate },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Swal.fire("Berhasil", `Penerimaan BTT Retur ${inputBTT} berhasil disimpan!`, "success");
            setIsAddModalOpen(false);
            setInputBTT("");
            setBttDetail(null);
            fetchRetur();
        } catch (err) {
            Swal.fire("Gagal", err.response?.data?.message || "Gagal menyimpan penerimaan retur", "error");
        } finally {
            setSavingRetur(false);
        }
    };

    // Kolom Tabel Sesuai Layar ASP Lawas
    const columns = [
        {
            header: "NO. BTT",
            accessor: "no_btt",
            render: (item) => (
                <button
                    type="button"
                    onClick={() => {
                        setSelectedBTT(item);
                        setIsActionModalOpen(true);
                    }}
                    className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                    {item.no_btt}
                </button>
            ),
        },
        { header: "TGL. KEMBALI", accessor: "tgl_kembali" },
        { header: "TGL. BTT", accessor: "tgl_btt" },
        { header: "CUSTOMER", accessor: "customer" },
        { header: "KOTA TUJUAN", accessor: "kota_tujuan" },
        {
            header: "PEMBAYARAN",
            accessor: "pembayaran",
            render: (item) => (
                <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${item.pembayaran === "TUNAI"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.pembayaran === "KREDIT"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                        }`}
                >
                    {item.pembayaran}
                </span>
            ),
        },
        {
            header: "TOTAL HARGA",
            accessor: "total_harga",
            render: (item) => (
                <span className="font-mono font-bold">
                    Rp {Number(item.total_harga || 0).toLocaleString("id-ID")}
                </span>
            ),
        },
        { header: "SURAT JALAN", accessor: "no_surat_jalan" },
        {
            header: "AKTIF",
            accessor: "aktif",
            render: (item) => (
                <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.aktif === "Ya"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-rose-100 text-rose-600"
                        }`}
                >
                    {item.aktif}
                </span>
            ),
        },
    ];

    const handleDeactivate = (item) => {
        Swal.fire({
            title: "Nonaktifkan BTT Retur?",
            text: `Yakin ingin menonaktifkan status retur untuk BTT: ${item.no_btt}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#e11d48",
            confirmButtonText: "Ya, Nonaktifkan!",
            cancelButtonText: "Batal",
        }).then(async (res) => {
            if (res.isConfirmed) {
                try {
                    const token = localStorage.getItem("token");
                    await api.put(
                        `/marketing/terima-retur/deactivate/${item.no_btt}`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    Swal.fire("Sukses", "Status retur berhasil dinonaktifkan", "success");
                    fetchRetur();
                } catch {
                    Swal.fire("Gagal", "Gagal memproses penonaktifan", "error");
                }
            }
        });
    };

    return (
        <div className="space-y-4">
            {/* Panel Filter Mirip ASP Lawas (Dropdown Kota Tujuan & Pengirim) */}
            {showFilter && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        {/* Filter Tanggal */}
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
                            <div className="grid grid-cols-2 gap-2">
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

                        {/* Filter Pembayaran */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={chkPayment}
                                    onChange={(e) => setChkPayment(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                Pembayaran
                            </label>
                            <select
                                disabled={!chkPayment}
                                value={pembayaran}
                                onChange={(e) => setPembayaran(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-xl outline-none bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <option value="1">TUNAI</option>
                                <option value="2">KREDIT</option>
                                <option value="3">TAGIH TUJUAN</option>
                            </select>
                        </div>

                        {/* Filter No. BTT */}
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
                                placeholder="Cari nomor BTT..."
                                value={noBTT}
                                onChange={(e) => setNoBTT(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-xl outline-none bg-white text-slate-900 placeholder:text-slate-400 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                            />
                        </div>

                        {/* Filter Dropdown Kota Tujuan */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={chkKotaTujuan}
                                    onChange={(e) => setChkKotaTujuan(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                Kota Tujuan
                            </label>
                            <select
                                disabled={!chkKotaTujuan}
                                value={kotaTujuan}
                                onChange={(e) => setKotaTujuan(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-xl outline-none bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <option value="">-- Pilih Kota Tujuan --</option>
                                {optKota.map((item, idx) => (
                                    <option key={idx} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Dropdown Pengirim (Customer) */}
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={chkCustomer}
                                    onChange={(e) => setChkCustomer(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                Pengirim (Customer)
                            </label>
                            <select
                                disabled={!chkCustomer}
                                value={customer}
                                onChange={(e) => setCustomer(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-xl outline-none bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <option value="">-- Pilih Pengirim (Customer) --</option>
                                {optCustomer.map((item, idx) => (
                                    <option key={idx} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={fetchRetur}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                            <Search size={14} /> REFRESH FILTER
                        </button>
                    </div>
                </div>
            )}

            {/* Tabel Template */}
            <DataTableTemplate
                title="PENERIMAAN BTT / BARANG RETUR"
                columns={columns}
                data={data}
                loading={loading}
                onAdd={() => setIsAddModalOpen(true)}
                onEdit={(item) => Swal.fire("Edit", `Edit BTT: ${item.no_btt}`, "info")}
                onDelete={handleDeactivate}
                onFilter={() => setShowFilter((prev) => !prev)}
            />

            {/* Modal Input Retur */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 bg-white text-slate-800 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Barcode size={22} />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Input Penerimaan BTT / Retur</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-white/80 hover:text-white cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRetur} className="p-6 space-y-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Terima Retur</label>
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

                            {bttDetail && (
                                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-emerald-700">
                                        <CheckCircle2 size={16} /> BTT Valid & Siap Diterima
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                                        <div>Pengirim: <span className="font-bold">{bttDetail.pengirim}</span></div>
                                        <div>Tujuan: <span className="font-bold">{bttDetail.tujuan}</span></div>
                                        <div>Tgl. BTT: <span className="font-bold">{bttDetail.tgl_btt}</span></div>
                                        <div>Total Tagihan: <span className="font-bold font-mono text-emerald-800">Rp {Number(bttDetail.total_harga || 0).toLocaleString("id-ID")}</span></div>
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
                                    disabled={!bttDetail || savingRetur}
                                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
                                >
                                    {savingRetur ? "Menyimpan..." : "Simpan Penerimaan Retur"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Aksi Pop-up */}
            {isActionModalOpen && selectedBTT && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 bg-white text-slate-800 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Nomor BTT Terpilih</span>
                                <h3 className="text-xl font-mono font-black">{selectedBTT.no_btt}</h3>
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
                                onClick={() => Swal.fire("Print", `Mencetak dokumen BTT ${selectedBTT.no_btt}`, "info")}
                                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 flex flex-col items-center gap-2 cursor-pointer transition"
                            >
                                <Printer size={20} className="text-blue-600" />
                                <span className="text-xs font-bold">Print</span>
                            </div>
                            <div
                                onClick={() => {
                                    setIsActionModalOpen(false);
                                    handleDeactivate(selectedBTT);
                                }}
                                className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 flex flex-col items-center gap-2 cursor-pointer transition"
                            >
                                <Trash2 size={20} className="text-rose-600" />
                                <span className="text-xs font-bold">Hapus</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
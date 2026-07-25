import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, RefreshCw, MapPin, Calendar, User, Hash, X as XIcon, Navigation } from 'lucide-react';
import Swal from 'sweetalert2';

// Import Leaflet CSS & Component
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix Icon Leaflet Marker Default
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconMarkerShadow from 'leaflet/dist/images/marker-shadow.png';

const customMarkerIcon = L.icon({
    iconUrl: iconMarker,
    shadowUrl: iconMarkerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const MonitoringLokasiKaryawan = () => {
    // Helper Format Tanggal YYYY-MM-DD untuk Input Date
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // State Data Tabel & Pagination
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [totalRecords, setTotalRecords] = useState(0);

    // State Filter Search
    const [filterInput, setFilterInput] = useState({
        tgl_start: getTodayDate(),
        tgl_end: getTodayDate(),
        nip: '',
        nama: ''
    });

    // State Modal Map Tracking
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedKaryawan, setSelectedKaryawan] = useState(null);
    const [gpsHistory, setGpsHistory] = useState([]);
    const [mapLoading, setMapLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [page]);

    // 1. FETCH DATA LIST MONITORING LOKASI TERAKHIR
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {
                page,
                limit,
                tgl_start: filterInput.tgl_start,
                tgl_end: filterInput.tgl_end,
                nip: filterInput.nip,
                nama: filterInput.nama
            };

            const res = await api.get('/hrd/monitoring-lokasi/list', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setData(res.data.data || []);
            setTotalRecords(res.data.total_records || 0);
        } catch (err) {
            console.error("Gagal load monitoring lokasi:", err);
            Swal.fire('Error', 'Gagal memuat data monitoring lokasi karyawan', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 2. FETCH HISTORY GPS UNTUK POP-UP MAP TRACKING
    const handleOpenMapHistory = async (row) => {
        setSelectedKaryawan(row);
        setIsMapModalOpen(true);
        setMapLoading(true);

        try {
            const token = localStorage.getItem('token');
            const params = {
                nip: row.kry_nip,
                tgl_start: filterInput.tgl_start,
                tgl_end: filterInput.tgl_end
            };

            const res = await api.get('/hrd/monitoring-lokasi/history-gps', {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setGpsHistory(res.data.data || []);
        } catch (err) {
            console.error("Gagal load history GPS:", err);
            Swal.fire('Error', 'Gagal memuat history rute GPS', 'error');
        } finally {
            setMapLoading(false);
        }
    };

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // Menghitung Titik Center Peta
    const getMapCenter = () => {
        if (gpsHistory.length > 0) {
            const lastPoint = gpsHistory[gpsHistory.length - 1];
            return [lastPoint.kaul_lat, lastPoint.kaul_long];
        }
        if (selectedKaryawan && selectedKaryawan.kaul_lat) {
            return [selectedKaryawan.kaul_lat, selectedKaryawan.kaul_long];
        }
        return [-6.2088, 106.8456]; // Default Jakarta / Bekas
    };

    // Koordinat Polyline untuk Garis Rute
    const polylinePositions = gpsHistory.map(pt => [pt.kaul_lat, pt.kaul_long]);

    return (
        <div className="min-h-screen p-4 space-y-6 bg-slate-50 text-slate-800">

            {/* HEADER TITLE */}
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
                <div>
                    <h1 className="text-xl font-bold tracking-wide uppercase text-slate-800">
                        MONITORING LOKASI KARYAWAN (GPS TRACKING)
                    </h1>
                    <p className="text-xs text-slate-500">
                        Pemantauan posisi dan history rekam jejak koordinat GPS sopir & karyawan secara real-time
                    </p>
                </div>
            </div>

            {/* 🔍 AREA FILTER & PENCARIAN (PUTIH BERSIH DAKOTA) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Search size={14} /> FILTER & PENCARIAN MONITORING
                </h3>

                <div className="grid grid-cols-4 gap-3 text-xs">
                    {/* Tanggal Mulai */}
                    <div>
                        <label className="font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                            <Calendar size={13} /> Tanggal Mulai
                        </label>
                        <input
                            type="date"
                            className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                            value={filterInput.tgl_start}
                            onChange={(e) => setFilterInput({ ...filterInput, tgl_start: e.target.value })}
                        />
                    </div>

                    {/* Tanggal Sampai */}
                    <div>
                        <label className="font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                            <Calendar size={13} /> Sampai Tanggal
                        </label>
                        <input
                            type="date"
                            className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                            value={filterInput.tgl_end}
                            onChange={(e) => setFilterInput({ ...filterInput, tgl_end: e.target.value })}
                        />
                    </div>

                    {/* Filter NIP */}
                    <div>
                        <label className="font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                            <Hash size={13} /> NIP Karyawan
                        </label>
                        <input
                            type="text"
                            placeholder="MASUKKAN NIP SOPIR..."
                            className="w-full p-2 border border-slate-300 rounded uppercase bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            value={filterInput.nip}
                            onChange={(e) => setFilterInput({ ...filterInput, nip: e.target.value })}
                        />
                    </div>

                    {/* Filter Nama */}
                    <div>
                        <label className="font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                            <User size={13} /> Nama Karyawan
                        </label>
                        <input
                            type="text"
                            placeholder="MASUKKAN NAMA SOPIR..."
                            className="w-full p-2 border border-slate-300 rounded uppercase bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            value={filterInput.nama}
                            onChange={(e) => setFilterInput({ ...filterInput, nama: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                    <button
                        type="button"
                        onClick={() => { setPage(1); fetchData(); }}
                        className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                        <Search size={14} /> REFRESH / CARI
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFilterInput({
                                tgl_start: getTodayDate(),
                                tgl_end: getTodayDate(),
                                nip: '',
                                nama: ''
                            });
                            setPage(1);
                            fetchData();
                        }}
                        className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                        <RefreshCw size={14} /> RESET
                    </button>
                </div>
            </div>

            {/* 📊 AREA TABEL MONITORING LOKASI TERAKHIR */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-blue-600 text-white font-bold uppercase tracking-wider text-[11px]">
                                <th className="p-2.5 border-r border-white">NIP</th>
                                <th className="p-2.5 border-r border-white">Nama Karyawan</th>
                                <th className="p-2.5 border-r border-white text-center">Waktu Update Terakhir</th>
                                <th className="p-2.5 border-r border-white text-right">Latitude</th>
                                <th className="p-2.5 border-r border-white text-right">Longitude</th>
                                <th className="p-2.5 text-center">Aksi / Peta GPS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-400 font-bold">Memuat data lokasi karyawan...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-400 font-bold">Tidak ada data lokasi ditemukan</td></tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.kry_nip} className="border-b border-slate-200 hover:bg-slate-50 transition">
                                        <td className="p-2.5 border-r border-slate-200 font-bold text-blue-600">
                                            <button
                                                onClick={() => handleOpenMapHistory(row)}
                                                className="hover:underline font-black cursor-pointer text-left"
                                            >
                                                {row.kry_nip}
                                            </button>
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">{row.kry_nama}</td>
                                        <td className="p-2.5 border-r border-slate-200 text-center font-semibold text-slate-600">
                                            {row.kaul_updatetime ? new Date(row.kaul_updatetime).toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-700">
                                            {row.kaul_lat || '-'}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-700">
                                            {row.kaul_long || '-'}
                                        </td>
                                        <td className="p-2.5 text-center">
                                            <button
                                                onClick={() => handleOpenMapHistory(row)}
                                                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm"
                                            >
                                                <MapPin size={13} /> Peta History GPS
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="flex justify-between items-center mt-4 text-xs font-semibold">
                    <span className="text-slate-500">Total: {totalRecords} Karyawan (Halaman {page} dari {totalPages})</span>
                    <div className="flex gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            &laquo; Prev
                        </button>
                        <span className="px-3 py-1 bg-blue-600 text-white rounded font-bold">{page}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next &raquo;
                        </button>
                    </div>
                </div>
            </div>

            {/* 🗺️ MODAL POP-UP PETA HISTORY GPS TRACKING */}
            {isMapModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl p-5 rounded-xl bg-white shadow-2xl text-slate-800 flex flex-col space-y-4 max-h-[90vh]">

                        {/* Header Modal */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <Navigation className="text-blue-600" size={20} />
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm uppercase">
                                        HISTORY REKAM JEJAK GPS: {selectedKaryawan?.kry_nama} ({selectedKaryawan?.kry_nip})
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Periode: {filterInput.tgl_start} s/d {filterInput.tgl_end} | Total Titik Terdeteksi: {gpsHistory.length}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsMapModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XIcon size={20} />
                            </button>
                        </div>

                        {/* Map Container */}
                        <div className="w-full h-[450px] rounded-lg overflow-hidden border border-slate-300 relative">
                            {mapLoading ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100 font-bold text-slate-500">
                                    Memuat Peta & History GPS...
                                </div>
                            ) : (
                                <MapContainer
                                    center={getMapCenter()}
                                    zoom={13}
                                    scrollWheelZoom={true}
                                    style={{ height: "100%", width: "100%" }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />

                                    {/* Garis Rute Perjalanan GPS */}
                                    {polylinePositions.length > 1 && (
                                        <Polyline positions={polylinePositions} color="blue" weight={4} opacity={0.7} dashArray="5, 10" />
                                    )}

                                    {/* Marker Titik-Titik GPS */}
                                    {gpsHistory.map((pt, idx) => (
                                        <Marker
                                            key={idx}
                                            position={[pt.kaul_lat, pt.kaul_long]}
                                            icon={customMarkerIcon}
                                        >
                                            <Popup>
                                                <div className="text-xs space-y-1">
                                                    <p className="font-bold text-blue-600">{pt.kry_nama}</p>
                                                    <p><b>Waktu:</b> {new Date(pt.kaul_updatetime).toLocaleString('id-ID')}</p>
                                                    <p><b>Lat:</b> {pt.kaul_lat}</p>
                                                    <p><b>Long:</b> {pt.kaul_long}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="flex justify-end border-t border-slate-200 pt-3">
                            <button
                                onClick={() => setIsMapModalOpen(false)}
                                className="px-5 py-2 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
                            >
                                Tutup Peta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonitoringLokasiKaryawan;
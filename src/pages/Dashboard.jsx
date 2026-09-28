import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Package,
  Truck,
  Clock,
  CheckCircle2,
  Bot,
  Send,
  X,
  TrendingUp,
  AlertCircle,
  Search
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Data tren performa 30 hari
const achievementData = [
  { tanggal: '01', pencapaian: 42, target: 50 },
  { tanggal: '05', pencapaian: 58, target: 50 },
  { tanggal: '10', pencapaian: 65, target: 55 },
  { tanggal: '15', pencapaian: 50, target: 55 },
  { tanggal: '20', pencapaian: 78, target: 60 },
  { tanggal: '25', pencapaian: 85, target: 60 },
  { tanggal: '30', pencapaian: 92, target: 65 },
];

const Dashboard = () => {
  // State Summary Metrik
  const [summary, setSummary] = useState({
    totalCargo: 0,
    inTransit: 0,
    pending: 0,
    completed: 0,
    growthPercentage: 12
  });

  // State Drill-Down Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState({ key: '', title: '', color: '' });
  const [detailData, setDetailData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');

  // State BTT Berjalan Sisi Kanan (Real DB)
  const [recentBTTList, setRecentBTTList] = useState([]);

  // State Chatbot AI
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Halo Pak/Bu, saya Asisten AI Dakota. Ada yang ingin ditanyakan seputar pencapaian cabang atau status BTT?' }
  ]);
  const [inputChat, setInputChat] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchDashboardMetrics();
    fetchRecentActiveBTT();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/dashboard/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.data) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error("Gagal load metrik dashboard:", err);
    }
  };

  // Mengambil 5 BTT aktif terkini dari DB untuk widget kanan
  const fetchRecentActiveBTT = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/dashboard/btt-by-status?status=IN%20TRANSIT&limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Data BTT Aktif Berjalan:", res.data);
      if (res.data?.data && res.data.data.length > 0) {
        setRecentBTTList(res.data.data);
      }
    } catch (err) {
      console.error("Gagal load BTT aktif:", err);
    }
  };

  // Handler klik kartu metrik (Mengambil TOP 5 Data Riil dari DB)
  const handleCardClick = async (categoryKey, categoryTitle, themeColor) => {
    setSelectedCategory({ key: categoryKey, title: categoryTitle, color: themeColor });
    setIsDetailModalOpen(true);
    setModalLoading(true);
    setDetailSearch('');

    try {
      const token = localStorage.getItem('token');
      const ptId = localStorage.getItem('pt_id') || 'C';

      const res = await api.get(
        `/dashboard/btt-by-status?pt_id=${ptId}&status=${encodeURIComponent(categoryKey)}&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDetailData(res.data?.data || []);
    } catch (err) {
      console.error("Gagal load detail BTT dari database:", err);
      setDetailData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputChat.trim() || chatLoading) return;

    const userText = inputChat;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInputChat('');
    setChatLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/ai/chat', { prompt: userText }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const aiReply = res.data?.reply || 'Maaf, saya belum dapat memproses pertanyaan tersebut.';
      setMessages(prev => [...prev, { role: 'assistant', text: aiReply }]);
    } catch (err) {
      console.error("Gagal kontak AI:", err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Maaf, terjadi kendala saat menghubungkan ke asisten AI.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredDetailData = detailData.filter(item =>
    item.no_btt?.toLowerCase().includes(detailSearch.toLowerCase()) ||
    item.asal?.toLowerCase().includes(detailSearch.toLowerCase()) ||
    item.tujuan?.toLowerCase().includes(detailSearch.toLowerCase()) ||
    item.pengirim?.toLowerCase().includes(detailSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 🌟 1. KARTU STATISTIK (DAPAT DIKLIK) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => handleCardClick('ALL', 'Top 5 BTT Keseluruhan', 'blue')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-md transition duration-200 group active:scale-[0.99]"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase group-hover:text-blue-600 transition">TOTAL CARGO</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{summary.totalCargo.toLocaleString('id-ID')}</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> +{summary.growthPercentage}% dari bulan lalu
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
            <Package size={24} />
          </div>
        </div>

        <div
          onClick={() => handleCardClick('IN_TRANSIT', 'Top 5 BTT Sedang Dalam Perjalanan', 'amber')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition duration-200 group active:scale-[0.99]"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase group-hover:text-amber-600 transition">IN TRANSIT</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{summary.inTransit.toLocaleString('id-ID')}</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Sedang di perjalanan</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition">
            <Truck size={24} />
          </div>
        </div>

        <div
          onClick={() => handleCardClick('PENDING', 'Top 5 BTT Tertahan / Pending Hub', 'rose')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-400 hover:shadow-md transition duration-200 group active:scale-[0.99]"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase group-hover:text-rose-600 transition">PENDING / TERTAHAN</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{summary.pending.toLocaleString('id-ID')}</h3>
            <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> Perlu investigasi hub
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition">
            <Clock size={24} />
          </div>
        </div>

        <div
          onClick={() => handleCardClick('COMPLETED', 'Top 5 BTT Terkirim Sukses (POD Completed)', 'emerald')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-400 hover:shadow-md transition duration-200 group active:scale-[0.99]"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase group-hover:text-emerald-600 transition">COMPLETED (POD)</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{summary.completed.toLocaleString('id-ID')}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Terkirim sukses</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* 🌟 2. DIAGRAM TREN PENCAPAIAN & BTT AKTIF BERJALAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-sm uppercase text-slate-800">Tren Pencapaian Tonase / Omzet</h3>
              <p className="text-xs text-slate-500">Performa harian bulan berjalan vs target manajemen</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg">
              Bulan Ini
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={achievementData}>
                <defs>
                  <linearGradient id="colorPencapaian" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="pencapaian" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorPencapaian)" name="Pencapaian (Ton)" />
                <Area type="monotone" dataKey="target" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm uppercase text-slate-800">BTT Aktif Berjalan</h3>
            <button
              type="button"
              onClick={() => handleCardClick('IN_TRANSIT', 'Top 5 BTT Sedang Dalam Perjalanan', 'amber')}
              className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer bg-transparent border-0"
            >
              Lihat 5 Teratas
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
            {recentBTTList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-medium">Tidak ada BTT aktif berjalan saat ini.</p>
            ) : (
              recentBTTList.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 hover:bg-sky-50/50 rounded-xl border border-slate-100 transition">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-black text-xs text-sky-700">{item.no_btt}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {item.status || 'IN TRANSIT'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{item.asal} &rarr; {item.tujuan}</p>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>{item.armada || item.pengirim}</span>
                    <span className="font-mono font-bold text-slate-700">Rp {Number(item.harga || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 🌟 3. POP-UP DRILL-DOWN DATA RIIL (TOP 5 DATABASE) */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">DETAIL OPERASIONAL BTT (TOP 5 TERATAS)</span>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  {selectedCategory.title}
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {filteredDetailData.length} Data
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor BTT, kota asal, kota tujuan, pengirim..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-sky-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-medium">Data realtime dari database DLI</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {modalLoading ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
                  Memuat data operasional dari database DLI...
                </div>
              ) : filteredDetailData.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-bold">
                  Tidak ada data BTT ditemukan untuk kategori ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-3">NO BTT</th>
                      <th className="p-3">TANGGAL</th>
                      <th className="p-3">RUTE (ASAL &rarr; TUJUAN)</th>
                      <th className="p-3">PENGIRIM / PENERIMA</th>
                      <th className="p-3 text-right">BERAT / BIAYA</th>
                      <th className="p-3">ARMADA / SUPIR</th>
                      <th className="p-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredDetailData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-sky-50/40 transition">
                        <td className="p-3 font-mono font-black text-sky-700">{row.no_btt}</td>
                        <td className="p-3 text-slate-600">{row.tanggal}</td>
                        <td className="p-3 font-bold text-slate-800">
                          {row.asal} &rarr; <span className="text-sky-600">{row.tujuan}</span>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{row.pengirim}</p>
                          <p className="text-[10px] text-slate-400">{row.penerima}</p>
                        </td>
                        <td className="p-3 text-right">
                          <p className="font-mono font-bold text-slate-800">{row.berat} Kg</p>
                          <p className="font-mono text-[10px] text-rose-600 font-bold">Rp {Number(row.harga || 0).toLocaleString('id-ID')}</p>
                        </td>
                        <td className="p-3 text-slate-700">{row.armada || '-'}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50/50">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 4. TOMBOL & WIDGET CHAT AI FLOATING */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="p-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-full shadow-2xl hover:scale-105 transition duration-200 flex items-center gap-2 cursor-pointer border-2 border-white"
            title="Tanya AI Assistant"
          >
            <Bot size={24} />
            <span className="font-bold text-xs pr-1">Tanya AI</span>
          </button>
        ) : (
          <div className="w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[480px] overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Bot size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">Dakota Insight AI</h4>
                  <p className="text-[10px] text-sky-100">Siap menjawab ringkasan bisnis & operasional</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] ${m.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
                    }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl text-xs flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
              <input
                type="text"
                placeholder="Tanya misal: 'Berapa BTT yang pending?'..."
                value={inputChat}
                onChange={(e) => setInputChat(e.target.value)}
                className="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
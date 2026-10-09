import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  ArrowRight,
  Building2,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import api from '../api/axios';
import WarningModal from '../components/WarningModal';
import logoDakota from '../assets/logo.png';

const defaultSlides = [
  {
    id: 1,
    tag: "TRANSPORT & LOGISTICS SOLUTION",
    title: "#1 Solusi Pengiriman",
    highlight: "Kargo & Ekspedisi",
    desc: "Layanan pengiriman kargo darat terpercaya ke seluruh pelosok Nusantara dengan tarif transparan dan jangkauan armada terlengkap.",
    bgImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: 2,
    tag: "ARMADA DAKOTA LENGKAP & TERPERCAYA",
    title: "Layanan Carter &",
    highlight: "Paket Reguler",
    desc: "Tersedia pilihan armada Colt Diesel, Fuso, hingga Tronton untuk kebutuhan logistik korporat maupun ritel reguler.",
    bgImage: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1600&q=80"
  }
];

const Login = () => {
  const [slides, setSlides] = useState(defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [selectedPT, setSelectedPT] = useState('A');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Bersihkan sisa sesi login saat masuk ke halaman ini
  useEffect(() => {
    const hardPurgeNow = () => {
      const savedIdleTime = localStorage.getItem('max_idle_time');
      sessionStorage.clear();

      const targetedKeys = [
        'token', 'active_agen_id', 'kode_cabang', 'role_akses',
        'user_name', 'username', 'selected_pt', 'pt_id', 'active_corporate',
        'profile_kode_cabang', 'profileimage'
      ];

      targetedKeys.forEach(key => localStorage.removeItem(key));

      if (savedIdleTime) {
        localStorage.setItem('max_idle_time', savedIdleTime);
      }
    };

    hardPurgeNow();
    const intervalPurge = setInterval(hardPurgeNow, 50);
    const timeoutStop = setTimeout(() => clearInterval(intervalPurge), 300);

    return () => {
      clearInterval(intervalPurge);
      clearTimeout(timeoutStop);
    };
  }, []);

  // Ambil banner dinamis dari Setting Manajemen Banner Depan
  useEffect(() => {
    api.get('/public/login-banner')
      .then((res) => {
        let bannerList = [];

        // Deteksi apakah backend mengirim array atau 1 URL
        if (Array.isArray(res.data?.banners)) {
          bannerList = res.data.banners.filter(Boolean);
        } else if (res.data?.banner_url) {
          try {
            const parsed = JSON.parse(res.data.banner_url);
            bannerList = Array.isArray(parsed) ? parsed.filter(Boolean) : [res.data.banner_url];
          } catch {
            bannerList = [res.data.banner_url];
          }
        }

        if (bannerList.length > 0) {
          const backendHost = api.defaults.baseURL
            ? api.defaults.baseURL.replace(/\/api\/?$/, '')
            : `${window.location.protocol}//${window.location.hostname}:9090`;

          // Format URL menjadi link lengkap
          const dynamicSlides = bannerList.map((rawUrl, idx) => {
            const matchUpload = rawUrl.match(/\/uploads\/.*$/);
            const cleanPath = matchUpload ? matchUpload[0] : rawUrl;
            const fullUrl = cleanPath.startsWith('/uploads') ? `${backendHost}${cleanPath}` : cleanPath;

            return {
              id: idx + 1,
              tag: `DAKOTA PROMO #${idx + 1}`,
              title: idx === 0 ? "Solusi Ekspedisi &" : "Layanan Pengiriman",
              highlight: idx === 0 ? "Kargo Terpercaya" : "Cepat & Aman",
              desc: "Pengiriman barang ke seluruh Nusantara dengan jangkauan rute terluas dan tarif terbaik.",
              bgImage: fullUrl
            };
          });

          setSlides(dynamicSlides);
        }
      })
      .catch((err) => {
        console.log('Menggunakan slide default:', err);
      });
  }, []);

  // Auto-play Slider Carousel tiap 6 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Manajemen Modal Warning & Pembatasan Percobaan Login
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: '',
    countdown: 0
  });

  const getFailedAttempts = () => parseInt(localStorage.getItem('failedAttempts') || '0', 10);
  const setFailedAttempts = (count) => localStorage.setItem('failedAttempts', count.toString());
  const setLockedUntil = (timestamp) => localStorage.setItem('lockedUntil', timestamp.toString());
  const setIsBlocked = (status) => localStorage.setItem('isBlocked', status.toString());

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/login', {
        email: email,
        password: password,
        pt_id: selectedPT
      });

      const { token, user, pt_id } = response.data;
      const finalPT = pt_id || user?.pt_id || selectedPT;

      const savedIdleTime = localStorage.getItem('max_idle_time');
      const keysToClear = [
        'token', 'user_name', 'username', 'selected_pt', 'pt_id',
        'active_corporate', 'role_akses', 'kode_cabang', 'active_agen_id'
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));

      if (savedIdleTime) {
        localStorage.setItem('max_idle_time', savedIdleTime);
      } else {
        localStorage.setItem('max_idle_time', (3 * 60 * 1000).toString());
      }

      // Pemetaan Corporate
      let corpName = 'DLI';
      if (finalPT === 'A') corpName = 'DBS';
      else if (finalPT === 'B') corpName = 'DLB';
      else if (finalPT === 'C') corpName = 'DLI';

      localStorage.setItem('token', token);
      localStorage.setItem('user_name', user?.realname || user?.real_name || 'User');
      localStorage.setItem('username', user?.username || 'user');
      localStorage.setItem('selected_pt', finalPT);
      localStorage.setItem('pt_id', finalPT);
      localStorage.setItem('active_corporate', corpName);

      const userRole = user?.usertype || user?.user_type || 'U';
      localStorage.setItem('role_akses', userRole);

      const validAgenId = user?.agen_id || user?.id_agen || user?.kode_agen || '1';

      if (userRole === 'S' || user?.all_cabangyn === 'Y') {
        localStorage.setItem('kode_cabang', 'PUSAT DAKOTA');
        localStorage.setItem('active_agen_id', String(validAgenId));
        localStorage.setItem('active_agen_nama', 'PUSAT DAKOTA');
      } else {
        const rawCabangString = user?.kode_cabang || '';
        if (rawCabangString !== '') {
          const firstCleanCabang = rawCabangString.split(',')[0].trim();
          localStorage.setItem('kode_cabang', rawCabangString);
          localStorage.setItem('active_agen_id', String(user?.agen_id || firstCleanCabang));
          localStorage.setItem('active_agen_nama', user?.agen_nama || firstCleanCabang);
        } else {
          localStorage.setItem('kode_cabang', 'EMPTY');
          localStorage.setItem('active_agen_id', 'EMPTY');
          localStorage.setItem('active_agen_nama', 'EMPTY');
        }
      }

      localStorage.removeItem('failedAttempts');
      localStorage.removeItem('lockedUntil');
      localStorage.removeItem('isBlocked');

      navigate('/dashboard');
    } catch (error) {
      console.error('Login Gagal:', error.response?.data?.message || error.message);
      const attempts = getFailedAttempts() + 1;
      setFailedAttempts(attempts);

      const errorMessage = error.response?.data?.message?.toLowerCase() || '';

      if (attempts >= 7) {
        setIsBlocked(true);
        setModalConfig({
          isOpen: true,
          message: 'Terlalu banyak percobaan login.\nUntuk sementara, akses dari IP kamu diblokir.\nSilakan hubungi Admin untuk bantuan lebih lanjut.',
          countdown: 0
        });
      } else if (attempts === 6) {
        setLockedUntil(Date.now() + 180000);
        setModalConfig({
          isOpen: true,
          message: 'Kamu telah melakukan 6 kali percobaan login.\nSilakan coba kembali dalam\n{time}.',
          countdown: 180
        });
      } else if (attempts === 3) {
        setLockedUntil(Date.now() + 60000);
        setModalConfig({
          isOpen: true,
          message: 'Kamu telah melakukan 3 kali percobaan login.\nSilakan coba kembali dalam\n{time}.',
          countdown: 60
        });
      } else {
        let specificError = 'Email atau Password yang kamu masukkan tidak sesuai';
        if (errorMessage.includes('user') || errorMessage.includes('email') || errorMessage.includes('not found')) {
          specificError = 'Email yang kamu masukkan tidak sesuai';
        } else if (errorMessage.includes('password') || errorMessage.includes('wrong')) {
          specificError = 'Password yang kamu masukkan tidak sesuai';
        }
        setModalConfig({
          isOpen: true,
          message: specificError,
          countdown: 0
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const closeWarningModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans bg-slate-950 select-none">

      {/* NAVBAR */}
      <nav className="absolute top-0 left-0 w-full z-30 px-6 lg:px-16 py-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
        <div className="flex items-center gap-3 cursor-pointer">
          <img
            src={logoDakota}
            alt="Dakota Cargo Logo"
            className="h-10 lg:h-12 w-auto object-contain drop-shadow-md"
          />
          <div className="flex flex-col">
            <span className="text-white text-xl lg:text-2xl font-black tracking-wider uppercase leading-none font-['Inter'] drop-shadow">
              DAKOTA CARGO
            </span>
            <span className="text-sky-300 text-[10px] tracking-widest font-bold uppercase mt-1">
              LOGISTICS & TRANSPORTATION
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsLoginModalOpen(true)}
          className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <span>Masuk Sistem</span>
          <ArrowRight size={16} />
        </button>
      </nav>

      {/* HERO CAROUSEL */}
      <div className="relative w-full h-full overflow-hidden">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
            >
              <img
                src={slide.bgImage}
                alt={slide.title}
                className={`w-full h-full object-cover transform duration-[8000ms] ease-out ${isActive ? 'scale-105' : 'scale-100'
                  }`}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#060315]/95 via-[#060315]/75 to-transparent" />

              <div className="absolute inset-0 flex items-center px-8 lg:px-24">
                <div className="max-w-2xl text-white space-y-4">
                  <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-sky-400 text-xs font-bold tracking-widest uppercase transition-all duration-700 delay-200 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                    <ShieldCheck size={14} />
                    {slide.tag}
                  </div>

                  <h2 className={`text-4xl lg:text-6xl font-black leading-tight tracking-tight transition-all duration-700 delay-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}>
                    {slide.title} <span className="text-sky-400">{slide.highlight}</span>
                  </h2>

                  <p className={`text-slate-300 text-sm lg:text-base leading-relaxed transition-all duration-700 delay-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}>
                    {slide.desc}
                  </p>

                  <div className={`pt-4 transition-all duration-700 delay-700 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}>
                    <button
                      onClick={() => setIsLoginModalOpen(true)}
                      className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm tracking-wider uppercase shadow-xl transition-all duration-300 transform active:scale-95 cursor-pointer"
                    >
                      Buka Form Login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Panah Carousel */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer"
        >
          <ChevronRight size={24} />
        </button>

        {/* Indikator Slider */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${idx === currentSlide ? 'w-8 bg-sky-400' : 'w-2 bg-white/40'
                }`}
            />
          ))}
        </div>
      </div>

      {/* MODAL LOGIN POP-UP HALUS */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${isLoginModalOpen
          ? 'opacity-100 pointer-events-auto backdrop-blur-md bg-black/60'
          : 'opacity-0 pointer-events-none backdrop-blur-none bg-transparent'
          }`}
      >
        <div
          className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 transition-all duration-500 transform ${isLoginModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
            }`}
        >
          {/* Header Popup Login */}
          <div className="px-6 py-4 bg-[#004b84] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={20} />
              <span className="font-black text-sm uppercase tracking-wider">LOGIN PORTAL DAKOTA</span>
            </div>
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="p-1 rounded-lg text-white hover:bg-white/20 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Login */}
          <div className="p-7 space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Selamat Datang</h3>
              <p className="text-xs text-slate-500 font-medium">Silakan masuk menggunakan akun Dakota Anda</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">

              {/* Pilihan Corporate */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Perusahaan (Corporate) :</label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedPT}
                    onChange={(e) => setSelectedPT(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition appearance-none bg-white cursor-pointer"
                  >
                    <option value="A">PT Dakota Buana Sarana (DBS)</option>
                    <option value="B">PT Dakota Lintas Buana (DLB)</option>
                    <option value="C">PT Dakota Logistik Indonesia (DLI)</option>
                  </select>
                </div>
              </div>

              {/* Input Username / Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Username / Email :</label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="Masukkan username atau email..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Password :</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="Masukkan password Anda..."
                    className="w-full pl-10 pr-10 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Tombol Masuk */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-blue-500/30 transition-all transform active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Memproses...' : 'Masuk Sekarang'}</span>
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL PERINGATAN SALAH LOGIN / COOLDOWN */}
      <WarningModal
        isOpen={modalConfig.isOpen}
        message={modalConfig.message}
        countdown={modalConfig.countdown}
        onClose={closeWarningModal}
      />
    </div>
  );
};

export default Login;
import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ChevronRight, X, User, Lock, ChevronDown, Cpu } from 'lucide-react'
import api from './api/axios'
import Dashboard from './pages/Dashboard'
import bgLogin from './assets/bg1.png'
import logo from './assets/logo.png'
import MainLayout from './layouts/MainLayout'
import Account from './pages/Account';
import UnderConstruction from './components/organisms/UnderConstruction';
import UserManagement from './pages/UserManagement';
import MasterAgen from './pages/MasterAgen';
import MasterKodePos from './pages/MasterKodePos';
import MasterTarifEkonomis from './pages/MasterTarifEkonomis';
import MasterTarifReguler from './pages/MasterTarifReguler';
import MasterTarifUnit from './pages/MasterTarifUnit';
import MarketingBTT from './pages/MarketingBTT';
import SecuritySettings from './pages/SecuritySettings';
import MasterCustomer from './pages/MasterCustomer';
import BttPrintPage from './pages/BttPrintPage';
import BttClosingHarianDashboard from './components/organisms/BttClosingHarianDashboard';
import MasterAreaLoper from './pages/MasterAreaLoper';
import SuratPengantarPengiriman from './pages/SuratPengantarPengiriman';
import SuratPengantarTurun from './pages/SuratPengantarTurun';
import Loper from './pages/SuratLoper';
import SuratKembaliBTT from './pages/SuratKembaliBTT';
import SuratPengantarPrint from './pages/SuratPengantarPrint';
import SuratPengantarPAD from './pages/SuratPengantarPAD';
import MarketingBDB from './pages/MarketingBDB';
import MarketingMonitoringBTT from './pages/MarketingMonitoringBTT';

const getCompanyName = (pt) => {
  if (pt === 'A') return 'Dakota Buana Sarana'; ``
  if (pt === 'B') return 'Dakota Lintas Buana';
  if (pt === 'C') return 'Dakota Logistik Indonesia';
  return pt;
};

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPT, setSelectedPT] = useState('')
  const [isPTDropdownOpen, setIsPTDropdownOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  // --- Logic validasi attempts ---
  const getFailedAttempts = () => parseInt(localStorage.getItem('failedAttempts') || '0', 10);
  const setFailedAttempts = (count) => localStorage.setItem('failedAttempts', count.toString());
  const getLockedUntil = () => parseInt(localStorage.getItem('lockedUntil') || '0', 10);
  const setLockedUntil = (timestamp) => localStorage.setItem('lockedUntil', timestamp.toString());
  const getIsBlocked = () => localStorage.getItem('isBlocked') === 'true';
  const setIsBlocked = (status) => localStorage.setItem('isBlocked', status.toString());

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (showErrorPopup && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showErrorPopup, countdown]);

  const checkLockoutStatus = () => {
    if (getIsBlocked()) {
      setErrorMessage("Terlalu banyak percobaan login.\nUntuk sementara, akses dari IP kamu diblokir.\nSilakan hubungi Admin untuk bantuan lebih lanjut.");
      setCountdown(0);
      setShowErrorPopup(true);
      return false;
    }

    const lockedUntil = getLockedUntil();
    const now = Date.now();

    if (lockedUntil > now) {
      const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
      const attempts = getFailedAttempts();
      setErrorMessage(`Kamu telah melakukan ${attempts} kali percobaan login.\nSilakan coba kembali dalam {time}.`);
      setCountdown(remainingSeconds);
      setShowErrorPopup(true);
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!selectedPT) {
      setErrorMessage("Please select a Corporate first.");
      setShowErrorPopup(true);
      return;
    }

    if (!checkLockoutStatus()) {
      return;
    }

    console.log("%c🚀 [Frontend] Mulai login", "color: #0056b3; font-weight: bold;");
    console.log("📧 Email:", email);
    console.log("🔐 Password:", password);
    console.log("🏢 PT ID:", selectedPT);
    console.log("🌍 API URL:", import.meta.env.VITE_API_URL);

    try {
      const loginPayload = {
        email: email,
        password: password,
        pt_id: selectedPT
      };
      console.log("%c📨 Payload yang dikirim:", "color: #FF9800; font-weight: bold;", loginPayload);

      const response = await api.post('/login', loginPayload)
      console.log("✅ [Frontend] Berhasil!", response.data);

      // =========================================================================
      // 👑 PROSES LOCK & PENYIMPANAN AGEN ID YANG BERSIH DAN ANTI-OVERWRITE
      // =========================================================================
      if (response.data.user && response.data.user.agent_code) {
        localStorage.setItem('active_agen_id', response.data.user.agent_code);
        console.log("🔥 Menyimpan active_agen_id dari agent_code:", response.data.user.agent_code);
      } else if (response.data.user && response.data.user.agen_id) {
        localStorage.setItem('active_agen_id', response.data.user.agen_id);
      } else if (response.data.user && response.data.user.AgenID) {
        localStorage.setItem('active_agen_id', response.data.user.AgenID);
      } else {
        localStorage.setItem('active_agen_id', 'PUSAT DAKOTA');
      }

      // 👑 PROSES PENYIMPANAN CABANG ID
      if (response.data.user && response.data.user.agen_cabangid) {
        localStorage.setItem('active_cabang_id', response.data.user.agen_cabangid);
      } else if (response.data.user && response.data.user.AgenCabangID) {
        localStorage.setItem('active_cabang_id', response.data.user.AgenCabangID);
      }

      // KUNCI SISA DATA TOKEN & PROFILE USER
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user_name', response.data.user.real_name)
      localStorage.setItem('selected_pt', selectedPT)
      localStorage.setItem('pt_ID', selectedPT)

      console.log("🔥 Data PT & Agen berhasil dikunci di LocalStorage!");
      window.dispatchEvent(new Event('pt_changed'))

      // Hapus hukuman percobaan login
      localStorage.removeItem('failedAttempts');
      localStorage.removeItem('lockedUntil');
      localStorage.removeItem('isBlocked');

      navigate('/dashboard')

    } catch (error) {
      console.error("%c❌ [Frontend] Login GAGAL!", "color: #FF0000; font-weight: bold;");
      console.error("Error Status:", error.response?.status);
      console.error("Error Message:", error.response?.data?.message);
      console.error("Full Error Response:", error.response?.data);
      console.error("Error Config:", error.config);
      console.error("Error Details:", error.message);

      const attempts = getFailedAttempts() + 1;
      setFailedAttempts(attempts);

      let apiMsg = error.response?.data?.message?.toLowerCase() || "";
      let errMsg = "Email atau Password yang kamu masukkan tidak sesuai";

      const combinedMsg = (apiMsg || error.message.toLowerCase());

      if (combinedMsg.includes("email") || combinedMsg.includes("user") || combinedMsg.includes("not found") || combinedMsg.includes("404")) {
        const companyName = getCompanyName(selectedPT);
        errMsg = `Nama anda tidak terdaftar dalam perusahaan ${companyName}`;
      } else if (combinedMsg.includes("password") || combinedMsg.includes("wrong")) {
        errMsg = "Password yang kamu masukkan tidak sesuai";
      } else if (error.response?.data?.message) {
        errMsg = error.response.data.message;
      }

      if (attempts >= 7) {
        setIsBlocked(true);
        setErrorMessage("Terlalu banyak percobaan login.\nUntuk sementara, akses dari IP kamu diblokir.\nSilakan hubungi Admin untuk bantuan lebih lanjut.");
        setCountdown(0);
      } else if (attempts === 6) {
        setLockedUntil(Date.now() + 180000);
        setErrorMessage(`Kamu telah melakukan 6 kali percobaan login.\nSilakan coba kembali dalam {time}.`);
        setCountdown(180);
      } else if (attempts === 3) {
        setLockedUntil(Date.now() + 60000);
        setErrorMessage(`Kamu telah melakukan 3 kali percobaan login.\nSilakan coba kembali dalam {time}.`);
        setCountdown(60);
      } else {
        setErrorMessage(errMsg);
        setCountdown(0);
      }

      setShowErrorPopup(true);
    }
  }

  const renderMessage = () => {
    let finalMessage = errorMessage;
    if (countdown > 0) {
      finalMessage = finalMessage.replace('{time}', `${countdown} detik`);
    } else {
      finalMessage = finalMessage.replace('{time}', `0 detik`);
    }

    return finalMessage.split('\n').map((line, idx) => (
      <span key={idx}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="flex min-h-screen w-full bg-[#bcbcbc] overflow-hidden m-0 p-0 font-['Inter']">
      {/* SISI KIRI: Gambar Truk (Lebar proporsional mirip 657px dari 1440px) */}
      <div className="relative hidden w-[45%] h-screen lg:block overflow-hidden">
        <img
          className="absolute inset-0 h-full w-full object-cover object-top"
          src={bgLogin}
          alt="Dakota"
        />
        {/* Overlay Logo & Text (Sesuai posisi left-[111px] top-[65px] di Figma) */}
        <div className="absolute left-[8%] top-[6%] flex items-center gap-2.5">
          <img className="w-32 h-24 object-contain" src={logo} alt="Logo" />
          <div className="text-white text-5xl font-bold font-['Agdasima'] tracking-[2.55px] uppercase drop-shadow-md">
            DAKOTA CARGO
          </div>
        </div>
      </div>

      {/* SISI KANAN: Form Login (Lebar proporsional 783px) */}
      <div className="flex w-full lg:w-[54.4%] flex-col justify-center px-12 xl:px-40 relative z-10">

        <div className="w-full max-w-[458px] mx-auto flex flex-col items-start gap-4">
          {/* Title */}
          <div className="w-full text-gray-900 text-3xl font-bold font-['Inter'] leading-10">
            Login
          </div>
          <div className="w-full text-black text-base font-medium font-['Inter'] leading-6 mb-4">
            Please fill your information below
          </div>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">

            {/* Input Corporate (Custom Dropdown) */}
            <div className="relative w-full z-20">
              <div
                className={`w-full rounded-[10px] border-[3px] border-violet-950 flex flex-col bg-transparent transition-all duration-200 cursor-pointer ${isPTDropdownOpen ? 'bg-transparent' : 'h-20'}`}
                onClick={() => setIsPTDropdownOpen(!isPTDropdownOpen)}
              >
                {/* Header Input Area */}
                <div className="w-full h-20 min-h-[80px] flex items-center px-6 relative">
                  <span className="mr-4 text-black"><Cpu size={28} strokeWidth={2} /></span>

                  <div className="flex-1 flex flex-col justify-center">
                    {selectedPT ? (
                      <span className="text-black text-base font-normal font-['Poppins'] leading-6">
                        {getCompanyName(selectedPT)}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-base font-medium font-['Inter'] leading-6 opacity-0">Select Corporate Placeholder</span> /* Just for space */
                    )}
                  </div>

                  <div className={`absolute right-6 pointer-events-none text-black transition-transform duration-200 ${isPTDropdownOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={24} />
                  </div>

                  {/* Floating Label */}
                  <label className={`absolute left-[57px] px-2 transition-all duration-200 pointer-events-none text-slate-600 font-medium font-['Inter'] z-10 bg-[#bcbcbc] ${selectedPT || isPTDropdownOpen ? '-top-[10px] text-xs leading-4' : 'top-1/2 -translate-y-1/2 text-base leading-6'}`}>
                    Select Corporate
                  </label>
                </div>

                {/* Dropdown Options */}
                {isPTDropdownOpen && (
                  <div className="w-full bg-transparent flex flex-col border-t border-indigo-950/30">
                    <div
                      className="w-full h-10 px-6 py-2 flex items-center hover:bg-black/5 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedPT('A'); setIsPTDropdownOpen(false); }}
                    >
                      <span className="text-black text-base font-normal font-['Poppins'] leading-6">Dakota Buana Sarana</span>
                    </div>
                    <div
                      className="w-full h-10 px-6 py-2 flex items-center hover:bg-black/5 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedPT('B'); setIsPTDropdownOpen(false); }}
                    >
                      <span className="text-black text-base font-normal font-['Poppins'] leading-6">Dakota Lintas Buana</span>
                    </div>
                    <div
                      className="w-full h-10 px-6 py-2 flex items-center hover:bg-black/5 transition-colors rounded-b-[7px]"
                      onClick={(e) => { e.stopPropagation(); setSelectedPT('C'); setIsPTDropdownOpen(false); }}
                    >
                      <span className="text-black text-base font-normal font-['Poppins'] leading-6">Dakota Logistik Indonesia</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input UserName */}
            <div className={`w-full h-20 mt-2 rounded-[10px] border-[3px] border-violet-950 flex items-center px-6 relative z-0 transition-opacity ${!selectedPT ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-transparent'}`}>
              <span className="mr-4 text-black"><User size={28} strokeWidth={2} fill="currentColor" /></span>
              <input
                type="text"
                className="peer w-full h-full outline-none text-black text-base font-medium font-['Inter'] leading-6 bg-transparent placeholder-transparent disabled:cursor-not-allowed"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="UserName"
                disabled={!selectedPT}
                required
              />
              {/* Label Beranimasi */}
              <label className="absolute left-[57px] px-2 transition-all duration-200 pointer-events-none text-slate-600 font-medium font-['Inter'] z-10
                              -top-2 text-xs leading-4 bg-[#bcbcbc]
                              peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent peer-placeholder-shown:leading-6
                              peer-focus:-top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:bg-[#bcbcbc] peer-focus:leading-4">
                UserName
              </label>
            </div>

            {/* Input Password */}
            <div className="relative w-full mt-2">
              <div className={`w-full h-20 rounded-[10px] border-[3px] border-violet-950 flex items-center px-6 relative z-0 transition-opacity ${!selectedPT ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-transparent'}`}>
                <span className="mr-4 text-black"><Lock size={28} strokeWidth={2} /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`peer w-full h-full outline-none text-black text-lg font-medium font-['Inter'] leading-6 bg-transparent placeholder-transparent disabled:cursor-not-allowed ${!showPassword && selectedPT ? 'tracking-[0.2em]' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={!selectedPT}
                  required
                />
                <label className="absolute left-[57px] px-2 transition-all duration-200 pointer-events-none text-slate-600 font-medium font-['Inter'] z-10
                                -top-2 text-xs leading-4 bg-[#bcbcbc]
                                peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent peer-placeholder-shown:leading-6 peer-placeholder-shown:tracking-normal
                                peer-focus:-top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:bg-[#bcbcbc] peer-focus:leading-4">
                  Password
                </label>
                <span
                  className={`ml-auto text-black transition-colors z-20 ${!selectedPT ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-gray-600'}`}
                  onClick={() => selectedPT && setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye size={28} /> : <EyeOff size={28} strokeWidth={1.5} />}
                </span>
              </div>

              {/* Forgot password */}
              <div className="absolute -bottom-6 right-2">
                <span className="text-violet-950 text-[10px] font-medium font-['Poppins'] cursor-pointer hover:underline">
                  forgot password
                </span>
              </div>
            </div>

            {/* Tombol Login */}
            <div className="w-full flex justify-end mt-8">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-36 h-12 rounded-[10px] bg-[#2170f4] active:bg-[#1a5bc7] transition-all text-white font-medium text-[16px] shadow-sm hover:opacity-90"
              >
                Login
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pop Up Error Overlay */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          {/* Modal Container */}
          <div className="relative w-full max-w-[460px] bg-white rounded-3xl p-10 flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in duration-300">

            {/* Tombol Close silang */}
            <button
              onClick={() => setShowErrorPopup(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X size={18} className="text-gray-600" strokeWidth={2.5} />
            </button>

            {/* Ikon Bulatan Merah dengan Segitiga Tanda Seru yang tepat */}
            <div className="w-[100px] h-[100px] rounded-full bg-[#ff0b0b] flex items-center justify-center mb-6 shadow-[0_8px_20px_rgba(255,11,11,0.3)]">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Segitiga Putih Bulat */}
                <path d="M10.29 3.86L1.82 18C1.49 18.57 1.48 19.28 1.8 19.86C2.11 20.44 2.73 20.8 3.39 20.8H20.35C21.01 20.8 21.64 20.44 21.95 19.86C22.26 19.28 22.26 18.57 21.92 18L13.45 3.86C13.13 3.3 12.51 2.95 11.85 2.95C11.2 2.95 10.59 3.3 10.29 3.86Z" fill="white" />
                {/* Tanda Seru Merah di dalam */}
                <rect x="11" y="8.5" width="2" height="6.5" rx="1" fill="#ff0b0b" />
                <rect x="11" y="16.5" width="2" height="2" rx="1" fill="#ff0b0b" />
              </svg>
            </div>

            {/* Teks Judul */}
            <h2 className="text-3xl font-bold font-['Inter'] text-black mb-4 tracking-wide">
              WARNING
            </h2>

            {/* Pesan Error */}
            <p className="text-[17px] text-gray-500 font-medium font-['Inter'] text-center mb-10 text-balance px-4 leading-relaxed">
              {renderMessage()}
            </p>

            {/* Tombol Back Merah */}
            <button
              onClick={() => setShowErrorPopup(false)}
              className="w-[200px] py-4 bg-[#ff1b1b] hover:bg-[#d60d0d] active:scale-95 transition-all outline-none rounded-xl text-white text-[18px] font-medium tracking-wide shadow-[0_8px_20px_rgba(255,27,27,0.3)]"
            >
              Back
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function App() {
  return (
    <Routes>
      {/* 1. Halaman Login: Tanpa Layout (Full Screen) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Tambahkan ini supaya kalau orang buka web pertama kali langsung ke login */}
      <Route path="/" element={<LoginPage />} />

      {/* 2. Halaman Dashboard: Di dalam MainLayout */}
      <Route
        path="/dashboard"
        element={
          <MainLayout>
            <Dashboard />
          </MainLayout>
        }
      />

      {/* 3. Halaman Account: Di dalam MainLayout */}
      <Route
        path="/account"
        element={
          <MainLayout>
            <Account />
          </MainLayout>
        }
      />

      {/* SEMUA MENU LAIN DIARAHKAN KE SINI */}
      <Route path="/hrd"
        element={
          <MainLayout>
            <UnderConstruction menuName="HRD" />
          </MainLayout>
        }
      />
      <Route path="/marketing"
        element={
          <MainLayout>
            <UnderConstruction menuName="Marketing" />
          </MainLayout>
        }
      />

      {/* <Route path="/marketing/dashboard"
        element={
          <MainLayout>
            <UnderConstruction menuName="Marketing" />
          </MainLayout>
        }
      /> */}

      <Route path="/marketing/master-customer"
        element={
          <MainLayout>
            <MasterCustomer />
          </MainLayout>
        }
      />

      <Route path="/marketing/btt"
        element={
          <MainLayout>
            <MarketingBTT />
          </MainLayout>
        }
      />

      <Route path="/marketing/btt/print" element={<BttPrintPage />} />

      <Route path="/marketing/bdb"
        element={
          <MainLayout>
            <MarketingBDB />
          </MainLayout>
        }
      />

      <Route path="/marketing/cetak-btt"
        element={
          <MainLayout>
            <MarketingBTT />
          </MainLayout>
        }
      />

      <Route path="/marketing/monitoring-btt"
        element={
          <MainLayout>
            <MarketingMonitoringBTT />
          </MainLayout>
        }
      />

      {/* 🚀 VARIASI 1: Rute polosan sesuai link klik sidebar browser lu */}
      <Route path="/marketing/closing-harian"
        element={
          <MainLayout>
            <BttClosingHarianDashboard />
          </MainLayout>
        }
      />

      {/* 🚀 VARIASI 2: Jaga-jaga kalau ada tombol lama yang mengarah ke path komplit */}
      <Route path="/marketing/closing-harian-agen"
        element={
          <MainLayout>
            <BttClosingHarianDashboard />
          </MainLayout>
        }
      />

      <Route path="/operasional"
        element={
          <MainLayout>
            <UnderConstruction menuName="Operasional" />
          </MainLayout>
        }
      />

      <Route path="/operasional/pengembalian"
        element={
          <MainLayout>
            <SuratKembaliBTT />
          </MainLayout>
        }
      />

      <Route path="/operasional/sp-terima/print-nota/:id"
        element={
          <SuratPengantarPrint />
        }
      />

      <Route path="/operasional/surat-pengantar-pengiriman"
        element={
          <MainLayout>
            <SuratPengantarPengiriman />
          </MainLayout>
        }
      />

      <Route path="/operasional/surat-pengantar-sp-pad"
        element={
          <MainLayout>
            <SuratPengantarPAD />
          </MainLayout>
        }
      />

      <Route path="/operasional/surat-kembali-btt"
        element={
          <MainLayout>
            <SuratKembaliBTT />
          </MainLayout>
        }
      />

      <Route path="/operasional/surat-pengantar-turun"
        element={
          <MainLayout>
            <SuratPengantarTurun />
          </MainLayout>
        }
      />
      <Route path="/operasional/loper"
        element={
          <MainLayout>
            <Loper />
          </MainLayout>
        }
      />

      <Route path="/general-ledger"
        element={
          <MainLayout>
            <UnderConstruction menuName="General Ledger" />
          </MainLayout>
        }
      />

      <Route path="/Master"
        element={
          <MainLayout>
            <UnderConstruction menuName="Master Data" />
          </MainLayout>
        }
      />

      <Route path="/Master/master-agen"
        element={
          <MainLayout>
            <MasterAgen menuName="master-agen" />
          </MainLayout>
        }
      />

      <Route path="/Master/master-area-loper"
        element={
          <MainLayout>
            <MasterAreaLoper menuName="master-area-loper" />
          </MainLayout>
        }
      />

      <Route path="/Master/master-kodepos"
        element={
          <MainLayout>
            <MasterKodePos menuName="master-kodepos" />
          </MainLayout>
        }
      />

      <Route path="/master/tarif-ekonomis"
        element={
          <MainLayout>
            <MasterTarifEkonomis menuName="MasterTarifEkonomis" />
          </MainLayout>
        }
      />

      <Route path="/master/tarif-umum"
        element={
          <MainLayout>
            <MasterTarifReguler menuName="MasterTarifReguler" />
          </MainLayout>
        }
      />

      <Route path="/master/tarif-unit"
        element={
          <MainLayout>
            <MasterTarifUnit menuName="MasterTarifUnit" />
          </MainLayout>
        }
      />



      <Route path="/Piutang"
        element={
          <MainLayout>
            <UnderConstruction menuName="Piutang" />
          </MainLayout>
        }
      />

      <Route path="/Settings"
        element={
          <MainLayout>
            <UnderConstruction menuName="Settings" />
          </MainLayout>
        }
      />

      <Route path="/settings/users"
        element={
          <MainLayout>
            <UserManagement menuName="UserManagement" />
          </MainLayout>
        }
      />


      <Route path="/settings/configurasi"
        element={
          <MainLayout>
            <UnderConstruction menuName="configurasi" />
          </MainLayout>
        }

      />


      <Route path="/settings/security"
        element={
          <MainLayout>
            <SecuritySettings menuName="SecuritySettings" />
          </MainLayout>
        }

      />



      {/* Jika nanti ada halaman lain, tinggal bungkus lagi pakai MainLayout 
      <Route
        path="/laporan"
        element={
          <MainLayout>
            <div className="p-4 text-black">Halaman Laporan Cargo</div>
          </MainLayout>
        }
      /> */}
    </Routes>
  )
}

export default App
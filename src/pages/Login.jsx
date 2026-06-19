import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, User, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import './Login.css';
import WarningModal from '../components/WarningModal';

const Login = () => {
  const [showVerification, setShowVerification] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [emailBaru, setEmailBaru] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [selectedPT, setSelectedPT] = useState('A'); // Default PT A
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // =========================================================================
  // 💣 RUMUS ABSOLUT: INSTANT PURGE ON ROUTE MOUNT JEDERRR! 
  // =========================================================================
  useEffect(() => {
    const hardPurgeNow = () => {
      console.log("%c💥 [Security Engine] Melakukan Sterilisasi Mutlak Halaman Login...", "background: #cc0000; color: #fff; font-weight: bold;");

      const savedIdleTime = localStorage.getItem('max_idle_time');

      // Hancurkan total isi memori
      //localStorage.clear();
      sessionStorage.clear();

      const targetedKeys = [
        'token', 'active_agen_id', 'kode_cabang', 'role_akses',
        'user_name', 'username', 'selected_pt', 'profile_kode_cabang', 'profileimage'
      ];

      targetedKeys.forEach(key => {
        localStorage.removeItem(key);
        //sessionStorage.removeItem(key);
      });

      if (savedIdleTime) {
        localStorage.setItem('max_idle_time', savedIdleTime);
        console.log("🛡️ [Security Engine] max_idle_time dipertahankan:", savedIdleTime);
      }
    };

    // Eksekusi langsung di milidetik pertama halaman login render
    hardPurgeNow();

    // Jalankan lap kedua dengan interval delay 50ms untuk menyapu bersih sisa trigger delayed component
    const intervalPurge = setInterval(hardPurgeNow, 50);

    // Matikan interval setelah 300ms agar laptop user tidak berat
    const timeoutStop = setTimeout(() => {
      clearInterval(intervalPurge);
      console.log("⚙️ [Security Engine] Halaman Login Resmi Suci Murni 100%!");
    }, 300);

    return () => {
      clearInterval(intervalPurge);
      clearTimeout(timeoutStop);
    };
  }, []);

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: '',
    countdown: 0
  });

  const getFailedAttempts = () => parseInt(localStorage.getItem('failedAttempts') || '0', 10);
  const setFailedAttempts = (count) => localStorage.setItem('failedAttempts', count.toString());

  const getLockedUntil = () => parseInt(localStorage.getItem('lockedUntil') || '0', 10);
  const setLockedUntil = (timestamp) => localStorage.setItem('lockedUntil', timestamp.toString());

  const getIsBlocked = () => localStorage.getItem('isBlocked') === 'true';
  const setIsBlocked = (status) => localStorage.setItem('isBlocked', status.toString());

  // Check lockout status dynamically when attempting to login
  const checkLockoutStatus = () => {
    if (getIsBlocked()) {
      setModalConfig({
        isOpen: true,
        message: "Terlalu banyak percobaan login.\nUntuk sementara, akses dari IP kamu diblokir.\nSilakan hubungi Admin untuk bantuan lebih lanjut",
        countdown: 0
      });
      return false; // Can't login
    }

    const lockedUntil = getLockedUntil();
    const now = Date.now();

    if (lockedUntil > now) {
      const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
      const attempts = getFailedAttempts();
      setModalConfig({
        isOpen: true,
        message: `Kamu telah melakukan ${attempts} kali percobaan login.\nSilakan coba kembali dalam\n{time}.`,
        countdown: remainingSeconds
      });
      return false; // Can't login
    }

    return true; // Can login
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // if (!checkLockoutStatus()) return;
    setIsLoading(true);
    console.log("%c🚀 [Frontend] Mulai proses login untuk: " + email, "background: #0056b3; color: #fff; font-weight: bold;");

    try {
      const response = await api.post('/login', {
        email: email,
        password: password,
        pt_id: selectedPT // Gunakan state selectedPT
      });
      console.log("Response Full dari Backend:", response.data);

      const { token, user, pt_id } = response.data;
      const finalPT = pt_id || user.pt_id || selectedPT;

      // =================================================================
      // 🌟 KUNCI EMAS: HANCURKAN SELURUH SAMPAH CACHE USER LAIN SEBELUM MASUK!
      // =================================================================
      // 1. Simpan dulu max_idle_time yang ada (dari settingan admin 10 menit)
      const savedIdleTime = localStorage.getItem('max_idle_time');
      // 2. Hapus semua cache yang ada (termasuk token user lain, data session, dll)
      //localStorage.clear();
      const keysToClear = ['token', 'user_name', 'username', 'selected_pt', 'role_akses', 'kode_cabang', 'active_agen_id'];
      keysToClear.forEach(k => localStorage.removeItem(k));

      // 3. Kembalikan max_idle_time. Kalau sebelumnya gak ada, set default 3 menit (180000 ms)
      if (savedIdleTime) {
        localStorage.setItem('max_idle_time', savedIdleTime);
        console.log("🛡️ max_idle_time dipertahankan saat login:", savedIdleTime);
      } else {
        localStorage.setItem('max_idle_time', (3 * 60 * 1000).toString());
        console.log("⚙️ max_idle_time di-set default 3 menit karena kosong.");
      }

      // JALUR UTAMA DAKOTA: Simpan data session user yang baru aktif login
      localStorage.setItem('token', token);
      localStorage.setItem('user_name', user?.realname || user?.real_name || 'User');
      localStorage.setItem('username', user?.username || 'user'); // Untuk kebutuhan greeting Dashboard
      localStorage.setItem('selected_pt', finalPT);

      // Sinkronisasi 3 Parameter Utama Permintaan Kantor 🎯
      // Ambil data usertype murni ('S', 'A', 'U') dan simpan ke key 'role_akses' & 'kode_cabang'
      const userRole = user?.usertype || user?.user_type || 'U';
      localStorage.setItem('role_akses', userRole);

      let initialBranch = ''; // Fallback aman terendah

      if (userRole === 'S' || user?.all_cabangyn === 'Y') {
        // Jika Superadmin atau memiliki akses seluruh cabang, kunci ke Pusat Holding
        initialBranch = 'PUSAT DAKOTA';
        localStorage.setItem('kode_cabang', 'PUSAT DAKOTA');
        localStorage.setItem('active_agen_id', 'PUSAT DAKOTA');
      } else {
        // Jalur User Biasa (U): Ambil string daftar cabang dari database ("21, 805, 354, 191")
        const rawCabangString = user?.kode_cabang || '';

        if (rawCabangString !== '') {
          // Pecah string berdasarkan koma menjadi array, lalu ambil elemen PERTAMA saja yang paling depan!
          const cabangArray = rawCabangString.split(',');
          const firstCleanCabang = cabangArray[0].trim(); // Ambil kode bersih pertama (Misal: "21")

          initialBranch = firstCleanCabang;
          localStorage.setItem('kode_cabang', rawCabangString); // Simpan semua list utuh untuk kebutuhan filter Header
          localStorage.setItem('active_agen_id', firstCleanCabang); // Mengunci satu id cabang awal yang valid dan bersih!
        } else {
          // 🌟 BAN SEREP LOGIS: Jika di DB kosong, otomatis setel ke 'EMPTY' atau kosong
          initialBranch = 'EMPTY';
          localStorage.setItem('kode_cabang', 'EMPTY');
          localStorage.setItem('active_agen_id', 'EMPTY');
        }
      }


      console.log("🔥 Data PT & Role berhasil dipaksa simpan bersih:", finalPT, userRole);

      // --- LOGIKA CEK EMAIL AKSES ---
      if (!user.email || user.email.trim() === "") {
        console.log("⚠️ User belum punya email, arahkan ke verifikasi");
        setTempUser(user);
        setShowVerification(true);
        setIsLoading(false);
        return;
      }

      console.log("✅ [Frontend] Login berhasil! Token di dapat: ", token);

      // Reset attempts lockouts on success
      localStorage.removeItem('failedAttempts');
      localStorage.removeItem('lockedUntil');
      localStorage.removeItem('isBlocked');

      // Arahkan superadmin & user langsung ke halaman operasional default
      navigate('/marketing/master-customer');
    } catch (error) {
      console.error("❌  [Frontend] Login Gagal: ", error.response?.data?.message || error.message);

      const attempts = getFailedAttempts() + 1;
      setFailedAttempts(attempts);

      const errorMessage = error.response?.data?.message?.toLowerCase() || '';

      if (attempts >= 7) {
        setIsBlocked(true);
        setModalConfig({
          isOpen: true,
          message: "Terlalu banyak percobaan login.\nUntuk sementara, akses dari IP kamu diblokir.\nSilakan hubungi Admin untuk bantuan lebih lanjut",
          countdown: 0
        });
      } else if (attempts === 6) {
        setLockedUntil(Date.now() + 180000); // 180 seconds
        setModalConfig({
          isOpen: true,
          message: "Kamu telah melakukan 6 kali percobaan login.\nSilakan coba kembali dalam\n{time}.",
          countdown: 180
        });
      } else if (attempts === 3) {
        setLockedUntil(Date.now() + 60000); // 60 seconds
        setModalConfig({
          isOpen: true,
          message: "Kamu telah melakukan 3 kali percobaan login.\nSilakan coba kembali dalam\n{time}.",
          countdown: 60
        });
      } else {
        // Determine if it was email or password based on backend message
        let specificError = "Kredensial yang kamu masukkan tidak sesuai";
        if (errorMessage.includes("user") || errorMessage.includes("email") || errorMessage.includes("not found")) {
          specificError = "Email yang kamu masukkan tidak sesuai";
        } else if (errorMessage.includes("password") || errorMessage.includes("wrong")) {
          specificError = "Password yang kamu masukkan tidak sesuai";
        } else {
          // Fallback, assuming general error
          specificError = "Email atau Password yang kamu masukkan tidak sesuai";
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
  }


  const requestOTP = async () => {
    if (!emailBaru) return alert("Masukkan email terlebih dahulu");
    setIsLoading(true);
    try {
      await api.post('/request-otp', {
        username: tempUser.username,
        email: emailBaru,
        pt_id: selectedPT
      });
      setIsOtpSent(true);
      alert("Kode OTP telah dikirim ke " + emailBaru);
    } catch (err) {
      alert("Gagal mengirim OTP: " + (err.response?.data?.message || "Error"));
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    setIsLoading(true);
    try {
      await api.post('/verify-otp', {
        username: tempUser.username,
        email: emailBaru,
        otp_code: otpCode,
        pt_id: selectedPT
      });
      alert("Verifikasi Berhasil! Silakan login kembali.");
      window.location.reload(); // Refresh untuk login ulang dengan email baru
    } catch (err) {
      alert("Kode OTP salah atau kadaluarsa!");
    } finally {
      setIsLoading(false);
    }
  };




  const closeWarningModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="login-container">
      {/* Kolom Kiri: Visual / Branding */}
      <div className="login-left">
        <div className="login-left-content">
          <Package size={80} color="white" className="logo-cargo" />
          <h1>Dakota Cargo</h1>
          <p>Sistem Informasi Pengiriman Barang & Logistik Terpadu</p>
        </div>
      </div>

      {/* Kolom Kanan: Form */}
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Selamat Datang</h2>
            <p>Silakan masuk menggunakan akun Dakota Anda</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Username / Email</label>
              <div className="input-container">
                <User className="input-icon" size={20} />
                <input
                  id="username"
                  type="text"
                  className="login-input"
                  placeholder="Masukkan username Anda"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-container">
                <Lock className="input-icon" size={20} />
                <input
                  id="password"
                  type="password"
                  className="login-input"
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Memproses...' : (
                <>
                  <span>Masuk</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

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

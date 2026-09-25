import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, User, ArrowRight, Building2 } from 'lucide-react';
import api from '../api/axios';
import './Login.css';
import WarningModal from '../components/WarningModal';

const Login = () => {
  const [showVerification, setShowVerification] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [emailBaru, setEmailBaru] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [selectedPT, setSelectedPT] = useState('C'); // Default DLI (C) atau ganti 'A' jika ingin DBS
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

      // Pemetaan Corporate: A = DBS, B = DLB, C = DLI
      let corpName = 'DLI';
      if (finalPT === 'A') corpName = 'DBS';
      else if (finalPT === 'B') corpName = 'DLB';
      else if (finalPT === 'C') corpName = 'DLI';

      // Penyimpanan Sesi Corporate Terpadu
      localStorage.setItem('token', token);
      localStorage.setItem('user_name', user?.realname || user?.real_name || 'User');
      localStorage.setItem('username', user?.username || 'user');
      localStorage.setItem('selected_pt', finalPT);
      localStorage.setItem('pt_id', finalPT);
      localStorage.setItem('active_corporate', corpName);

      const userRole = user?.usertype || user?.user_type || 'U';
      localStorage.setItem('role_akses', userRole);

      if (userRole === 'S' || user?.all_cabangyn === 'Y') {
        localStorage.setItem('kode_cabang', 'PUSAT DAKOTA');
        localStorage.setItem('active_agen_id', 'PUSAT DAKOTA');
      } else {
        const rawCabangString = user?.kode_cabang || '';
        if (rawCabangString !== '') {
          const firstCleanCabang = rawCabangString.split(',')[0].trim();
          localStorage.setItem('kode_cabang', rawCabangString);
          localStorage.setItem('active_agen_id', firstCleanCabang);
        } else {
          localStorage.setItem('kode_cabang', 'EMPTY');
          localStorage.setItem('active_agen_id', 'EMPTY');
        }
      }

      if (!user?.email || user.email.trim() === '') {
        setTempUser(user);
        setShowVerification(true);
        setIsLoading(false);
        return;
      }

      localStorage.removeItem('failedAttempts');
      localStorage.removeItem('lockedUntil');
      localStorage.removeItem('isBlocked');

      // Masuk ke dashboard utama
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
    <div className="login-container">
      <div className="login-left">
        <div className="login-left-content">
          <Package size={80} color="white" className="logo-cargo" />
          <h1>Dakota Cargo</h1>
          <p>Sistem Informasi Pengiriman Barang & Logistik Terpadu</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Selamat Datang</h2>
            <p>Silakan masuk menggunakan akun Dakota Anda</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="select-pt">Perusahaan (Corporate)</label>
              <div className="input-container">
                <Building2 className="input-icon" size={20} />
                <select
                  id="select-pt"
                  className="login-input font-bold"
                  value={selectedPT}
                  onChange={e => setSelectedPT(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="A">PT Dakota Buana Sarana (DBS)</option>
                  <option value="B">PT Dakota Lintas Buana (DLB)</option>
                  <option value="C">PT Dakota Logistik Indonesia (DLI)</option>
                </select>
              </div>
            </div>

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
import React, { useState, useEffect } from 'react'; // Tambahkan useEffect di sini
import { Camera, Edit3, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

function AccountPage() {
  const location = useLocation();
  
  // State untuk data profil
  const [formData, setFormData] = useState({
    realName: '',
    nickName: '',
    mobileNumber: '',
    gender: 1,
    kode_cabang: '',
    email: '',
    profileImage: ''
  });

  // State untuk kontrol mode edit dan loading
  const [isEditing, setIsEditing] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);

  // 1. Ambil data saat halaman dimuat
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Data dari API:", response.data); // Cek di console browser (F12)

      const data = response.data;
      setFormData({
        realName: response.data.realName || '',
        nickName: response.data.nickName || '',
        mobileNumber: response.data.mobileNumber || '',
        gender: response.data.gender || 1,
        email: response.data.email || '',
        profileImage: response.data.profileImage || ''
      });
     
      setOriginalData(data);
      } catch (error) {
        console.error("Gagal mapping data profile:", error);
      }
  };

  // 2. Handle perubahan input
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Handle khusus untuk gender karena tipe datanya INT di database
    setFormData({ 
      ...formData, 
      [name]: name === 'gender' ? parseInt(value) : value 
    });
  };

  // 3. Handle tombol Back (Cancel Edit)
  const handleBack = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  // 4. Handle Save Change
  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:8080/api/profile/update', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditing(false);
      setOriginalData(formData);
      alert("Profil berhasil diperbarui!");
    } catch (error) {
      alert("Gagal memperbarui profil");
    } finally {
      setLoading(false);
    }
  };

  //ChangePassword Mulai dari sini
    // 1. Tambahkan state baru di dalam function AccountPage()
    const [showPassModal, setShowPassModal] = useState(false);
    const [passData, setPassData] = useState({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    // 2. Fungsi untuk handle input password
    const handlePassChange = (e) => {
      setPassData({ ...passData, [e.target.name]: e.target.value });
    };

    // 3. Fungsi untuk kirim ke Backend
    const handleUpdatePassword = async (e) => {
      e.preventDefault();
      if (passData.newPassword !== passData.confirmPassword) {
        alert("Password konfirmasi tidak cocok!");
        return;
      }

      try {
        const token = localStorage.getItem('token');
        await axios.put('http://localhost:8080/api/profile/change-password', 
          { 
            oldPassword: passData.oldPassword, 
            newPassword: passData.newPassword 
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Password berhasil diperbarui!");
        setShowPassModal(false);
        setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } catch (error) {
        alert(error.response?.data?.error || "Gagal mengubah password");
      }
    };

  //ChangePassword Selesai sampai sini

  return (
    <div className="p-8 bg-white rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={formData.profileImage || "https://via.placeholder.com/100"} 
              className="w-20 h-20 rounded-full object-cover border-2 border-blue-100" 
              alt="Profile" 
            />
            {isEditing && (
              <div className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full text-white cursor-pointer shadow-sm">
                <Camera size={14} />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-blue-900">{formData.realName || 'User'}</h2>
            <p className="text-gray-500 text-sm">{formData.email || 'Email belum diatur'}</p>
          </div>
        </div>

        {/* Tombol Dinamis */}
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all"
          >
            <Edit3 size={18} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleBack} 
              className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-300"
            >
              <Send size={18} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-blue-900 mb-2">Full Name</label>
          <input
            name="realName"
            value={formData.realName || ''}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="Masukkan nama lengkap"
            className={`w-full p-3 rounded-xl border transition-all ${isEditing ? 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-blue-900 mb-2">Nick Name</label>
          <input
            name="nickName"
            value={formData.nickName || ''}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="Nama panggilan"
            className={`w-full p-3 rounded-xl border transition-all ${isEditing ? 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
          />
        </div>



        <div>
          <label className="block text-sm font-semibold text-blue-900 mb-2">Mobile Number</label>
          <input
            name="mobileNumber"
            value={formData.mobileNumber || ''}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="0812xxxx"
            className={`w-full p-3 rounded-xl border transition-all ${isEditing ? 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-blue-900 mb-2">Gender</label>
          <select
            name="gender"
            value={formData.gender || 1}
            onChange={handleChange}
            disabled={!isEditing}
            className={`w-full p-3 rounded-xl border transition-all ${isEditing ? 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
          >
            <option value={1}>Laki-Laki</option>
            <option value={2}>Perempuan</option>
            <option value={3}>No Gender</option>
          </select>
        </div>



                {/* Tambahkan ini di dalam grid grid-cols-1 md:grid-cols-2 gap-6 */}
        <div>
          <label className="block text-sm font-semibold text-blue-900 mb-2">Kode Cabang</label>
          <input
            name="kode_cabang"
            value={formData.kode_cabang || ''}
            onChange={handleChange}
            disabled={!isEditing}
            placeholder="Contoh: CGK01"
            className={`w-full p-3 rounded-xl border transition-all ${isEditing ? 'bg-white border-blue-200 focus:ring-2 focus:ring-blue-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
          />
        </div>
         <div className="mt-8 pt-6 border-t border-gray-100"></div>

        {/* ChangePassword Taruh di bawah grid input yang tadi */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Security</h3>
          <button 
            type="button"
            onClick={() => setShowPassModal(true)}
            className="text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-2 transition-all"
          >
            <span>🔒</span> Change Account Password
          </button>
        </div>



      {/* Modal Change Password */}
      {showPassModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-blue-900">Update Password</h3>
                  <button onClick={() => setShowPassModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
                    <input
                      type="password"
                      name="oldPassword"
                      required
                      value={passData.oldPassword}
                      onChange={handlePassChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      required
                      value={passData.newPassword}
                      onChange={handlePassChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={passData.confirmPassword}
                      onChange={handlePassChange}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button 
                      type="button"
                      onClick={() => setShowPassModal(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                      Save Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

      </div>
    </div>

  );
}

export default AccountPage;
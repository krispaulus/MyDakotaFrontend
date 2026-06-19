import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UnderConstruction = ({ menuName }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] w-full bg-white rounded-[20px] border border-gray-100 shadow-sm p-12 text-center">
      {/* Icon Section */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
          <Construction size={48} className="text-indigo-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      </div>

      {/* Text Section */}
      <h2 className="text-3xl font-bold text-slate-800 mb-4 font-['Poppins']">
        Menu {menuName} Sedang Disiapkan
      </h2>
      <p className="text-slate-500 max-w-md mb-10 leading-relaxed">
        Mohon maaf bro, halaman ini masih dalam tahap pengembangan oleh tim IT Dakota Cargo. 
        Pantau terus untuk update fitur terbaru kami!
      </p>

      {/* Action Button */}
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
      >
        <ArrowLeft size={18} />
        Kembali ke Dashboard
      </button>

      {/* Decorative Elements */}
      <div className="mt-12 flex gap-2">
        <div className="w-12 h-1.5 bg-indigo-600 rounded-full"></div>
        <div className="w-4 h-1.5 bg-indigo-200 rounded-full"></div>
        <div className="w-4 h-1.5 bg-indigo-200 rounded-full"></div>
      </div>
    </div>
  );
};

export default UnderConstruction;
import React, { useState, useEffect } from 'react';
import {
    Cpu,
    ChevronDown,
    User,
    Lock,
    Eye,
    EyeOff,
    X,
    ChevronLeft,
    ChevronRight,
    Truck,
    ShieldCheck,
    Clock,
    ArrowRight
} from 'lucide-react';
import api from '../api/axios'; // sesuaikan path axios Anda
import logoDakota from '../src/assets/logo.png'; // sesuaikan path logo

// Data default template jika admin belum upload
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

export default function LandingLoginPage() {
    const [slides, setSlides] = useState(defaultSlides);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // 🚀 1. Ambil Banner Dinamis Hasil Upload dari Menu 'Manajemen Banner Depan'
    useEffect(() => {
        api.get('/public/login-banner')
            .then((res) => {
                if (res.data?.banner_url) {
                    let url = res.data.banner_url.trim();

                    // Bersihkan jika ada sisa hardcode string localhost
                    const matchUpload = url.match(/\/uploads\/.*$/);
                    if (matchUpload) {
                        url = matchUpload[0];
                    }

                    // Pasang host backend dinamis sesuai server saat ini
                    if (url.startsWith('/uploads')) {
                        const backendHost = api.defaults.baseURL
                            ? api.defaults.baseURL.replace(/\/api\/?$/, '')
                            : `${window.location.protocol}//${window.location.hostname}:9090`;

                        url = `${backendHost}${url}`;
                    }

                    // 🌟 Ganti Slide #1 dengan Banner Resmi Hasil Upload Admin!
                    setSlides(prev => {
                        const updated = [...prev];
                        updated[0] = {
                            ...updated[0],
                            bgImage: url,
                            tag: "POSTER RESMI DAKOTA CARGO",
                            title: "Selamat Datang di Portal",
                            highlight: "Dakota Cargo",
                            desc: "Sistem Terpadu Layanan Bukti Tanda Terima (BTT), Cek Tarif, dan Manajemen Kargo Nusantara."
                        };
                        return updated;
                    });
                }
            })
            .catch((err) => {
                console.log("Menggunakan banner default template:", err);
            });
    }, []);

    // 🚀 2. Auto Slider tiap 6 detik
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className="relative w-full h-screen overflow-hidden font-['Inter'] bg-slate-950 select-none">

            {/* NAVBAR */}
            <nav className="absolute top-0 left-0 w-full z-30 px-6 lg:px-16 py-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg">
                        <Truck className="w-8 h-8 text-blue-900" />
                    </div>
                    <div>
                        <h1 className="text-white text-2xl font-black tracking-wider uppercase">DAKOTA CARGO</h1>
                        <p className="text-sky-300 text-[10px] tracking-widest font-semibold uppercase">Logistics & Transportation</p>
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

            {/* CAROUSEL DINAMIS */}
            <div className="relative w-full h-full overflow-hidden">
                {slides.map((slide, index) => {
                    const isActive = index === currentSlide;

                    return (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                                }`}
                        >
                            {/* Gambar Banner Dinamis */}
                            <img
                                src={slide.bgImage}
                                alt={slide.title}
                                className={`w-full h-full object-cover transform duration-[8000ms] ease-out ${isActive ? 'scale-105' : 'scale-100'
                                    }`}
                            />

                            {/* Overlay Gelap */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#060315]/90 via-[#060315]/65 to-transparent" />

                            {/* Teks Slide */}
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

                {/* Panah Navigasi */}
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
            </div>

            {/* POPUP / MODAL LOGIN HALUS */}
            {/* ... (Modal Form Login Anda tetap sama seperti sebelumnya) ... */}

        </div>
    );
}
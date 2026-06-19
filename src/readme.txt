src/
├── api/              # Konfigurasi Axios (yang sudah kita buat)
├── assets/           # Logo, Image, dan Icon hasil export dari Figma
├── components/       # Komponen kecil yang dipakai berulang kali
│   ├── atoms/        # Button, Input, Checkbox
│   ├── molecules/    # Card, FormInput (label + input), NavbarItem
│   └── organisms/    # Navbar, Sidebar, Footer
├── layouts/          # Template tata letak (misal: Layout dengan Sidebar)
├── pages/            # Halaman utama (Login, Dashboard, Profile)
├── styles/           # CSS Global atau konfigurasi Tailwind
└── utils/            # Fungsi helper (format mata uang, format tanggal)


Di dunia ekspedisi logistik, closing harian agen adalah hukumnya WAJIB. Sebelum armada truk berangkat membawa Surat Pengantar (SP), semua Manifest resi BTT yang dibuat pada hari itu harus dikunci (lock financial status), dihitung total omsetnya, dan digenerate nomor laporan keuangannya. Kalau belum closing harian, status resi BTT tersebut masih dianggap mengambang (unposted/unverified), sehingga sistem operasional di database Go otomatis memblokir BTT tersebut agar tidak bisa naik ke Surat Pengantar Pengiriman!
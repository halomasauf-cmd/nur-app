require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-memory stores (ganti dengan DB sungguhan untuk production) ───
const otpStore = new Map();  // phone → { otp, expires }
const userStore = new Map(); // phone → userObject

// ─── Helpers ────────────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanPhone(phone) {
  return phone.replace(/\D/g, '').replace(/^0/, '62');
}

async function sendWA(phone, message) {
  const token = process.env.FONNTE_TOKEN;

  // DEV MODE: kalau belum ada token, print ke console saja
  if (!token || token === 'isi_token_fonnte_kamu_di_sini') {
    console.log(`\n[DEV MODE - OTP] Kirim ke ${phone}: ${message}\n`);
    return { status: true, dev: true };
  }

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ target: phone, message })
  });
  return res.json();
}

// ─── Routes ─────────────────────────────────────────────────────────

// Kirim OTP via WhatsApp
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Nomor WA wajib diisi' });

  const p = cleanPhone(phone);
  const otp = generateOTP();
  otpStore.set(p, { otp, expires: Date.now() + 5 * 60 * 1000 });

  try {
    const result = await sendWA(p,
      `Assalamu'alaikum! 🌿\n\nKode OTP nūr. kamu: *${otp}*\n\nBerlaku 5 menit. Jangan bagikan ke siapapun ya, ukhti.`
    );
    console.log('OTP sent:', result);
    res.json({ success: true, message: 'OTP terkirim via WhatsApp', dev: result.dev });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal kirim OTP, cek token Fonnte kamu' });
  }
});

// Verifikasi OTP & simpan user
app.post('/api/verify-otp', (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp || !name) return res.status(400).json({ error: 'Data tidak lengkap' });

  const p = cleanPhone(phone);
  const stored = otpStore.get(p);

  if (!stored) return res.status(400).json({ error: 'OTP tidak ditemukan, coba kirim ulang' });
  if (Date.now() > stored.expires) return res.status(400).json({ error: 'OTP sudah kedaluwarsa' });
  if (stored.otp !== otp) return res.status(400).json({ error: 'Kode OTP salah' });

  // Daftarkan user
  const user = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    phone: p,
    tier: 'free',          // 'free' | 'member' | 'premium'
    joinedAt: new Date().toISOString(),
    streak: 0,
    lastActive: new Date().toISOString()
  };
  userStore.set(p, user);
  otpStore.delete(p);

  console.log('New user registered:', user.name, user.phone);
  res.json({ success: true, user });
});

// Data konten (nanti bisa dari DB / CMS)
app.get('/api/content', (req, res) => {
  res.json({
    featured: {
      title: 'Niat Hijrah yang Benar',
      ustadz: 'Ust. Salim A Fillah',
      duration: '8 mnt',
      category: 'Aqidah',
      free: true
    },
    free: [
      { id: 1, title: 'Niat Hijrah yang Benar', ustadz: 'Ust. Salim A Fillah', duration: '8 mnt', category: 'Aqidah' },
      { id: 2, title: 'Adab Berpakaian Muslimah', ustadz: 'Ust. Abdullah', duration: '12 mnt', category: 'Fiqih' },
      { id: 3, title: 'Makhorijul Huruf Dasar', ustadz: 'Ust. Ahmad', duration: '15 mnt', category: 'Tahsin' },
      { id: 4, title: 'Keutamaan Istiqomah', ustadz: 'Ust. Salim A Fillah', duration: '18 mnt', category: 'Akhlak' },
    ],
    premium: [
      { id: 5, title: "Shalat Khusyu' & Hadir Hati", locked: true },
      { id: 6, title: 'Fiqih Shalat Lengkap', locked: true },
      { id: 7, title: 'Dzikir Pagi & Petang', locked: true },
      { id: 8, title: 'Sirah Nabawiyah Sesi 1', locked: true },
    ],
    events: [
      { id: 1, title: 'Halaqah Muslimah — Jogja', date: '15', month: 'Jun', location: 'Masjid Kampus UGM', price: 'Gratis untuk member', online: false },
      { id: 2, title: 'Webinar Hijrah & Karir', date: '22', month: 'Jun', location: 'Online via Zoom', price: 'Rp 35.000', online: true },
      { id: 3, title: 'Kajian Bersama Ust. Salim', date: '01', month: 'Jul', location: 'Masjid Sleman', price: 'Rp 50.000', online: false },
    ],
    products: [
      { id: 1, name: 'Gamis Layla Syar\'i', price: 'Rp 285.000', memberPrice: 'Rp 228.000', badge: 'Terlaris', icon: 'shirt' },
      { id: 2, name: 'Set Hijab Sifon Premium', price: 'Rp 145.000', memberPrice: 'Rp 116.000', badge: 'Baru', icon: 'shirt' },
      { id: 3, name: 'Jurnal Hijrah 30 Hari', price: 'Rp 89.000', memberPrice: 'Rp 71.000', badge: '', icon: 'book' },
      { id: 4, name: 'Tote Bag Nūr Eksklusif', price: 'Rp 75.000', memberPrice: 'Rp 60.000', badge: 'Member price', icon: 'shopping-bag' },
    ],
    community: [
      { name: 'Siti Aisyah', initials: 'SA', color: 'green', time: '2 jam · Jogja', text: 'Alhamdulillah udah 2 minggu rutin tahajud. Awalnya berat banget, tapi sekarang malah kangen kalau nggak. Ada yang mau sharing tips biar konsisten? 🌙', likes: 48, comments: 12 },
      { name: 'Nur Rahma', initials: 'NR', color: 'amber', time: '5 jam lalu', text: 'Baru beli gamis dari toko di sini — kualitasnya masya Allah dan pengirimannya cepat ✨ Recommended banget!', likes: 31, comments: 7 },
      { name: 'Fatimah L.', initials: 'FL', color: 'pink', time: 'Kemarin', text: 'Ada rekomendasi kajian yang bisa didengar sambil masak? Belum sempet nonton yang panjang-panjang 😅', likes: 19, comments: 23 },
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', users: userStore.size, time: new Date().toISOString() });
});

// Semua route lain → serve index.html (untuk SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

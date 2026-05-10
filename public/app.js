/* ──────────────────────────────────────────────
   nūr. App — Frontend Logic
   ──────────────────────────────────────────────
   State management, API calls, UI rendering
*/

const App = (() => {

  // ─── State ─────────────────────────────────
  let state = {
    user: null,        // null = guest, object = logged in
    content: null,     // data dari /api/content
    streak: 0,
    progress: 0,
    pendingPhone: '',
    pendingName: '',
  };

  // ─── Init ───────────────────────────────────
  async function init() {
    // Cek apakah user sudah login sebelumnya (localStorage)
    const saved = localStorage.getItem('nur_user');
    if (saved) {
      state.user = JSON.parse(saved);
      enterApp(true);
    }

    // Load konten dari server
    try {
      const res = await fetch('/api/content');
      state.content = await res.json();
    } catch (e) {
      console.error('Gagal load konten:', e);
      state.content = getFallbackContent();
    }

    // Render semua section
    renderHome();
    renderBelajar();
    renderFeed();
    renderShop();
  }

  // ─── Navigation ─────────────────────────────
  function enterGuest() {
    document.getElementById('splash').classList.remove('active');
    document.getElementById('app').classList.add('active');
    document.getElementById('notif-pip').classList.add('on');
  }

  function enterApp(alreadyLoggedIn = false) {
    document.getElementById('splash').classList.remove('active');
    document.getElementById('app').classList.add('active');

    if (state.user) {
      // Update UI untuk user yang sudah login
      document.getElementById('hero-title').textContent = `Selamat datang kembali, ${state.user.name}. 🌿`;
      document.getElementById('hero-sub').textContent = 'Lanjutkan perjalanan hijrahmu hari ini.';
      document.getElementById('nav-cta').textContent = state.user.name;
      document.getElementById('notif-pip').classList.add('on');

      // Simulate progress (nanti dari DB)
      state.progress = alreadyLoggedIn ? 22 : 5;
      state.streak = alreadyLoggedIn ? 5 : 1;
      updateProgress(state.progress);
      document.getElementById('streak-label').textContent = `Hari ke-${state.streak} · Tetap istiqomah!`;
    }
  }

  function switchTab(name) {
    ['home', 'belajar', 'komunitas', 'toko'].forEach(n => {
      document.getElementById('t-' + n).classList.toggle('active', n === name);
      document.getElementById('pg-' + n).classList.toggle('active', n === name);
    });
    document.getElementById('scroll-area').scrollTop = 0;
  }

  function updateProgress(pct) {
    document.getElementById('prog-fill').style.width = pct + '%';
    document.getElementById('prog-pct').textContent = pct + '%';
    if (document.getElementById('prog-fill-b')) {
      document.getElementById('prog-fill-b').style.width = pct + '%';
      document.getElementById('prog-pct-b').textContent = pct + '%';
      document.getElementById('prog-num-b').textContent = pct + '%';
    }
  }

  // ─── Sheets ─────────────────────────────────
  function openSheet(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
  }

  // ─── Render: Home ───────────────────────────
  function renderHome() {
    if (!state.content) return;

    // Free list
    const listEl = document.getElementById('list-free-home');
    listEl.innerHTML = '';
    state.content.free.slice(0, 3).forEach(item => {
      listEl.innerHTML += `
        <div class="lcard" onclick="App.openVideoSheet('${escapeHtml(item.title)}', '${escapeHtml(item.ustadz)}', '${item.duration}')">
          <div class="lcard-icon green"><i class="ti ti-player-play"></i></div>
          <div class="lcard-body">
            <div class="lcard-title">${escapeHtml(item.title)}</div>
            <div class="lcard-sub">${escapeHtml(item.ustadz)} · ${item.duration} · Gratis</div>
          </div>
          <i class="ti ti-chevron-right lcard-arrow"></i>
        </div>`;
    });

    // 1 locked preview
    const locked = state.content.premium[0];
    listEl.innerHTML += `
      <div class="lcard" onclick="App.openSheet('sheet-lock')">
        <div class="lcard-icon amber"><i class="ti ti-lock"></i></div>
        <div class="lcard-body">
          <div class="lcard-title">${escapeHtml(locked.title)}</div>
          <div class="lcard-sub amber">Premium · Daftar untuk akses</div>
        </div>
        <i class="ti ti-chevron-right lcard-arrow"></i>
      </div>`;

    // Horizontal videos
    const hscroll = document.getElementById('hscroll-videos');
    hscroll.innerHTML = '';
    state.content.free.forEach(item => {
      hscroll.innerHTML += `
        <div class="vcard" onclick="App.openVideoSheet('${escapeHtml(item.title)}', '${escapeHtml(item.ustadz)}', '${item.duration}')">
          <div class="vcard-thumb">
            <div class="vtag free">GRATIS</div>
            <div class="vcard-play"><i class="ti ti-player-play"></i></div>
          </div>
          <div class="vcard-body">
            <div class="vcard-title">${escapeHtml(item.title)}</div>
            <div class="vcard-meta">${item.duration} · ${item.category}</div>
          </div>
        </div>`;
    });
    state.content.premium.slice(0, 2).forEach(item => {
      hscroll.innerHTML += `
        <div class="vcard" onclick="App.openSheet('sheet-lock')">
          <div class="vcard-thumb locked">
            <div class="vtag locked">MEMBER</div>
            <div class="vcard-play locked-icon"><i class="ti ti-lock"></i></div>
          </div>
          <div class="vcard-body">
            <div class="vcard-title">${escapeHtml(item.title)}</div>
            <div class="vcard-meta locked">🔒 Member only</div>
          </div>
        </div>`;
    });

    // Events
    const eventList = document.getElementById('event-list-home');
    eventList.innerHTML = '';
    state.content.events.slice(0, 2).forEach(ev => {
      eventList.innerHTML += `
        <div class="ecard" onclick="App.openEventSheet(${ev.id})">
          <div class="edate"><div class="eday">${ev.date}</div><div class="emon">${ev.mon || ev.month}</div></div>
          <div class="einfo">
            <div class="etitle">${escapeHtml(ev.title)}</div>
            <div class="eloc"><i class="ti ti-${ev.online ? 'video' : 'map-pin'}"></i> ${escapeHtml(ev.location)}</div>
            <div class="eprice">${escapeHtml(ev.price)}</div>
          </div>
        </div>`;
    });
  }

  // ─── Render: Belajar ────────────────────────
  function renderBelajar() {
    if (!state.content) return;
    const el = document.getElementById('list-belajar');
    el.innerHTML = '';

    const modules = [
      { title: 'Niat & Landasan Hijrah', sub: '3 video · Gratis', free: true },
      { title: 'Tahsin Dasar Al-Qur\'an', sub: '5 video · Gratis', free: true },
      ...state.content.premium.map(p => ({ title: p.title, sub: '6-10 video · Member only', free: false }))
    ];

    modules.forEach(m => {
      el.innerHTML += `
        <div class="lcard" onclick="${m.free ? "App.openVideoSheet('" + escapeHtml(m.title) + "', 'Berbagai Ustadz', '')" : "App.openSheet('sheet-lock')"}">
          <div class="lcard-icon ${m.free ? 'green' : 'amber'}">
            <i class="ti ti-${m.free ? 'circle' : 'lock'}"></i>
          </div>
          <div class="lcard-body">
            <div class="lcard-title">${escapeHtml(m.title)}</div>
            <div class="lcard-sub ${m.free ? '' : 'amber'}">${m.sub}</div>
          </div>
          <i class="ti ti-chevron-right lcard-arrow"></i>
        </div>`;
    });
  }

  // ─── Render: Community Feed ──────────────────
  function renderFeed() {
    if (!state.content) return;
    const el = document.getElementById('feed-list');
    el.innerHTML = '';
    state.content.community.forEach(post => {
      el.innerHTML += `
        <div class="fcard">
          <div class="fcard-head">
            <div class="favatar ${post.color}">${post.initials}</div>
            <div><div class="fname">${escapeHtml(post.name)}</div><div class="ftime">${post.time}</div></div>
          </div>
          <div class="ftext">${escapeHtml(post.text)}</div>
          <div class="factions">
            <div class="fact liked"><i class="ti ti-heart"></i> ${post.likes}</div>
            <div class="fact" onclick="App.openSheet('sheet-signup')"><i class="ti ti-message"></i> ${post.comments}</div>
          </div>
        </div>`;
    });
  }

  // ─── Render: Shop ───────────────────────────
  function renderShop() {
    if (!state.content) return;
    const el = document.getElementById('shop-grid');
    el.innerHTML = '';
    state.content.products.forEach(p => {
      el.innerHTML += `
        <div class="scard" onclick="App.openProductSheet(${p.id})">
          <div class="scard-img"><i class="ti ti-${p.icon}"></i></div>
          <div class="scard-body">
            <div class="scard-name">${escapeHtml(p.name)}</div>
            <div class="scard-price">${p.price}</div>
            ${p.badge ? `<div class="scard-badge">${p.badge}</div>` : ''}
          </div>
        </div>`;
    });
  }

  // ─── Sheet Openers ───────────────────────────
  function openVideoSheet(title, ustadz, duration) {
    document.getElementById('sv-title').textContent = title;
    document.getElementById('sv-meta').textContent = `${ustadz}${duration ? ' · ' + duration : ''}`;
    openSheet('sheet-video');
  }

  function openEventSheet(id) {
    if (!state.content) return;
    const ev = state.content.events.find(e => e.id === id);
    if (!ev) return;
    document.getElementById('se-title').textContent = ev.title;
    document.getElementById('se-detail').textContent =
      `${ev.location} · ${ev.price}`;
    document.getElementById('se-cta').textContent =
      state.user ? 'Daftar sekarang' : 'Daftar — Login dulu gratis';
    openSheet('sheet-event');
  }

  function openProductSheet(id) {
    if (!state.content) return;
    const p = state.content.products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('sp-icon').className = `ti ti-${p.icon}`;
    document.getElementById('sp-name').textContent = p.name;
    document.getElementById('sp-price').textContent = p.price;
    document.getElementById('sp-member').textContent = `Member: ${p.memberPrice}`;
    openSheet('sheet-product');
  }

  // ─── Auth: Send OTP ──────────────────────────
  async function sendOTP() {
    const name = document.getElementById('inp-name').value.trim();
    const phone = document.getElementById('inp-phone').value.trim();
    const errEl = document.getElementById('err-1');

    if (!name) { errEl.textContent = 'Nama wajib diisi ya, ukhti 🌿'; return; }
    if (!phone || phone.length < 9) { errEl.textContent = 'Nomor WhatsApp tidak valid'; return; }

    errEl.textContent = '';
    const btn = document.querySelector('#signup-step-1 .btn-main');
    btn.disabled = true;
    btn.textContent = 'Mengirim...';

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();

      if (data.success) {
        state.pendingPhone = phone;
        state.pendingName = name;
        document.getElementById('signup-step-1').style.display = 'none';
        document.getElementById('signup-step-2').style.display = 'block';

        if (data.dev) showToast('DEV: Cek console untuk OTP 👆');
        else showToast('OTP terkirim ke WhatsApp kamu 🌿');
      } else {
        errEl.textContent = data.error || 'Gagal kirim OTP';
      }
    } catch (e) {
      errEl.textContent = 'Koneksi bermasalah, coba lagi';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Kirim Kode OTP via WhatsApp';
    }
  }

  // ─── Auth: Verify OTP ───────────────────────
  async function verifyOTP() {
    const otp = document.getElementById('inp-otp').value.trim();
    const errEl = document.getElementById('err-2');

    if (!otp || otp.length !== 6) { errEl.textContent = 'Masukkan 6 digit kode OTP'; return; }

    errEl.textContent = '';
    const btn = document.querySelector('#signup-step-2 .btn-main');
    btn.disabled = true;
    btn.textContent = 'Memverifikasi...';

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: state.pendingPhone, otp, name: state.pendingName })
      });
      const data = await res.json();

      if (data.success) {
        state.user = data.user;
        localStorage.setItem('nur_user', JSON.stringify(state.user));
        closeSheet('sheet-signup');
        enterApp();
        showToast(`Ahlan, ${state.user.name}! 🌿 Selamat datang di nūr.`);

        // Reset form
        document.getElementById('signup-step-1').style.display = 'block';
        document.getElementById('signup-step-2').style.display = 'none';
        document.getElementById('inp-name').value = '';
        document.getElementById('inp-phone').value = '';
        document.getElementById('inp-otp').value = '';
      } else {
        errEl.textContent = data.error || 'OTP salah';
      }
    } catch (e) {
      errEl.textContent = 'Koneksi bermasalah, coba lagi';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verifikasi & Masuk';
    }
  }

  async function resendOTP() {
    if (!state.pendingPhone) return;
    await sendOTP();
  }

  // ─── Toast ───────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ─── Fallback Content ────────────────────────
  function getFallbackContent() {
    return {
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
      ],
      events: [
        { id: 1, title: 'Halaqah Muslimah — Jogja', date: '15', month: 'Jun', location: 'Masjid Kampus UGM', price: 'Gratis untuk member', online: false },
        { id: 2, title: 'Webinar Hijrah & Karir', date: '22', month: 'Jun', location: 'Online via Zoom', price: 'Rp 35.000', online: true },
        { id: 3, title: 'Kajian Bersama Ust. Salim', date: '01', month: 'Jul', location: 'Masjid Sleman', price: 'Rp 50.000', online: false },
      ],
      products: [
        { id: 1, name: "Gamis Layla Syar'i", price: 'Rp 285.000', memberPrice: 'Rp 228.000', badge: 'Terlaris', icon: 'shirt' },
        { id: 2, name: 'Set Hijab Sifon Premium', price: 'Rp 145.000', memberPrice: 'Rp 116.000', badge: 'Baru', icon: 'shirt' },
        { id: 3, name: 'Jurnal Hijrah 30 Hari', price: 'Rp 89.000', memberPrice: 'Rp 71.000', badge: '', icon: 'book' },
        { id: 4, name: 'Tote Bag Nūr Eksklusif', price: 'Rp 75.000', memberPrice: 'Rp 60.000', badge: 'Member price', icon: 'shopping-bag' },
      ],
      community: [
        { name: 'Siti Aisyah', initials: 'SA', color: 'green', time: '2 jam · Jogja', text: 'Alhamdulillah udah 2 minggu rutin tahajud. Awalnya berat banget, tapi sekarang malah kangen kalau nggak. Ada yang mau sharing tips? 🌙', likes: 48, comments: 12 },
        { name: 'Nur Rahma', initials: 'NR', color: 'amber', time: '5 jam lalu', text: 'Baru beli gamis dari toko di sini — kualitasnya masya Allah, pengirimannya cepat banget ✨', likes: 31, comments: 7 },
        { name: 'Fatimah L.', initials: 'FL', color: 'pink', time: 'Kemarin', text: 'Ada rekomendasi kajian yang bisa didengar sambil masak? Belum sempet nonton yang panjang-panjang 😅', likes: 19, comments: 23 },
      ]
    };
  }

  // ─── Utils ───────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Public API ──────────────────────────────
  return { init, enterGuest, enterApp, switchTab, openSheet, closeSheet, openVideoSheet, openEventSheet, openProductSheet, sendOTP, verifyOTP, resendOTP };

})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);

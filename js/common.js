/* ═══════════════════════════════════════════════════════════
   ✨️ FT — المكونات المشتركة — النسخة النهائية (v5)
   ═══════════════════════════════════════════════════════════ */

const UI = {
  norm(s) { return DB.norm(s); },
  parseNum(s, min = 0) { return DB.parseNum(s, min); },
  parseFloat(s, min = 0) { return DB.parseFloatN(s, min); },

  toast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: 'check-circle-2', error: 'x-circle', info: 'info', warn: 'alert-triangle' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i data-lucide="${icons[type] || 'info'}" style="width:20px;height:20px;color:var(--amber)"></i><span>${message}</span>`;
    container.appendChild(el);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      el.style.opacity = '0'; el.style.transform = 'translateX(-100%)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  modal({ title, content, onOpen }) {
    let overlay = document.getElementById('ft-modal');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'ft-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="flex-between mb-3">
          <h3 class="modal-title mb-0">${title || ''}</h3>
          <button class="icon-btn" data-close><i data-lucide="x"></i></button>
        </div>
        <div>${content || ''}</div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    if (window.lucide) lucide.createIcons();
    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 300); };
    overlay.querySelector('[data-close]').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    if (onOpen) onOpen(overlay, close);
    return { close, overlay };
  },

  confirm({ title, message, onConfirm, danger }) {
    this.modal({
      title: title || 'تأكيد',
      content: `<p class="mb-3">${message || ''}</p>
        <div class="flex gap-2">
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>تأكيد</button>
          <button class="btn btn-ghost" data-close>إلغاء</button>
        </div>`,
      onOpen: (el, close) => {
        el.querySelector('[data-yes]').onclick = () => { close(); onConfirm && onConfirm(); };
      }
    });
  },

  // ✅ التعديل: نافذة تأكيد حذف الحساب (تطلب من المستخدم إرسال الطلب للإدارة)
  confirmDeleteAccount() {
  const client = DB.currentClient();
  if (!client) return;
  if (DB.isAdmin(client.num)) return this.toast('لا يمكن للمدير حذف حسابه من هنا', 'error');
  
  this.modal({
    title: '⚠️ حذف الحساب نهائياً',
    content: `<div style="text-align:center;padding:10px 0">
                <div style="font-size:3rem;margin-bottom:15px;color:var(--danger)">🗑️</div>
                <p class="mb-3" style="font-size:1.1rem;font-weight:700">هل أنت متأكد من رغبتك في حذف حسابك؟</p>
                <div class="card mb-3" style="background:rgba(239,68,68,0.1);border-color:var(--danger);text-align:right">
                  <p style="margin:0;color:var(--danger);font-weight:700">⚠️ تحذير هام:</p>
                  <ul style="margin:10px 0;padding-right:20px;color:var(--text-2);font-size:.9rem">
                    <li>سيتم إيقاف حسابك فوراً ولن تتمكن من الدخول.</li>
                    <li>سيتم إرسال طلب للإدارة لحذف جميع بياناتك (مبيعات، ديون، منتجات).</li>
                    <li>إذا قمت بتسجيل حساب جديد، سيتم مراجعته من قبل الإدارة.</li>
                  </ul>
                </div>
              </div>
              <div class="flex gap-2 mt-4">
                <button class="btn btn-danger" style="flex:1" data-del>نعم، أرسل طلب الحذف</button>
                <button class="btn btn-ghost" style="flex:1" data-close>إلغاء</button>
              </div>`,
    onOpen: (el, close) => {
      el.querySelector('[data-del]').onclick = () => {
        DB.requestAccountDeletion(client.num);
        DB.clearSession();
        localStorage.removeItem('ft_has_account'); // ✅ هذا هو السطر السحري
        this.toast('تم إرسال طلب الحذف للإدارة. سيتم تسجيل خروجك.', 'success');
        setTimeout(() => location.href = 'index.html', 1500);
      };
    }
  });
},

  initTheme() {
    const saved = localStorage.getItem('ft-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  },
  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ft-theme', next);
    return next;
  },
  initPreloader() {
    if (document.querySelector('.preloader')) return;
    const pre = document.createElement('div');
    pre.className = 'preloader';
    pre.innerHTML = `<div class="preloader-inner"><div class="preloader-logo">✨ FT ✨</div><div class="preloader-bar"></div></div>`;
    document.body.appendChild(pre);
    window.addEventListener('load', () => setTimeout(() => pre.classList.add('hidden'), 400));
    setTimeout(() => pre.classList.add('hidden'), 3000);
  },
  initCursor() {
    if (window.matchMedia('(hover: none)').matches) return;
    if (document.querySelector('.custom-cursor')) return;
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    const dot = document.createElement('div');
    dot.className = 'custom-cursor-dot';
    document.body.appendChild(cursor); document.body.appendChild(dot);
    let mx=0,my=0,cx=0,cy=0;
    document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    const animate = () => { cx+=(mx-cx)*0.15; cy+=(my-cy)*0.15; cursor.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(animate); };
    animate();
    document.querySelectorAll('a,button,.btn,input,select,textarea').forEach(el => {
      el.addEventListener('mouseenter', () => { cursor.style.width='56px'; cursor.style.height='56px'; cursor.style.borderColor='var(--amber-light)'; });
      el.addEventListener('mouseleave', () => { cursor.style.width='36px'; cursor.style.height='36px'; cursor.style.borderColor='var(--amber)'; });
    });
  },
  initParticles() {
    if (document.getElementById('golden-particles')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'golden-particles';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let w, h;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles = [];
    for (let i = 0; i < 60; i++) particles.push({
      x: Math.random()*w, y: Math.random()*h, r: Math.random()*2+0.5,
      vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, alpha: Math.random()*0.7+0.3,
    });
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(245,158,11,${p.alpha})`;
        ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(245,158,11,0.8)';
        ctx.fill();
      }
      requestAnimationFrame(animate);
    };
    animate();
  },
  initReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  },
  initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'العودة للأعلى');
    btn.innerHTML = '<i data-lucide="arrow-up"></i>';
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) btn.classList.add('show');
      else btn.classList.remove('show');
    });
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  },
  initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
      hamburger.onclick = () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active', sidebar.classList.contains('open'));
      };
    }
    backdrop.onclick = () => { sidebar.classList.remove('open'); backdrop.classList.remove('active'); };
    const page = location.pathname.split('/').pop() || 'index.html';
    sidebar.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href === page) link.classList.add('active');
    });

    // ✅ حقن زر حذف الحساب في القائمة الجانبية
    const footer = sidebar.querySelector('.sidebar-footer');
    if (footer && !footer.querySelector('.btn-delete-account')) {
       const btn = document.createElement('button');
       btn.className = 'btn btn-danger btn-block btn-sm mt-2 btn-delete-account';
       btn.style.background = '#dc3545';
       btn.style.color = '#fff';
       btn.style.border = 'none';
       btn.style.transition = 'all 0.3s';
       btn.innerHTML = '<i data-lucide="trash-2"></i> حذف حسابي نهائياً';
       btn.onclick = () => UI.confirmDeleteAccount();
       footer.appendChild(btn);
       
       // إخفاء الزر إذا كان المستخدم مديراً
       const c = DB.currentClient();
       if (c && DB.isAdmin(c.num)) btn.style.display = 'none';
    }
  },
  initTopbar() {
    const themeBtn = document.querySelector('[data-theme-toggle]');
    if (themeBtn) themeBtn.onclick = () => this.toggleTheme();
    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) logoutBtn.onclick = () => {
      this.confirm({ title: 'تسجيل الخروج', message: 'هل تريد تسجيل الخروج؟', danger: false, onConfirm: () => {
        DB.logout(); location.href = 'index.html';
      }});
    };
  },

  requireLogin(redirectIfMissing = 'login.html') {
    const client = DB.currentClient();
    if (!client) { location.href = redirectIfMissing; return null; }
    return client;
  },
  requireActiveSubscription(client, redirectIfExpired = 'subscription.html') {
    const st = DB.subscriptionStatus(client);
    if (!st.ok) { location.href = redirectIfExpired; return false; }
    return true;
  },

  fmtNum(n, dec = 2) {
    const x = Number(n);
    if (!isFinite(x)) return String(n);
    return Math.abs(x - Math.round(x)) < 0.005
      ? Math.round(x).toLocaleString('en-US')
      : x.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  },
  fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
  },
  fmtDateTime(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
  },
  fmtRemaining(expiryDate) {
    if (!expiryDate) return '—';
    const diff = new Date(expiryDate) - new Date();
    if (diff <= 0) return 'منتهي';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (mins > 0) parts.push(`${mins} دقيقة`);
    return parts.join(' و ') || 'أقل من دقيقة';
  },

  unitOf(client) {
    const cur = (client && client.currency) || '';
    if (cur.includes('يمني')) return 'ريال يمني';
    if (cur.includes('سعودي')) return 'ريال سعودي';
    if (cur.includes('دولار')) return 'دولار';
    return 'ريال';
  },
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fixIcons() { if (window.lucide) lucide.createIcons(); },

  config(key) {
    const s = DB.getSettings();
    return s[key] !== undefined ? s[key] : '';
  },

  applyConfig() {
    const countryCode = this.config('support_country_code') || '';
    const p1 = this.config('support_phone_1') || '';
    const p2 = this.config('support_phone_2') || '';
    const allPhones = [p1, p2];

    document.querySelectorAll('[data-config-phone]').forEach((el, i) => {
      el.textContent = allPhones[i] || '—';
    });

    document.querySelectorAll('[data-config-wa]').forEach((el, i) => {
      const phone = allPhones[i];
      if (phone) {
        el.href = `https://wa.me/${countryCode}${phone}`;
        el.removeAttribute('aria-disabled');
      } else {
        el.href = '#';
        el.setAttribute('aria-disabled', 'true');
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
      }
    });

    const tg = this.config('support_telegram');
    document.querySelectorAll('[data-config-telegram]').forEach(el => {
      if (tg) { el.href = tg; } else { el.style.display = 'none'; }
    });

    const insta = this.config('support_instagram');
    document.querySelectorAll('[data-config-instagram]').forEach(el => {
      if (insta) { el.href = `https://instagram.com/${insta}`; } else { el.style.display = 'none'; }
    });

    const messenger = this.config('support_messenger');
    document.querySelectorAll('[data-config-messenger]').forEach(el => {
      if (messenger) { el.href = messenger; } else { el.style.display = 'none'; }
    });
  },

  showPendingNotifications() {
    const client = DB.currentClient();
    if (!client) return;
    const list = DB.getNotifications(client.num).filter(n => !n.read);
    if (!list.length) return;
    const content = list.slice(0, 5).map(n => `
      <div class="card mb-2" style="background:var(--bg-3);border:1px solid var(--border-2);padding:12px">
        <h4 style="color:var(--amber);margin:0 0 6px">${this.esc(n.title)}</h4>
        <p style="margin:0;font-size:.9rem">${this.esc(n.body)}</p>
        <small class="text-muted">${this.fmtDateTime(n.created_at)}</small>
      </div>`).join('');
    setTimeout(() => {
      this.modal({
        title: '🔔 لديك إشعارات',
        content: content + `<button class="btn btn-primary btn-block mt-3" onclick="DB.markAllNotificationsRead(${client.num}); document.getElementById('ft-modal').remove();">تم</button>`,
      });
    }, 1200);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  UI.initTheme();
  UI.initPreloader();
  UI.initParticles();
  UI.initCursor();
  UI.initBackToTop();
  UI.initSidebar();
  UI.initTopbar();
  UI.initReveal();
  UI.applyConfig();
  UI.fixIcons();

   // ✅ تحديث الواجهة تلقائياً عند تغيير الأسعار من الإدارة
window.addEventListener('ft-db-change', (e) => {
  // تحديث أسعار الاشتراكات فوراً
  if (e.detail.key === 'settings' || e.detail.key === 'rates') {
    if (typeof SubPage !== 'undefined' && SubPage.render) SubPage.render();
    if (typeof Shop !== 'undefined' && Shop.updateCalcRates) Shop.updateCalcRates();
  }
  // عرض الإشعارات الجديدة فوراً (إذا كان المستخدم في لوحة التحكم)
  if (e.detail.key === 'notifications') {
    if (typeof UI !== 'undefined' && UI.showPendingNotifications) {
       UI.showPendingNotifications();
    }
  }
});
});

window.UI = UI;

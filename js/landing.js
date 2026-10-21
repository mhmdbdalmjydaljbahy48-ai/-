/* ═══════════════════════════════════════════════════════════
   ✨️ FT — تفاعلات الصفحة الرئيسية
   ═══════════════════════════════════════════════════════════ */

// ═══ إعدادات تلجرام ═══
const TG_BOT_TOKEN = 'ضع_توكن_البوت_هنا'; 
const TG_CHAT_ID = 'ضع_رقم_حسابك_هنا';    

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Parallax ──
  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) heroBg.style.transform = `translateY(${y * 0.4}px) scale(1.1)`;
    });
  }

  // ── Stats counter ──
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = Number(el.dataset.counter);
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = Math.ceil(target / 60);
      const tick = () => {
        current += step;
        if (current >= target) { el.textContent = target.toLocaleString('en-US') + suffix; return; }
        el.textContent = current.toLocaleString('en-US') + suffix;
        requestAnimationFrame(tick);
      };
      tick();
      statsObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-counter]').forEach(el => statsObserver.observe(el));

  // ── FAQ (تم إصلاح اختفاء الأسئلة هنا) ──
  const faqs = [
    { q: 'هل الفترة التجريبية مجانية فعلاً؟', a: 'نعم، عند التسجيل تحصل على فترة تجريبية مجانية كاملة تصل إلى شهر واحد. لا تحتاج لبطاقة ائتمان.' },
    { q: 'هل بياناتي آمنة؟', a: 'بالتأكيد. نستخدم تشفير SHA-256 لكلمات المرور، وكل بياناتك مخزنة بشكل مشفر ومحمي.' },
    { q: 'هل يدعم النظام اللغة العربية؟', a: 'نعم، النظام بأكمله باللغة العربية مع واجهة RTL كاملة وتجربة سلسة.' },
    { q: 'كيف يتم تجديد الاشتراك؟', a: 'من داخل لوحة التحكم، اضغط "اشتراكي" ثم "تجديد"، اختر الباقة، وسيتم إرسال طلب للإدارة للتفعيل.' },
    { q: 'هل يمكنني استخدام النظام لأكثر من متجر؟', a: 'نعم، يمكنك إضافة حسابات إضافية من لوحة الإدارة والتبديل بينها بضغطة زر.' },
    { q: 'هل يعمل النظام بدون إنترنت؟', a: 'النظام يعمل بالكامل في متصفحك ويحفظ البيانات محلياً، لكننا نوصي بالاتصال للنسخ الاحتياطي.' },
    { q: 'هل يوجد دعم فني؟', a: 'نعم، دعم 24/7 عبر واتساب وتلجرام وماسنجر. فريقنا جاهز للمساعدة في أي وقت.' },
    { q: 'هل يمكنني تصدير بياناتي؟', a: 'نعم، يمكنك تصدير الفواتير والتقارير كملفات نصية وطباعتها.' },
  ];
  
  const faqList = document.getElementById('faqList');
  if (faqList) {
    faqs.forEach((f, i) => {
      const item = document.createElement('div');
      // تم إزالة كلمة reveal لكي لا تختفي الأسئلة
      item.className = 'faq-item'; 
      item.innerHTML = `
        <button class="faq-question" aria-expanded="false">
          <span>${f.q}</span>
          <i data-lucide="chevron-down"></i>
        </button>
        <div class="faq-answer"><p>${f.a}</p></div>`;
      faqList.appendChild(item);
      
      item.querySelector('.faq-question').onclick = () => {
        const open = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
        if (!open) item.classList.add('active');
      };
    });
  }
  
  if (window.UI && UI.fixIcons) UI.fixIcons();

  // ── Testimonials Slider ──
  const track = document.getElementById('testimonialTrack');
  const nav = document.getElementById('sliderNav');
  if (track && nav) {
    const slides = track.querySelectorAll('.testimonial-slide');
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.onclick = () => goTo(i);
      nav.appendChild(dot);
    });
    let cur = 0;
    function goTo(i) {
      cur = i;
      track.style.transform = `translateX(${i * 100}%)`;
      nav.querySelectorAll('.slider-dot').forEach((d, j) => d.classList.toggle('active', j === i));
    }
    setInterval(() => goTo((cur + 1) % slides.length), 6000);
  }

  // ── Contact Form (حفظ في الاستفسارات) ──
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm));
      
      if (!data.name || data.name.length < 2) return UI.toast('الاسم قصير جداً', 'error');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return UI.toast('إيميل غير صحيح', 'error');
      if (!data.subject) return UI.toast('أدخل الموضوع', 'error');
      if (!data.message || data.message.length < 10) return UI.toast('الرسالة قصيرة جداً', 'error');

      const btn = contactForm.querySelector('button[type="submit"]');
      const oldText = btn.innerHTML;
      btn.innerHTML = '⏳ جاري الإرسال...';
      btn.disabled = true;

      try {
        const client = (typeof DB !== 'undefined' && DB.currentClient) ? DB.currentClient() : null;
        const senderType = client ? " (حساب مسجل)" : " (مستفسر خارجي)";

        if (typeof DB !== 'undefined' && DB.addInquiry) {
          DB.addInquiry({
            name: data.name + senderType,
            email: data.email,
            subject: data.subject,
            message: data.message
          });
        }

        if (TG_BOT_TOKEN !== 'ضع_توكن_البوت_هنا' && TG_CHAT_ID !== 'ضع_رقم_حسابك_هنا') {
          const text = `📬 <b>رسالة جديدة من الموقع</b>\n\n👤 <b>الاسم:</b> ${data.name}${senderType}\n📧 <b>الإيميل:</b> ${data.email}\n📝 <b>الموضوع:</b> ${data.subject}\n\n💬 <b>الرسالة:</b>\n${data.message}`;
          await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: 'HTML' })
          });
        }
        
        UI.toast('✅ تم إرسال رسالتك بنجاح!', 'success');
        contactForm.reset();
      } catch (error) {
        console.error(error);
        UI.toast('✅ تم الحفظ في النظام.', 'success');
        contactForm.reset();
      } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
      }
    };
  }

  // ── Newsletter ──
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.onsubmit = (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.toast('إيميل غير صحيح', 'error'); return; }
      UI.toast('✅ تم اشتراكك في النشرة البريدية!', 'success');
      newsletterForm.reset();
    };
  }

  // ── Lightbox ──
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `<button class="lightbox-close" aria-label="إغلاق"><i data-lucide="x"></i></button><img src="" alt="">`;
  document.body.appendChild(lightbox);
  const lbImg = lightbox.querySelector('img');
  document.querySelectorAll('.pin-item img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.onclick = () => { lbImg.src = img.src; lbImg.alt = img.alt; lightbox.classList.add('active'); };
  });
  lightbox.onclick = (e) => { if (e.target === lightbox || e.target.closest('.lightbox-close')) lightbox.classList.remove('active'); };
  
  if (window.UI && UI.fixIcons) UI.fixIcons();
});
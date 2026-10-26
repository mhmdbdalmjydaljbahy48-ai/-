/* ═══════════════════════════════════════════════════════════
   ✨️ FT — المصادقة — النسخة المطوّرة (v6)
   ═══════════════════════════════════════════════════════════ */

const Auth = {
  async login(num, password) {
    if (!num || !password) throw new Error('أدخل رقم العميل وكلمة المرور');
    const n = DB.parseNum(num, 1);
    if (n === null) throw new Error('رقم العميل يجب أن يكون أرقاماً فقط');
    return await DB.login(n, password);
  },

  async register(data) {
    let { name, num, email, password } = data;
    
    name = (name || '').trim();
    email = DB.cleanText(email);
    
    if (!name || name.length < 2) throw new Error('الاسم قصير جداً');
    
    const n = DB.parseNum(num, 1);
    if (n === null) throw new Error('رقم العميل يجب أن يكون أرقاماً فقط');
    
    const suffix = DB.getSettings().email_suffix || '.com';
    if (!DB.validateEmail(email, suffix)) {
      throw new Error(`إيميل غير صحيح (يجب أن ينتهي بـ ${suffix})`);
    }
    
    if (!password || password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    
    const reg = DB.canRegister();
    if (!reg.ok) throw new Error(reg.why);
    
    return await DB.createClient({ 
      num: n, 
      name, 
      email, 
      password, 
      months: DB.getSettings().trial_months || 1 
    });
  },

  async onRegisterSubmit(form) {
    const data = {
      name: form.name.value.trim(),
      num: form.num.value.trim(),
      email: DB.cleanText(form.email.value),
      password: form.password.value,
    };
    try {
      await this.register(data);
      
      // ✅ التعديل: إظهار رسالة الموافقة بدلاً من الدخول
      UI.modal({
        title: '⏳ طلبك قيد المراجعة',
        content: `<div style="text-align:center">
                    <div style="font-size:3rem;margin-bottom:15px">📩</div>
                    <p class="mb-3" style="font-size:1.1rem">تم إرسال طلب إنشاء الحساب بنجاح.</p>
                    <p class="text-muted mb-3">سيقوم فريق الإدارة بمراجعة طلبك وتفعيل حسابك في أقرب وقت. يرجى العودة لاحقاً وتسجيل الدخول.</p>
                    <a href="index.html" class="btn btn-primary btn-block mt-3">العودة للرئيسية</a>
                  </div>`,
        onOpen: (el) => { el.querySelector('[data-close]').style.display = 'none'; }
      });
      
      form.reset();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  async onLoginSubmit(form) {
    try {
      await this.login(form.num.value, form.password.value);
      localStorage.setItem('ft_has_account','true');
      UI.toast('✅ مرحباً بعودتك!', 'success');
      setTimeout(() => location.href = 'dashboard.html', 500);
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  }
};

window.Auth = Auth;

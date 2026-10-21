/* ═══════════════════════════════════════════════════════════
   ✨️ FT — المصادقة — النسخة المطوّرة
   (تنظيف الإيميل من الرموز الخفية + brute-force + mode)
   ═══════════════════════════════════════════════════════════ */

const Auth = {
  // دالة لتنظيف النصوص من الأحرف الخفية والمسافات
  cleanString(str) {
    if (!str) return '';
    // حذف المسافات وعلامات الاتجاه (RTL/LTR) والمسافات الصفرية
    return String(str).replace(/[\s\u200e\u200f\u202a-\u202e\u200b\u200c\u200d\u2066-\u2069]/g, '');
  },

  async login(num, password) {
    if (!num || !password) throw new Error('أدخل رقم العميل وكلمة المرور');
    const n = DB.parseNum(num, 1);
    if (n === null) throw new Error('رقم العميل يجب أن يكون أرقاماً فقط');
    return await DB.login(n, password);
  },

  async register(data) {
    let { name, num, email, password } = data;
    
    // تنظيف المدخلات
    name = (name || '').trim();
    email = this.cleanString(email);
    
    if (!name || name.length < 2) throw new Error('الاسم قصير جداً');
    
    const n = DB.parseNum(num, 1);
    if (n === null) throw new Error('رقم العميل يجب أن يكون أرقاماً فقط');
    
    const suffix = DB.getSettings().email_suffix || '';
    if (!DB.validateEmail(email, suffix)) {
      throw new Error(`إيميل غير صحيح${suffix ? ' (يجب أن ينتهي بـ ' + suffix + ')' : ''}`);
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
      email: this.cleanString(form.email.value), // تنظيف الإيميل هنا
      password: form.password.value,
    };
    try {
      const client = await this.register(data);
      DB.setSession(client.num);
      UI.toast('✅ تم إنشاء الحساب وتفعيل الفترة التجريبية!', 'success');
      setTimeout(() => location.href = 'dashboard.html', 700);
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  async onLoginSubmit(form) {
    try {
      await this.login(form.num.value, form.password.value);
      UI.toast('✅ مرحباً بعودتك!', 'success');
      setTimeout(() => location.href = 'dashboard.html', 500);
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  }
};

window.Auth = Auth;

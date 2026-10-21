/* ═══════════════════════════════════════════════════════════
   ✨️ FT — المصادقة — النسخة المطوّرة (brute-force + mode)
   ═══════════════════════════════════════════════════════════ */

const Auth = {
  async login(num, password) {
    if (!num || !password) throw new Error('أدخل رقم العميل وكلمة المرور');
    const n = DB.parseNum(num, 1);
    if (n === null) throw new Error('رقم العميل يجب أن يكون أرقاماً فقط');
    return await DB.login(n, password);
  },

  async register(data) {
    const { name, num, email, password } = data;
    if (!name || name.length < 2) throw new Error('الاسم قصير جداً');
    const n = DB.parseNum(num, 1);
    if (n === null) throw new Error('رقم العميل يجب أن يكون أرقاماً فقط');
    const suffix = DB.getSettings().email_suffix || '';
    if (!DB.validateEmail(email, suffix)) throw new Error(`إيميل غير صحيح${suffix ? ' (يجب أن ينتهي بـ ' + suffix + ')' : ''}`);
    if (!password || password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    // إصلاح #11: احترام registration_mode
    const reg = DB.canRegister();
    if (!reg.ok) throw new Error(reg.why);
    return await DB.createClient({ num: n, name, email, password, months: DB.getSettings().trial_months || 1 });
  },

  async onRegisterSubmit(form) {
    const data = {
      name: form.name.value.trim(),
      num: form.num.value.trim(),
      email: form.email.value.trim(),
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
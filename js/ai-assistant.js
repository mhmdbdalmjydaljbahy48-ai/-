const AIAssistant = {
  client: null,
  history: [],
  isTyping: false,

  init() {
    this.client = UI.requireLogin();
    if (!this.client) return;
    document.getElementById('userAvatar').textContent = this.client.name.charAt(0);
    document.getElementById('userName').textContent = this.client.name;
    document.getElementById('userRole').textContent = this.client.account_type || 'مستخدم';
    if (DB.isAdmin(this.client.num) || this.client.is_admin) {
      document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'flex');
    }

    document.getElementById('chatSend').onclick = () => this.sendMessage();
    document.getElementById('chatInput').onkeypress = (e) => { if (e.key === 'Enter') this.sendMessage(); };
  },

  // دالة استخراج البيانات وتلخيصها
  buildDataContext() {
    const cn = this.client.num;
    try {
      const analytics = DB.getAdvancedAnalytics(cn);
      const bestProd = DB.getBestSellingProduct(cn, 'month');
      const debts = DB.getAllCustomersWithBalances(cn);
      const totalDebts = debts.reduce((s, c) => s + c.remain, 0);
      
      const expenses = DB.expenses.list(cn).reduce((s, e) => s + Number(e.amount || 0), 0);
      const incomes = DB.incomes.list(cn).reduce((s, i) => s + Number(i.amount || 0), 0);
      
      const productsCount = DB.getProducts().length;
      
      let context = `
        - مبيعات اليوم (كاش وشبكة): ${analytics.today_cash + analytics.today_network} ريال.
        - ديون اليوم (آجل): ${analytics.today_debt} ريال.
        - مبيعات هذا الشهر (كاش وشبكة): ${analytics.month_cash + analytics.month_network} ريال.
        - المنتج الأكثر مبيعاً هذا الشهر: ${bestProd ? bestProd.name + ' (الكمية: ' + bestProd.qty + ')' : 'لا يوجد'}.
        - إجمالي الديون المتبقية على العملاء: ${totalDebts} ريال.
        - عدد المنتجات في المخزون: ${productsCount}.
        - إجمالي المصاريف الشخصية المسجلة: ${expenses} ريال.
        - إجمالي الدخل الشخصي المسجل: ${incomes} ريال.
      `;
      return context;
    } catch (e) {
      console.error("خطأ في استخراج البيانات:", e);
      return "لا توجد بيانات متاحة حالياً.";
    }
  },

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    const text = input.value.trim();
    if (!text || this.isTyping) return;

    // إضافة رسالة المستخدم
    input.value = '';
    messages.innerHTML += `<div class="msg user">${text}</div>`;
    messages.scrollTop = messages.scrollHeight;
    this.history.push({ role: 'user', text: text });

    // مؤشر الكتابة
    this.isTyping = true;
    const loadId = 'load-' + Date.now();
    messages.innerHTML += `<div class="msg model" id="${loadId}">جاري تحليل البيانات... ⏳</div>`;
    messages.scrollTop = messages.scrollHeight;

    // استخراج البيانات وإرسالها
    const dataContext = this.buildDataContext();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: this.history.slice(0, -1),
          dataContext: dataContext 
        })
      });
      const data = await res.json();
      document.getElementById(loadId).remove();

      if (data.reply) {
        messages.innerHTML += `<div class="msg model">${data.reply}</div>`;
        this.history.push({ role: 'model', text: data.reply });
      } else {
        messages.innerHTML += `<div class="msg model" style="color:var(--danger)">${data.error || 'حدث خطأ غير معروف'}</div>`;
      }
    } catch (e) {
      document.getElementById(loadId).remove();
      messages.innerHTML += `<div class="msg model" style="color:var(--danger)">تعذر الاتصال بالخادم.</div>`;
    } finally {
      this.isTyping = false;
      messages.scrollTop = messages.scrollHeight;
      if(window.lucide) lucide.createIcons();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => AIAssistant.init());

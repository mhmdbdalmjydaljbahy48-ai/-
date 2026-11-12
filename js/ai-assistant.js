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

    // التحقق من اشتراك البوت
    const aiSub = DB.getAiSubscriptionStatus(this.client);
    if (!aiSub.ok && !DB.isAdmin(this.client.num)) {
      document.getElementById('aiLockScreen').style.display = 'flex';
      document.getElementById('chatInput').disabled = true;
      document.getElementById('chatSend').disabled = true;
      document.getElementById('btnShowAiPlans').onclick = () => this.showAiPlans();
    } else {
      document.getElementById('aiLockScreen').style.display = 'none';
      document.getElementById('chatInput').disabled = false;
      document.getElementById('chatSend').disabled = false;
    }

    // إضافة زر إدارة الاشتراك في الهيدر
    const header = document.querySelector('.chat-header');
    if (header && !document.getElementById('btnManageAiSub')) {
      const manageBtn = document.createElement('button');
      manageBtn.id = 'btnManageAiSub';
      manageBtn.className = 'btn btn-sm btn-outline';
      manageBtn.style.cssText = 'margin-right:auto; border-color:#3B82F6; color:#60A5FA;';
      manageBtn.innerHTML = '<i data-lucide="settings" style="width:16px;height:16px;"></i> إدارة الاشتراك';
      manageBtn.onclick = () => this.showAiPlans();
      header.appendChild(manageBtn);
      UI.fixIcons();
    }

    document.getElementById('chatSend').onclick = () => this.sendMessage();
    document.getElementById('chatInput').onkeypress = (e) => { if (e.key === 'Enter') this.sendMessage(); };
  },

  showAiPlans() {
    // تحديث حالة العميل من قاعدة البيانات لضمان دقة البيانات
    this.client = DB.findClient(this.client.num);
    const price = DB.getSettings().ai_month_price || 0; 
    const trialUsed = this.client.ai_trial_used;

    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:15px;margin-top:20px">`;
    for (let i = 1; i <= 12; i++) {
      html += `<div style="background:rgba(30,41,59,0.8);border:1px solid rgba(96,165,250,0.3);border-radius:12px;padding:15px;text-align:center">
        <h4 style="color:#60A5FA;margin-bottom:10px">${DB.durationLabel(i)}</h4>
        <div style="font-size:1.2rem;font-weight:900;color:#fff;margin-bottom:15px">${UI.fmtNum(i * price)} <small>ريال</small></div>
        <button class="btn btn-primary btn-sm btn-block" onclick="AIAssistant.requestAiSub(${i})">اشتراك</button>
      </div>`;
    }
    html += `</div>`;

    // إظهار زر التجربة فقط إذا لم يستخدمها من قبل
    if (!trialUsed && !DB.isAdmin(this.client.num)) {
       html = `<div style="text-align:center;margin-bottom:20px;padding:15px;background:rgba(16,185,129,0.1);border:1px solid #10B981;border-radius:12px">
          <p style="color:#10B981;font-weight:bold;margin-bottom:10px">🎁 إدارة النظام تمنحك شهراً تجريبياً مجانياً!</p>
          <button class="btn btn-success btn-block" onclick="AIAssistant.requestAiTrial()">تجربة الشهر المجاني (مرة واحدة فقط)</button>
       </div>` + html;
    } else if (trialUsed) {
       html = `<div style="text-align:center;margin-bottom:20px;padding:15px;background:rgba(245,158,11,0.1);border:1px solid #F59E0B;border-radius:12px">
          <p style="color:#F59E0B;font-weight:bold;">لقد استخدمت فترتك التجريبية المجانية مسبقاً.</p>
          <small class="text-muted">يرجى الاشتراك للاستمرار في استخدام المحلل الذكي.</small>
       </div>` + html;
    }

    UI.modal({
      title: '💎 باقات المحلل الذكي',
      content: html,
      onOpen: (el) => {
         el.style.maxWidth = '600px';
      }
    });
  },

  requestAiTrial() {
    UI.confirm({
      title: '🎁 تفعيل الشهر المجاني',
      message: 'هل أنت متأكد من رغبتك في تفعيل الشهر التجريبي المجاني للمحلل الذكي؟ (لا يمكن استخدامه إلا مرة واحدة فقط).',
      danger: false,
      onConfirm: () => {
        const success = DB.requestAiTrial(this.client.num);
        if (success) {
          UI.modal({
            title: '🎉 مبروك!',
            content: `<div style="text-align:center;padding:20px">
                        <div style="font-size:4rem;margin-bottom:15px">🎁</div>
                        <h2 style="color:#3B82F6;margin-bottom:10px">تم تفعيل الشهر المجاني!</h2>
                        <p class="text-muted">لقد حصلت على شهر كامل لاستخدام المحلل الذكي مجاناً. ابدأ الآن بتحليل بيانات متجرك!</p>
                        <button class="btn btn-primary btn-block mt-4" onclick="location.reload()" style="background:#3B82F6">ابدأ الآن</button>
                      </div>`,
            onOpen: (el) => el.querySelector('[data-close]').style.display = 'none'
          });
        } else {
          UI.toast('حدث خطأ، ربما استخدمت التجربة من قبل.', 'error');
        }
      }
    });
  },

  requestAiSub(months) {
    const price = DB.getSettings().ai_month_price || 0;
    const amount = months * price;
    UI.confirm({
      title: 'طلب اشتراك البوت',
      message: `هل تريد طلب اشتراك المحلل الذكي لمدة ${months} شهر مقابل ${amount} ريال؟`,
      onConfirm: () => {
        DB.createAiSubRequest({ client_num: this.client.num, months, amount });
        UI.toast('تم إرسال الطلب للإدارة بنجاح', 'success');
        document.getElementById('ft-modal').remove();
      }
    });
  },

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

    input.value = '';
    messages.innerHTML += `<div class="msg user">${text}</div>`;
    messages.scrollTop = messages.scrollHeight;
    this.history.push({ role: 'user', text: text });

    this.isTyping = true;
    const loadId = 'load-' + Date.now();
    messages.innerHTML += `<div class="msg model" id="${loadId}">جاري تحليل البيانات... ⏳</div>`;
    messages.scrollTop = messages.scrollHeight;

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

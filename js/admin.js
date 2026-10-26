const Admin = {
  client: null,
  _usersPage: 0,
  init() {
    this.client = UI.requireLogin();
    if (!this.client) return;
    if (!DB.isAdmin(this.client.num) && !this.client.is_admin) {
      UI.toast('غير مسموح بالدخول', 'error');
      setTimeout(() => location.href = 'dashboard.html', 1000); return;
    }
    document.getElementById('userAvatar').textContent = this.client.name.charAt(0);
    document.getElementById('userName').textContent = this.client.name;
    document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'flex');

    document.querySelectorAll('.tab').forEach(t => t.onclick = (e) => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
      e.currentTarget.classList.add('active');
      document.getElementById('tab-' + e.currentTarget.dataset.tab).classList.add('active');
    });

    this.render();
    this.loadSettings();
  },

  render() {
    this.renderStats();
    this.renderPending();
    this.renderInquiries();
    this.renderUsers();
  },

  renderStats() {
    const clients = DB.getAllClients();
    const pending = DB.pendingSubRequests().length;
    const active = clients.filter(c => DB.subscriptionStatus(c).ok).length;
    const expired = clients.length - active;
    const shops = clients.filter(c => c.account_type === 'تجاري').length;
    const individuals = clients.filter(c => c.account_type === 'فردي').length;
    const products = DB.getProducts().length;
    const totalCustomers = DB.get('shop_customers', []).length;
    const totalDebts = DB.get('shop_debts', []).length;
    const totalExpenses = DB.get('personal_expenses', []).length;
    const sumExpenses = DB.get('personal_expenses', []).reduce((s,e) => s + Number(e.amount), 0);
    const totalIncome = DB.get('personal_income', []).length;
    const sumIncome = DB.get('personal_income', []).reduce((s,e) => s + Number(e.amount), 0);
    const pdebts = DB.get('personal_debts', []).length;
    const notifs = DB.get('notifications', []).length;

    document.getElementById('statsGrid').innerHTML = `
      <div class="card"><h4 class="text-muted">إجمالي المشتركين</h4><div style="font-size:2rem;font-weight:900">${clients.length}</div></div>
      <div class="card"><h4 class="text-muted">نشط</h4><div style="font-size:2rem;font-weight:900;color:var(--success)">${active}</div></div>
      <div class="card"><h4 class="text-muted">منتهي/موقوف</h4><div style="font-size:2rem;font-weight:900;color:var(--danger)">${expired}</div></div>
      <div class="card"><h4 class="text-muted">طلبات معلقة</h4><div style="font-size:2rem;font-weight:900;color:var(--amber)">${pending}</div></div>
      <div class="card"><h4 class="text-muted">تجاري / فردي</h4><div style="font-size:1.5rem;font-weight:900">${shops} / ${individuals}</div></div>
      <div class="card"><h4 class="text-muted">المنتجات</h4><div style="font-size:2rem;font-weight:900">${products}</div></div>
      <div class="card"><h4 class="text-muted">عملاء المتجر</h4><div style="font-size:2rem;font-weight:900">${totalCustomers}</div></div>
      <div class="card"><h4 class="text-muted">سجلات ديون</h4><div style="font-size:2rem;font-weight:900">${totalDebts}</div></div>
      <div class="card"><h4 class="text-muted">مصاريف (${totalExpenses})</h4><div style="font-size:1.5rem;font-weight:900;color:var(--amber)">${UI.fmtNum(sumExpenses)}</div></div>
      <div class="card"><h4 class="text-muted">دخل (${totalIncome})</h4><div style="font-size:1.5rem;font-weight:900;color:var(--success)">${UI.fmtNum(sumIncome)}</div></div>
      <div class="card"><h4 class="text-muted">ديون شخصية</h4><div style="font-size:2rem;font-weight:900">${pdebts}</div></div>
      <div class="card"><h4 class="text-muted">إشعارات</h4><div style="font-size:2rem;font-weight:900">${notifs}</div></div>`;
  },

  renderPending() {
    const reqs = DB.pendingSubRequests();
    document.getElementById('pendingList').innerHTML = reqs.length ? reqs.map(r => {
      const c = DB.findClient(r.client_num);
      return `<div class="flex-between mb-2" style="padding:10px;border-bottom:1px solid var(--border-2)">
        <div><b>${c ? UI.esc(c.name) : 'غير معروف'}</b> (${r.client_num}) - ${r.months} شهر - ${UI.fmtNum(r.amount)}
        ${r.note ? `<br><small class="text-muted">📝 ${UI.esc(r.note)}</small>` : ''}</div>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-primary" onclick="Admin.approve(${r.req_id})">✅ تفعيل</button>
          <button class="btn btn-sm btn-danger" onclick="Admin.reject(${r.req_id})">❌ رفض</button>
        </div>
      </div>`;
    }).join('') : '<p class="text-muted">لا طلبات معلقة</p>';
  },

  renderInquiries() {
    const inqs = DB.getInquiries();
    const box = document.getElementById('inquiriesList');
    if (!box) return;
    box.innerHTML = inqs.length ? inqs.map(i => `
      <div class="card mb-2" style="background:var(--bg-3);border:1px solid var(--border-2); padding: 16px;">
        <div class="flex-between mb-2">
          <h4 style="color:var(--amber);margin:0">${UI.esc(i.subject)}</h4>
          <button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="Admin.deleteInquiry(${i.id})"><i data-lucide="trash-2"></i> حذف</button>
        </div>
        <p class="mb-1"><b>الاسم:</b> ${UI.esc(i.name)} | <b>الإيميل:</b> ${UI.esc(i.email)}</p>
        <p class="mb-1" style="white-space: pre-wrap; background: var(--bg-2); padding: 10px; border-radius: 8px;">${UI.esc(i.message)}</p>
        <small class="text-muted">${UI.fmtDateTime(i.created_at)}</small>
      </div>`).join('') : '<p class="text-muted">لا توجد استفسارات حالياً.</p>';
    UI.fixIcons();
  },

  deleteInquiry(id) {
    DB.deleteInquiry(id);
    UI.toast('تم حذف الاستفسار', 'success');
    this.renderInquiries();
  },

  clearInquiries() {
    UI.confirm({
      title: 'مسح الكل', message: 'هل تريد مسح جميع الاستفسارات؟', danger: true,
      onConfirm: () => { DB.clearInquiries(); this.renderInquiries(); UI.toast('تم المسح', 'success'); }
    });
  },

  approve(id) {
    try { DB.approveSubRequest(id, this.client.num); UI.toast('✅ تم التفعيل', 'success'); this.render(); }
    catch(e) { UI.toast(e.message, 'error'); }
  },
  reject(id) {
    try { DB.rejectSubRequest(id, this.client.num); UI.toast('✅ تم الرفض', 'success'); this.render(); }
    catch(e) { UI.toast(e.message, 'error'); }
  },

  renderUsers() {
    const users = DB.getAllClients();
    const page = this._usersPage || 0;
    const perPage = 15;
    const slice = users.slice(page * perPage, (page + 1) * perPage);
    const total = Math.ceil(users.length / perPage) || 1;
    let html = `
      <thead><tr style="border-bottom:1px solid var(--border)"><th style="padding:10px">#</th><th>الاسم</th><th>النوع</th><th>ينتهي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
      <tbody>${slice.map(u => {
        const st = DB.subscriptionStatus(u);
        return `<tr style="border-bottom:1px solid var(--border-2)">
          <td style="padding:10px">${u.num}</td>
          <td>${UI.esc(u.name)}</td>
          <td>${UI.esc(u.account_type || '—')}</td>
          <td>${UI.fmtDate(u.expiry_date)}</td>
          <td>${st.blocked ? '<span class="badge badge-danger">موقوف</span>' : st.ok ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-warn">منتهي</span>'}</td>
          <td><button class="btn btn-sm btn-outline" onclick="Admin.actionsMenu(${u.num})">⚙️ إدارة</button></td>
        </tr>`;
      }).join('')}</tbody>`;
    if (total > 1) {
      html += `<tfoot><tr><td colspan="6" style="padding:10px;text-align:center">
        <button class="btn btn-sm btn-outline" onclick="Admin._usersPage=${Math.max(0,page-1)};Admin.renderUsers()" ${page===0?'disabled':''}>◀️ السابق</button>
        <span style="margin:0 12px">صفحة ${page+1} من ${total}</span>
        <button class="btn btn-sm btn-outline" onclick="Admin._usersPage=${Math.min(total-1,page+1)};Admin.renderUsers()" ${page>=total-1?'disabled':''}>التالي ▶️</button>
      </td></tr></tfoot>`;
    }
    document.getElementById('usersTable').innerHTML = html;
  },

  actionsMenu(num) {
    const c = DB.findClient(num);
    if (!c) return;
    const st = DB.subscriptionStatus(c);
    UI.modal({
      title: `👤 ${UI.esc(c.name)} (#${num})`,
      content: `
        <p class="text-muted mb-3">${UI.esc(c.email || '')} • ${UI.esc(c.account_type || 'غير محدد')}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-outline" data-act="extend">➕ تمديد</button>
          <button class="btn btn-outline" data-act="edit">✏️ تعديل</button>
          <button class="btn btn-outline" data-act="toggle">${st.blocked ? '✅ تفعيل' : '⛔ إيقاف'}</button>
          <button class="btn btn-outline" data-act="expire">🚫 تصفير اشتراك</button>
          <button class="btn btn-danger" data-act="reset" style="grid-column:span 2">🔄 تصفير البيانات</button>
          <button class="btn btn-danger" data-act="delete" style="grid-column:span 2">🗑 حذف نهائي</button>
        </div>`,
      onOpen: (el, close) => {
        el.querySelectorAll('[data-act]').forEach(btn => {
          btn.onclick = () => {
            const act = btn.dataset.act;
            close();
            if (act === 'extend') this.extend(num);
            else if (act === 'edit') this.editUser(num);
            else if (act === 'toggle') this.toggleUser(num);
            else if (act === 'expire') this.expireUser(num);
            else if (act === 'reset') this.resetUser(num);
            else if (act === 'delete') this.deleteUser(num);
          };
        });
      }
    });
  },

  extend(num) {
    UI.modal({
      title: 'تمديد اشتراك',
      content: `
        <div class="form-group"><label class="form-label">الوحدة</label>
          <select class="form-select" id="extUnit">
            <option value="months">📅 شهر</option><option value="days">📆 يوم</option>
            <option value="hours">⏰ ساعة</option><option value="minutes">⏱ دقيقة</option>
          </select></div>
        <div class="form-group"><label class="form-label">العدد</label>
          <input class="form-input" type="number" id="extAmount" value="1" min="1"></div>
        <div class="form-group"><label class="form-label">المبلغ المدفوع (اختياري)</label>
          <input class="form-input" type="number" id="extPaid" value="0" min="0"></div>
        <button class="btn btn-primary btn-block" id="btnExt">تمديد</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnExt').onclick = () => {
          const unit = el.querySelector('#extUnit').value;
          const v = Number(el.querySelector('#extAmount').value);
          const amt = Number(el.querySelector('#extPaid').value) || 0;
          if (v <= 0) return UI.toast('أدخل عدداً صحيحاً', 'error');
          try {
            DB.grantSubscription(num, { [unit]: v, amount: amt, resetMonthsIfExpired: false });
            DB.logAudit('ADMIN_EXTEND', num, `+${v} ${unit} paid=${amt}`);
            DB.addNotification(num, '✅ تمديد اشتراك', `تم تمديد اشتراكك بمقدار ${v} ${unit}.`);
            UI.toast('✅ تم التمديد', 'success'); close(); this.render();
          } catch(e) { UI.toast(e.message, 'error'); }
        };
      }
    });
  },

  editUser(num) {
    const c = DB.findClient(num);
    if (!c) return;
    UI.modal({
      title: `✏️ تعديل ${UI.esc(c.name)}`,
      content: `
        <div class="form-group"><label class="form-label">الرقم (رقم الدخول)</label><input class="form-input" type="number" id="eNum" value="${c.num}"></div>
        <div class="form-group"><label class="form-label">الاسم</label><input class="form-input" id="eName" value="${UI.esc(c.name)}"></div>
        <div class="form-group"><label class="form-label">الإيميل</label><input class="form-input" id="eEmail" value="${UI.esc(c.email)}"></div>
        <div class="form-group"><label class="form-label">اسم المتجر</label><input class="form-input" id="eShop" value="${UI.esc(c.shop_name || '')}"></div>
        <div class="form-group"><label class="form-label">النشاط</label><input class="form-input" id="eActivity" value="${UI.esc(c.activity_type || '')}"></div>
        <div class="form-group"><label class="form-label">الدولة</label><input class="form-input" id="eCountry" value="${UI.esc(c.shop_location || '')}"></div>
        <div class="form-group"><label class="form-label">الموقع</label><input class="form-input" id="eLocation" value="${UI.esc(c.location || '')}"></div>
        <div class="form-group"><label class="form-label">العملة</label>
          <select class="form-select" id="eCurrency">
            <option value="">—</option>
            <option value="الريال اليمني" ${c.currency==='الريال اليمني'?'selected':''}>الريال اليمني</option>
            <option value="الريال السعودي" ${c.currency==='الريال السعودي'?'selected':''}>الريال السعودي</option>
            <option value="الدولار" ${c.currency==='الدولار'?'selected':''}>الدولار</option>
          </select></div>
        <div class="form-group"><label class="form-label">كلمة مرور جديدة (اتركها فارغة للإبقاء)</label><input class="form-input" type="password" id="ePass"></div>
        <button class="btn btn-primary btn-block" id="btnSave">حفظ</button>`,
      onOpen: async (el, close) => {
        el.querySelector('#btnSave').onclick = async () => {
          const newNum = Number(el.querySelector('#eNum').value);
          const name = el.querySelector('#eName').value.trim();
          const email = el.querySelector('#eEmail').value.trim();
          const pass = el.querySelector('#ePass').value;
          if (!name) return UI.toast('الاسم مطلوب', 'error');
          const patch = {
            name, email,
            shop_name: el.querySelector('#eShop').value.trim() || null,
            activity_type: el.querySelector('#eActivity').value.trim() || null,
            shop_location: el.querySelector('#eCountry').value.trim() || null,
            location: el.querySelector('#eLocation').value.trim() || null,
            currency: el.querySelector('#eCurrency').value || null,
          };
          if (pass && pass.length >= 8) patch.password_hash = await DB.hashPassword(pass);
          try {
            if (newNum !== num) DB.updateClientNum(num, newNum);
            DB.updateClient(newNum, patch);
            DB.logAudit('ADMIN_EDIT', newNum, `name=${name}`);
            UI.toast('✅ تم التحديث', 'success'); close(); this.render();
          } catch(e) { UI.toast(e.message, 'error'); }
        };
      }
    });
  },

  toggleUser(num) {
    const c = DB.findClient(num);
    if (!c) return;
    const st = DB.subscriptionStatus(c);
    DB.updateClient(num, { is_active: st.blocked ? 1 : 0 });
    DB.logAudit('ADMIN_TOGGLE', num, st.blocked ? 'enabled' : 'disabled');
    if (st.blocked) {
      DB.addNotification(num, '✅ تم تفعيل حسابك', 'حسابك أصبح نشطاً مرة أخرى.');
    } else {
      DB.addNotification(num, '⛔ تم إيقاف حسابك', 'تواصل مع الإدارة للاستفسار.');
    }
    UI.toast(st.blocked ? '✅ تم التفعيل' : '⛔ تم الإيقاف', 'success');
    this.render();
  },

  expireUser(num) {
    UI.confirm({ title: 'تصفير الاشتراك', message: 'سيتم إنهاء الاشتراك فوراً. متابعة؟', danger: true, onConfirm: () => {
      DB.updateClient(num, { expiry_date: new Date(Date.now() - 86400000).toISOString() });
      DB.logAudit('ADMIN_EXPIRE', num);
      UI.toast('✅ تم تصفير الاشتراك', 'success'); this.render();
    }});
  },

  resetUser(num) {
    UI.confirm({ title: 'تصفير البيانات', message: 'حذف كل بيانات المتجر والديون والشخصية مع بقاء الحساب؟', danger: true, onConfirm: () => {
      DB.purgeClientData(num);
      DB.logAudit('ADMIN_RESET_DATA', null, `تم تصفير بيانات العميل: ${num}`); 
      UI.toast('✅ تم التصفير', 'success'); this.render();
    }});
  },

  deleteUser(num) {
    UI.confirm({ title: 'حذف نهائي', message: 'سيتم حذف الحساب وكل بياناته!', danger: true, onConfirm: () => {
      DB.logAudit('ADMIN_DELETE', null, `تم حذف العميل: ${num}`);
      DB.deleteClient(num);
      UI.toast('✅ تم الحذف', 'success'); this.render();
    }});
  },

  addUser() {
    UI.modal({
      title: 'إنشاء حساب جديد',
      content: `
        <div class="form-group"><label class="form-label">الاسم</label><input class="form-input" id="uName"></div>
        <div class="form-group"><label class="form-label">الرقم</label><input class="form-input" type="number" id="uNum"></div>
        <div class="form-group"><label class="form-label">الإيميل</label><input class="form-input" type="email" id="uEmail"></div>
        <div class="form-group"><label class="form-label">كلمة المرور</label><input class="form-input" type="password" id="uPass" minlength="8"></div>
        <div class="form-group"><label class="form-label">الأشهر</label><input class="form-input" type="number" id="uMonths" value="1" min="1"></div>
        <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="uAdmin"> منحه صلاحية مدير</label></div>
        <button class="btn btn-primary btn-block" id="btnAddU">إنشاء</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnAddU').onclick = async () => {
          try {
            const c = await DB.createClient({
              num: Number(el.querySelector('#uNum').value),
              name: el.querySelector('#uName').value,
              email: el.querySelector('#uEmail').value,
              password: el.querySelector('#uPass').value,
              months: Number(el.querySelector('#uMonths').value),
            });
            if (el.querySelector('#uAdmin').checked) DB.addAdmin(c.num);
            DB.logAudit('ADMIN_CREATE', c.num, c.name);
            UI.toast('✅ تم إنشاء الحساب', 'success'); close(); this.render();
          } catch(e) { UI.toast(e.message, 'error'); }
        };
      }
    });
  },

  sendBroadcast() {
    const title = document.getElementById('broadcastTitle').value.trim();
    const body = document.getElementById('broadcastBody').value.trim();
    if (!title || !body) return UI.toast('أدخل العنوان والنص', 'error');
    const clients = DB.getAllClients();
    let sent = 0;
    clients.forEach(c => { DB.addNotification(c.num, title, body); sent++; });
    DB.logAudit('ADMIN_BROADCAST', null, `to=${sent} users`);
    UI.toast(`✅ أُرسلت لـ ${sent} حساب`, 'success');
    document.getElementById('broadcastTitle').value = '';
    document.getElementById('broadcastBody').value = '';
  },

  loadSettings() {
    document.getElementById('setPrice').value = DB.getSettings().month_price || 0;
    const r = DB.getRates();
    document.getElementById('setUsd').value = r.usd || 0;
    document.getElementById('setSar').value = r.sar || 0;
  },
  savePrice() {
    DB.updateSettings({ month_price: Number(document.getElementById('setPrice').value) });
    DB.logAudit('ADMIN_PRICE', null, `price=${document.getElementById('setPrice').value}`);
    UI.toast('✅ تم حفظ السعر', 'success');
  },
  saveRates() {
    DB.setRates({ usd: Number(document.getElementById('setUsd').value), sar: Number(document.getElementById('setSar').value) });
    DB.logAudit('ADMIN_RATES', null, `usd=${document.getElementById('setUsd').value},sar=${document.getElementById('setSar').value}`);
    UI.toast('✅ تم حفظ الأسعار', 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());

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
    const pending = DB.pendingSubRequests().length + DB.getPendingClients().length + DB.getDeletionRequests().length;
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
      <div class="card"><h4 class="text-muted">إجمالي الطلبات</h4><div style="font-size:2rem;font-weight:900;color:var(--amber)">${pending}</div></div>
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
    const pClients = DB.getPendingClients();
    document.getElementById('pendingClientsList').innerHTML = pClients.length ? pClients.map(c => `
      <div class="flex-between mb-2" style="padding:10px;border-bottom:1px solid var(--border-2)">
        <div>
          <b>${UI.esc(c.name)}</b> (${c.num})<br>
          <small class="text-muted">📧 ${UI.esc(c.email)}</small>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-primary" onclick="Admin.approveReg(${c.num})">✅ موافقة</button>
          <button class="btn btn-sm btn-danger" onclick="Admin.rejectReg(${c.num})">❌ رفض</button>
        </div>
      </div>`).join('') : '<p class="text-muted">لا طلبات تسجيل حالياً</p>';

    const dRequests = DB.getDeletionRequests();
    document.getElementById('deletionRequestsList').innerHTML = dRequests.length ? dRequests.map(c => `
      <div class="flex-between mb-2" style="padding:10px;border-bottom:1px solid var(--border-2); background: rgba(239,68,68,0.05)">
        <div>
          <b style="color:var(--danger)">${UI.esc(c.name)}</b> (${c.num})<br>
          <small class="text-muted">طلب حذف حساب</small>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-danger" onclick="Admin.approveDel(${c.num})">🗑️ حذف نهائي</button>
          <button class="btn btn-sm btn-success" onclick="Admin.rejectDel(${c.num})">♻️ استرداد</button>
        </div>
      </div>`).join('') : '<p class="text-muted">لا طلبات حذف حالياً</p>';

    const reqs = DB.pendingSubRequests();
    document.getElementById('pendingList').innerHTML = reqs.length ? reqs.map(r => {
      const c = DB.findClient(r.client_num);
      const isAi = r.type === 'ai';
      const color = isAi ? '#3B82F6' : 'var(--amber)';
      const label = isAi ? '🤖 بوت' : '📄 نظام';
      return `<div class="flex-between mb-2" style="padding:10px;border-bottom:1px solid var(--border-2); background: ${isAi ? 'rgba(59,130,246,0.1)' : 'transparent'}">
        <div><b>${c ? UI.esc(c.name) : 'غير معروف'}</b> (${r.client_num}) - <span style="color:${color}">${label}</span> - ${r.months} شهر - ${UI.fmtNum(r.amount)}
        ${r.note ? `<br><small class="text-muted">📝 ${UI.esc(r.note)}</small>` : ''}</div>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-primary" style="background:${color}" onclick="Admin.approve(${r.req_id})">✅ تفعيل</button>
          <button class="btn btn-sm btn-danger" onclick="Admin.reject(${r.req_id})">❌ رفض</button>
        </div>
      </div>`;
    }).join('') : '<p class="text-muted">لا طلبات تجديد معلقة</p>';
  },

  approveReg(num) {
    try { DB.approvePendingClient(num); UI.toast('✅ تم قبول الحساب وتفعيله', 'success'); this.render(); }
    catch(e) { UI.toast(e.message, 'error'); }
  },
  rejectReg(num) {
    UI.confirm({ title: 'رفض التسجيل', message: 'هل تريد رفض طلب التسجيل هذا؟', danger: true, onConfirm: () => {
      DB.rejectPendingClient(num); UI.toast('تم رفض الطلب', 'success'); this.render();
    }});
  },
  approveDel(num) {
    UI.confirm({ title: 'حذف نهائي', message: 'تحذير: سيتم حذف جميع بيانات هذا العميل نهائياً من السحابة!', danger: true, onConfirm: () => {
      DB.approveDeletion(num); UI.toast('🗑️ تم حذف الحساب نهائياً', 'success'); this.render();
    }});
  },
  rejectDel(num) {
    try { DB.rejectDeletion(num); UI.toast('♻️ تم استرداد الحساب بنجاح', 'success'); this.render(); }
    catch(e) { UI.toast(e.message, 'error'); }
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
    try {
      const req = DB.getSubRequests().find(r => r.req_id === id);
      if(req && req.type === 'ai') {
         DB.grantAiSubscription(req.client_num, { months: req.months });
         const c = DB.findClient(req.client_num);
         DB.updateClient(req.client_num, { money: (c.money || 0) + req.amount });
         
         const reqs = DB.getSubRequests();
         const idx = reqs.findIndex(r => r.req_id === Number(id));
         if(idx > -1) {
           reqs[idx].status = 'APPROVED';
           reqs[idx].decided_at = DB.now();
           reqs[idx].decided_by = this.client.num;
           DB.set('sub_requests', reqs);
           DB.cloudSync('sub_requests', id, reqs[idx]);
         }
         DB.addNotification(req.client_num, '✅ تم تفعيل اشتراك البوت', `تم تفعيل اشتراك المحلل الذكي لمدة ${req.months} شهر.`, 'blue');
      } else {
         DB.approveSubRequest(id, this.client.num); 
      }
      UI.toast('✅ تم التفعيل', 'success'); this.render();
    }
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
          
          <button class="btn btn-outline" data-act="ai_extend" style="border-color: #3B82F6; color: #3B82F6;">🤖 تمديد بوت</button>
          <button class="btn btn-outline" data-act="ai_reset" style="border-color: #3B82F6; color: #3B82F6;">🚫 تصفير بوت</button>
          
          <button class="btn btn-outline" data-act="check" style="grid-column:span 2; border-color: var(--success); color: var(--success)">🔍 فحص اشتراك العميل</button>
<!-- ✅ الزر الجديد هنا -->
          <button class="btn btn-outline" data-act="settle" style="grid-column:span 2; border-color: #10B981; color: #10B981;">💵 تسديد المتبقي</button>
          <button class="btn btn-outline" data-act="contact" style="grid-column:span 2; border-color: #3B82F6; color: #3B82F6;">📞 التواصل مع العميل</button>

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
            else if (act === 'ai_extend') this.extendAi(num);
            else if (act === 'ai_reset') this.resetAi(num);
            else if (act === 'contact') this.contactClient(num);
            else if (act === 'reset') this.resetUser(num);
            else if (act === 'delete') this.deleteUser(num);
            else if (act === 'check') this.checkClientDetails(num);
            else if (act === 'settle') this.settlePayment(num);
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
            DB.addNotification(num, '✅ تمديد اشتراك', `تم تمديد اشتراكك بمقدار ${v} ${unit}.`, 'green');
            UI.toast('✅ تم التمديد', 'success'); close(); this.render();
          } catch(e) { UI.toast(e.message, 'error'); }
        };
      }
    });
  },

  extendAi(num) {
    UI.modal({
      title: 'تمديد اشتراك المحلل الذكي',
      content: `
        <div class="form-group"><label class="form-label">عدد الأشهر</label>
          <input class="form-input" type="number" id="extAiMonths" value="1" min="1"></div>
        <button class="btn btn-primary btn-block" id="btnExtAi" style="background:#3B82F6; border-color:#3B82F6">تمديد البوت</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnExtAi').onclick = () => {
          const v = Number(el.querySelector('#extAiMonths').value);
          if (v <= 0) return UI.toast('أدخل عدداً صحيحاً', 'error');
          DB.grantAiSubscription(num, { months: v });
          DB.logAudit('ADMIN_EXTEND_AI', num, `+${v} months`);
          DB.addNotification(num, '🤖 تمديد البوت', `تم تمديد اشتراك المحلل الذكي بمقدار ${v} شهر.`, 'blue');
          UI.toast('✅ تم التمديد', 'success'); close(); this.render();
        };
      }
    });
  },

  resetAi(num) {
    UI.confirm({ title: 'تصفير البوت', message: 'سيتم إيقاف اشتراك البوت فوراً. متابعة؟', danger: true, onConfirm: () => {
      DB.resetAiSubscription(num);
      UI.toast('✅ تم تصفير البوت', 'success'); this.render();
    }});
  },

  contactClient(num) {
    const c = DB.findClient(num);
    if (!c) return;

    UI.modal({
      title: `📞 التواصل مع ${UI.esc(c.name)}`,
      content: `
        <div class="form-group">
          <label class="form-label">نوع الإشعار</label>
          <select class="form-select" id="notifType" style="font-weight:bold; padding:10px;">
            <option value="green" style="color:var(--success)">🟢 أخضر: تنبيه ليس مهم</option>
            <option value="yellow" style="color:var(--amber)">🟡 أصفر: تنبيه لازم قراءته (يمكن يكون مهم)</option>
            <option value="red" style="color:var(--danger)">🔴 أحمر: تنبيه مهم جداً (يجب عليك قراءته)</option>
            <option value="blue" style="color:#3B82F6">🔵 أزرق: إشعار خاص بالبوت/الاشتراكات</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">تفاصيل إضافية (اختياري)</label>
          <textarea class="form-textarea" id="notifMessage" rows="3" placeholder="اكتب رسالتك هنا... سيتم إرسال عنوان 'إشعار من الإدارة' مع النص المختار."></textarea>
        </div>
        <button class="btn btn-primary btn-block" id="btnSendNotif" style="background:#3B82F6; border-color:#3B82F6;">إرسال الإشعار</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnSendNotif').onclick = () => {
          const type = el.querySelector('#notifType').value;
          const customMsg = el.querySelector('#notifMessage').value.trim();
          
          let typeText = '';
          if (type === 'green') typeText = 'تنبيه ليس مهم';
          else if (type === 'yellow') typeText = 'تنبيه لازم قراءته يمكن يكون مهم';
          else if (type === 'red') typeText = 'تنبيه مهم جدا يجب عليك قراءته';
          else if (type === 'blue') typeText = 'إشعار من الإدارة بخصوص البوت';

          let fullBody = typeText;
          if (customMsg) fullBody += `\n\n${customMsg}`;

          DB.addNotification(num, 'إشعار من الإدارة', fullBody, type);
          
          UI.toast('✅ تم إرسال الإشعار للعميل', 'success');
          close();
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
      DB.addNotification(num, '✅ تم تفعيل حسابك', 'حسابك أصبح نشطاً مرة أخرى.', 'green');
    } else {
      DB.addNotification(num, '⛔ تم إيقاف حسابك', 'تواصل مع الإدارة للاستفسار.', 'red');
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
            DB.approvePendingClient(c.num); 
            
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
    clients.forEach(c => { DB.addNotification(c.num, title, body, 'green'); sent++; });
    DB.logAudit('ADMIN_BROADCAST', null, `to=${sent} users`);
    UI.toast(`✅ أُرسلت لـ ${sent} حساب`, 'success');
    document.getElementById('broadcastTitle').value = '';
    document.getElementById('broadcastBody').value = '';
  },





  checkClientDetails(num) {
  try {
    const c = DB.findClient(num);
    if (!c) return alert('العميل غير موجود في الذاكرة المحلية. جرب تحديث الصفحة.');

    const sysSub = DB.subscriptionStatus(c);
    const isSysFree = (c.money === 0 || !c.money) && c.subscription_months <= 1;
    
    const aiSub = DB.getAiSubscriptionStatus(c);
    const isAiFree = c.ai_trial_used && c.ai_subscription_months <= 1;

    // حساب المساحة
    let totalBytes = 0;
    const keysToCheck = ['products', 'shop_customers', 'shop_debts', 'cash_sales', 'network_sales', 'personal_expenses', 'personal_income', 'personal_debts'];
    keysToCheck.forEach(k => {
       const data = DB.get(k, []).filter(x => Number(x.client_num) === Number(num));
       try { totalBytes += new Blob([JSON.stringify(data)]).size; } catch(e) {}
    });
    const sizeStr = totalBytes < 1024 ? totalBytes + ' بايت' : (totalBytes / 1024).toFixed(1) + ' كيلوبايت';

    const monthsSinceCreation = Math.floor(DB.daysBetween(c.created_at || DB.now(), DB.now()) / 30) || 1;

    const allLogs = DB.get('audit_log', []);
    const userLogins = allLogs.filter(l => Number(l.client_num) === Number(num) && l.action === 'LOGIN');
    userLogins.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const lastVisit = userLogins.length ? userLogins[0].created_at : (c.created_at || DB.now());

    const subs = DB.getSubRequests().filter(r => Number(r.client_num) === Number(num) && r.status === 'APPROVED');
    const sysSubs = subs.filter(s => s.type !== 'ai');
    const aiSubs = subs.filter(s => s.type === 'ai');

    // ✅ الحساب التاريخي الشامل (تجربة + مدفوع + تمديدات)
    let totalSysMonths = 0;
    sysSubs.forEach(r => totalSysMonths += Number(r.months));
    const sysExts = allLogs.filter(l => Number(l.client_num) === Number(num) && l.action === 'ADMIN_EXTEND' && l.details.includes('months'));
    sysExts.forEach(l => {
        const m = l.details.match(/\+(\d+)\s+months/);
        if (m) totalSysMonths += Number(m[1]);
    });
    if (totalSysMonths === 0) totalSysMonths = Number(c.subscription_months) || 1;

    let totalAiMonths = c.ai_trial_used ? 1 : 0;
    aiSubs.forEach(r => totalAiMonths += Number(r.months));
    const aiExts = allLogs.filter(l => Number(l.client_num) === Number(num) && l.action === 'ADMIN_EXTEND_AI');
    aiExts.forEach(l => {
        const m = l.details.match(/\+(\d+)\s+months/);
        if (m) totalAiMonths += Number(m[1]);
    });
    if (totalAiMonths === 0) totalAiMonths = Number(c.ai_subscription_months) || (c.ai_trial_used ? 1 : 0);

    const firstSysSub = sysSubs.length ? sysSubs[0].created_at : (c.start_date || c.created_at);
    const lastSysSub = sysSubs.length ? sysSubs[sysSubs.length - 1].created_at : (c.created_at || DB.now());
    
    const firstAiSub = aiSubs.length ? aiSubs[0].created_at : (c.ai_expiry_date ? c.created_at : null);
    const lastAiSub = aiSubs.length ? aiSubs[aiSubs.length - 1].created_at : (c.ai_expiry_date ? c.created_at : null);

    let totalAiPaid = 0;
    aiSubs.forEach(s => totalAiPaid += Number(s.amount));
    if (!totalAiPaid && c.ai_subscription_months > 0 && !isAiFree) totalAiPaid = c.ai_subscription_months * (DB.getSettings().ai_month_price || 0);

    const sysMonthPrice = DB.getSettings().month_price || 0;
    const aiMonthPrice = DB.getSettings().ai_month_price || 0;
    
    let sysRemainingMoney = 0;
    if (sysSub.ok && sysSub.days !== null) sysRemainingMoney = (sysSub.days / 30) * sysMonthPrice;
    
    let aiRemainingMoney = 0;
    if (aiSub.ok && aiSub.days !== null) aiRemainingMoney = (aiSub.days / 30) * aiMonthPrice;

    const daysSinceVisit = DB.daysBetween(lastVisit, DB.now());
    let activityColor = 'var(--success)'; 
    let activityText = 'نشط (خلال 24 ساعة)';
    
    if (daysSinceVisit > 30) { activityColor = 'var(--danger)'; activityText = 'خامل (أكثر من شهر)'; }
    else if (daysSinceVisit > 14) { activityColor = '#F97316'; activityText = 'شبه خامل (أسبوعين)'; }
    else if (daysSinceVisit > 7) { activityColor = 'var(--amber)'; activityText = 'متوسط (أسبوع)'; }

    UI.modal({
      title: `🔍 تقرير شامل: ${UI.esc(c.name)}`,
      content: `
        <div class="card mb-3" style="background:var(--bg-3); border: 1px solid var(--border-2); padding: 15px;">
          <div class="flex-between mb-2">
            <h4 class="text-amber mb-0">📄 اشتراك النظام</h4>
            <span class="badge ${isSysFree ? 'badge-warn' : 'badge-success'}">${isSysFree ? 'مجاني' : 'مدفوع'}</span>
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem;">
            <div><b>إجمالي المدفوع:</b> <span style="color:var(--success)">${UI.fmtNum(c.money || 0)}</span></div>
            <div><b>المتبقي المالي:</b> <span style="color:var(--amber)">${UI.fmtNum(sysRemainingMoney)}</span></div>
            <div><b>أنشأ الحساب:</b> ${UI.fmtDate(c.created_at)}</div>
            <div><b>أول اشتراك:</b> ${UI.fmtDate(firstSysSub)}</div>
            <div><b>آخر اشتراك:</b> ${UI.fmtDate(lastSysSub)}</div>
            
            <!-- ✅ السطر الذي طلبته: إجمالي الأشهر الشامل -->
            <div style="grid-column: span 2; padding: 10px; background: rgba(59,130,246,0.1); border-radius: 8px; text-align:center; margin-top:5px;">
              <span style="font-size:1rem; font-weight:bold;">إجمالي أشهر الاشتراك منذ الإنشاء: </span>
              <span style="color:var(--info); font-weight:900; font-size:1.3rem;">${totalSysMonths} شهر</span>
              <div style="font-size:0.8rem; color:var(--text-2);">(شامل التجربة والتمديدات)</div>
            </div>

            <div style="grid-column: span 2;"><b>الوقت المتبقي الحالي:</b> <span style="color:${sysSub.ok ? 'var(--success)' : 'var(--danger)'}">${UI.fmtRemaining(c.expiry_date)}</span></div>
            <div style="grid-column: span 2;"><b>مدة عضويته كعميل:</b> ${monthsSinceCreation} شهر</div>
          </div>
        </div>

        <div class="card mb-3" style="background:var(--bg-3); border: 1px solid #3B82F6; padding: 15px;">
          <div class="flex-between mb-2">
            <h4 style="color:#60A5FA" class="mb-0">🤖 اشتراك المحلل الذكي</h4>
            <span class="badge ${isAiFree ? 'badge-warn' : (c.ai_expiry_date ? 'badge-success' : 'badge-danger')}">${isAiFree ? 'مجاني (تجربة)' : (c.ai_expiry_date ? 'مدفوع' : 'غير مشترك')}</span>
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem;">
            <div><b>إجمالي المدفوع:</b> <span style="color:var(--success)">${UI.fmtNum(totalAiPaid)}</span></div>
            <div><b>المتبقي المالي:</b> <span style="color:var(--amber)">${UI.fmtNum(aiRemainingMoney)}</span></div>
            <div><b>أول اشتراك:</b> ${firstAiSub ? UI.fmtDate(firstAiSub) : 'لا يوجد'}</div>
            <div><b>آخر اشتراك:</b> ${lastAiSub ? UI.fmtDate(lastAiSub) : 'لا يوجد'}</div>
            
            <!-- ✅ السطر الذي طلبته للبوت -->
            <div style="grid-column: span 2; padding: 10px; background: rgba(59,130,246,0.1); border-radius: 8px; text-align:center; margin-top:5px;">
              <span style="font-size:1rem; font-weight:bold;">إجمالي أشهر البوت منذ الإنشاء: </span>
              <span style="color:#60A5FA; font-weight:900; font-size:1.3rem;">${totalAiMonths} شهر</span>
              <div style="font-size:0.8rem; color:var(--text-2);">(شامل التجربة والتمديدات)</div>
            </div>

            <div style="grid-column: span 2;"><b>الوقت المتبقي الحالي:</b> <span style="color:${aiSub.ok ? '#60A5FA' : 'var(--danger)'}">${c.ai_expiry_date ? UI.fmtRemaining(c.ai_expiry_date) : 'غير مشترك'}</span></div>
          </div>
        </div>

        <div class="card" style="background:var(--bg-3); padding: 15px;">
          <h4 class="text-amber mb-3" style="font-size:1.05rem;">📊 إحصائيات الاستخدام</h4>
          <div class="flex-between mb-2">
            <span>مساحة التخزين المستهلكة:</span>
            <b>${sizeStr}</b>
          </div>
          <div class="flex-between mb-2">
            <span>آخر زيارة للموقع:</span>
            <b>${UI.fmtDateTime(lastVisit)}</b>
          </div>
          <div class="flex-between mt-3" style="padding-top: 10px; border-top: 1px dashed var(--border-2);">
            <span>حالة النشاط:</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.85rem; color:${activityColor};">${activityText}</span>
              <div style="width: 16px; height: 16px; border-radius: 50%; background: ${activityColor}; box-shadow: 0 0 10px ${activityColor};"></div>
            </div>
          </div>
        </div>
      `,
      onOpen: (el) => { el.style.maxWidth = '550px'; }
    });
    
  } catch (error) {
    alert("❌ حدث خطأ أثناء عرض البيانات: " + error.message);
    console.error(error);
  }
},

  settlePayment(num) {
  const c = DB.findClient(num);
  if (!c) return;

  const sysSub = DB.subscriptionStatus(c);
  const aiSub = DB.getAiSubscriptionStatus(c);
  
  const sysMonthPrice = DB.getSettings().month_price || 0;
  const aiMonthPrice = DB.getSettings().ai_month_price || 0;

  // حساب المتبقي الحالي
  let sysRemaining = 0;
  if (sysSub.ok && sysSub.days !== null) sysRemaining = Math.max(0, (sysSub.days / 30) * sysMonthPrice);
  
  let aiRemaining = 0;
  if (aiSub.ok && aiSub.days !== null) aiRemaining = Math.max(0, (aiSub.days / 30) * aiMonthPrice);

  UI.modal({
    title: `💵 تسديد اشتراكات: ${UI.esc(c.name)}`,
    content: `
      <div class="card mb-3" style="background:var(--bg-3); padding:15px;">
        <h4 class="text-amber mb-2">📄 اشتراك النظام</h4>
        <div class="flex-between mb-2"><span>المتبقي الحالي:</span><b style="color:var(--danger)">${UI.fmtNum(sysRemaining)}</b></div>
        <div class="form-group">
          <label class="form-label">المبلغ المسدد (النظام)</label>
          <input class="form-input" type="number" id="sysPayAmount" placeholder="أدخل المبلغ..." value="${sysRemaining}">
        </div>
        <button class="btn btn-primary btn-block" onclick="Admin.doSettle(${num}, 'sys')">تسديد النظام</button>
      </div>

      <div class="card" style="background:var(--bg-3); padding:15px; border: 1px solid #3B82F6;">
        <h4 style="color:#60A5FA" class="mb-2">🤖 اشتراك البوت</h4>
        <div class="flex-between mb-2"><span>المتبقي الحالي:</span><b style="color:var(--danger)">${UI.fmtNum(aiRemaining)}</b></div>
        <div class="form-group">
          <label class="form-label">المبلغ المسدد (البوت)</label>
          <input class="form-input" type="number" id="aiPayAmount" placeholder="أدخل المبلغ..." value="${aiRemaining}">
        </div>
        <button class="btn btn-primary btn-block" onclick="Admin.doSettle(${num}, 'ai')" style="background:#3B82F6; border-color:#3B82F6">تسديد البوت</button>
      </div>
    `,
    onOpen: (el) => el.style.maxWidth = '450px'
  });
},

doSettle(num, type) {
  const c = DB.findClient(num);
  if (!c) return;
  
  let amount = 0;
  if (type === 'sys') {
    amount = Number(document.getElementById('sysPayAmount').value);
    if (amount <= 0) return UI.toast('أدخل مبلغاً صحيحاً', 'error');
    
    // تحديث إجمالي المدفوعات للنظام
    DB.updateClient(num, { money: (c.money || 0) + amount });
    
  } else {
    amount = Number(document.getElementById('aiPayAmount').value);
    if (amount <= 0) return UI.toast('أدخل مبلغاً صحيحاً', 'error');
    
    // تحديث مدفوعات البوت (سنحفظها في حقل جديد ai_money)
    DB.updateClient(num, { ai_money: (c.ai_money || 0) + amount });
  }

  // تسجيل العملية في سجل الرقابة
  DB.logAudit('MANUAL_PAYMENT', num, `تم تسديد ${amount} للنظام/البوت (${type})`);
  
  // إرسال إشعار للعميل
  DB.addNotification(num, '💵 تم استلام دفعة', `تم تسجيل دفعة بمبلغ ${UI.fmtNum(amount)} لحسابك.`, 'green');

  UI.toast('✅ تم تسجيل الدفعة بنجاح', 'success');
  document.getElementById('ft-modal').remove();
  this.render(); // تحديث الجدول
},
  

  showMassResetMenu() {
    UI.modal({
      title: '⚠️ تصفير الاشتراكات المجانية',
      content: `
        <p class="mb-4">اختر نوع الاشتراك الذي تريد تصفيره:</p>
        <div class="flex gap-2" style="flex-direction: column;">
          <button class="btn btn-primary btn-block" onclick="Admin.massReset('ai')" style="background:#3B82F6; color:white;">🤖 تصفير اشتراكات البوت المجانية</button>
          <button class="btn btn-primary btn-block" onclick="Admin.massReset('main')" style="background:#F59E0B; color:white;">📄 تصفير اشتراكات النظام المجانية</button>
        </div>
      `
    });
  },

  massReset(type) {
    const typeName = type === 'main' ? 'النظام' : 'البوت';
    const color = type === 'main' ? '#F59E0B' : '#3B82F6';
    const allClients = DB.getAllClients();
    
    const freeClients = allClients.filter(c => {
      if (type === 'main') {
        return c.subscription_months <= 1 && (c.money === 0 || !c.money);
      } else {
        return c.ai_trial_used === true && c.ai_subscription_months <= 1;
      }
    });

    if (freeClients.length === 0) {
      return UI.modal({ title: 'تنبيه', content: '<p class="text-center text-muted">لا يوجد مشتركون مجانيون لتصفيرهم حالياً.</p>' });
    }
    
    let listHtml = freeClients.map(c => `
      <label style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid var(--border-2); cursor:pointer;" class="client-row" data-search="${UI.esc(c.name)} ${c.num}">
        <input type="checkbox" class="exclude-check" value="${c.num}" style="width:20px; height:20px;">
        <div>
          <b>${UI.esc(c.name)}</b> (${c.num})
          <div style="font-size:0.8rem; color:var(--text-3)">${c.account_type || 'غير محدد'}</div>
        </div>
      </label>
    `).join('');

    UI.modal({
      title: `⚠️ تصفير ${typeName} المجاني`,
      content: `
        <p class="text-muted mb-2">سيتم تصفير جميع الحسابات المجانية <b>ما عدا</b> الذين تضع عليهم علامة (صح).</p>
        <div class="form-group">
          <input type="text" class="form-input" id="massResetSearch" placeholder="🔍 ابحث بالاسم أو الرقم..." oninput="Admin.filterMassReset(this.value)">
        </div>
        <div style="max-height: 300px; overflow-y: auto; border:1px solid var(--border); border-radius:8px; margin-bottom:20px;" id="massResetList">
          ${listHtml}
        </div>
        <button class="btn btn-danger btn-block" onclick="Admin.confirmMassReset('${type}')" style="background:${color}; color:#fff; border:none;">تأكيد التصفير</button>
      `,
      onOpen: (el) => el.style.maxWidth = '500px'
    });
  },

  showDeleteOldInvoicesMenu() {
    UI.modal({
      title: '🗑️ حذف الفواتير القديمة (جميع العملاء)',
      content: `
        <p class="mb-4 text-muted">اختر الفترة الزمنية لحذف الفواتير الأقدم منها لجميع العملاء:</p>
        <div class="flex gap-2" style="flex-direction: column;">
          <button class="btn btn-block" onclick="Admin.confirmDeleteOldInvoices('30d')" style="background:#10B981; color:white; font-weight:bold;">🟢 حذف الفواتير الأقدم من شهر</button>
          <button class="btn btn-block" onclick="Admin.confirmDeleteOldInvoices('7d')" style="background:#F59E0B; color:white; font-weight:bold;">🟡 حذف الفواتير الأقدم من أسبوع</button>
          <button class="btn btn-block" onclick="Admin.confirmDeleteOldInvoices('24h')" style="background:#EF4444; color:white; font-weight:bold;">🔴 حذف الفواتير الأقدم من 24 ساعة</button>
        </div>
      `
    });
  },

  confirmDeleteOldInvoices(timeframe) {
    const label = timeframe === '30d' ? 'شهر' : timeframe === '7d' ? 'أسبوع' : '24 ساعة';
    UI.confirm({
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف جميع الفواتير الأقدم من ${label} لجميع العملاء؟ لا يمكن التراجع!`,
      danger: true,
      onConfirm: () => {
        const count = DB.deleteOldInvoices(timeframe, true, null);
        UI.toast(`🗑️ تم حذف ${count} فاتورة بنجاح`, 'success');
        document.getElementById('ft-modal').remove();
        this.render();
      }
    });
  },

  filterMassReset(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.client-row').forEach(row => {
      const searchText = row.getAttribute('data-search').toLowerCase();
      row.style.display = searchText.includes(q) ? 'flex' : 'none';
    });
  },

  confirmMassReset(type) {
    const excludeNums = [];
    document.querySelectorAll('.exclude-check:checked').forEach(cb => {
      excludeNums.push(Number(cb.value));
    });

    UI.confirm({
      title: 'تأكيد نهائي',
      message: `هل أنت متأكد من تصفير اشتراكات ${type === 'main' ? 'النظام' : 'البوت'} المجانية؟ (سيتم استثناء ${excludeNums.length} حساب)`,
      danger: true,
      onConfirm: () => {
        DB.massResetFree(type, excludeNums);
        UI.toast('✅ تم التصفير بنجاح', 'success');
        document.getElementById('ft-modal').remove();
        this.render();
      }
    });
  },

  loadSettings() {
    document.getElementById('setPrice').value = DB.getSettings().month_price || 0;
    document.getElementById('setAiPrice').value = DB.getSettings().ai_month_price || 0;
    const r = DB.getRates();
    document.getElementById('setUsd').value = r.usd || 0;
    document.getElementById('setSar').value = r.sar || 0;
  },
  savePrice() {
    DB.updateSettings({ 
      month_price: Number(document.getElementById('setPrice').value),
      ai_month_price: Number(document.getElementById('setAiPrice').value)
    });
    DB.logAudit('ADMIN_PRICE', null, `price=${document.getElementById('setPrice').value}, ai_price=${document.getElementById('setAiPrice').value}`);
    UI.toast('✅ تم حفظ الأسعار', 'success');
  },
  saveRates() {
    DB.setRates({ usd: Number(document.getElementById('setUsd').value), sar: Number(document.getElementById('setSar').value) });
    DB.logAudit('ADMIN_RATES', null, `usd=${document.getElementById('setUsd').value},sar=${document.getElementById('setSar').value}`);
    UI.toast('✅ تم حفظ الأسعار', 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());

const Personal = {
  client: null,
  init() {
    this.client = UI.requireLogin();
    if (!this.client || !UI.requireActiveSubscription(this.client)) return;
    document.getElementById('userAvatar').textContent = this.client.name.charAt(0);
    document.getElementById('userName').textContent = this.client.name;
    document.getElementById('userRole').textContent = this.client.account_type || 'مستخدم';
    if (DB.isAdmin(this.client.num) || this.client.is_admin) document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'flex');

    document.querySelectorAll('.tab').forEach(t => t.onclick = (e) => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
      e.currentTarget.classList.add('active');
      document.getElementById('tab-' + e.currentTarget.dataset.tab).classList.add('active');
    });

    this.renderAll();
  },

  renderAll() {
    DB.resetObligationsIfNeeded(this.client.num);
    this.renderExpenses();
    this.renderIncome();
    this.renderWallet();
    this.renderDebts();
    this.renderNotes();
    this.renderGoals();
    this.renderObligations();
    this.renderReport();
  },

  addExpense() {
    const cat = document.getElementById('expCat').value;
    const amt = UI.parseNum(document.getElementById('expAmt').value);
    const det = document.getElementById('expDetails').value.trim();
    if (amt === null || amt <= 0) return UI.toast('أدخل مبلغاً صحيحاً', 'error');
    DB.expenses.create({ client_num: this.client.num, category: cat, amount: amt, details: det, created_at: DB.now() });
    DB.logAudit('EXPENSE_ADD', this.client.num, `${cat} ${amt}`);
    UI.toast('✅ تم الحفظ', 'success');
    document.getElementById('expAmt').value = ''; document.getElementById('expDetails').value = '';
    this.renderExpenses(); this.renderWallet(); this.renderReport();
  },

  renderExpenses() {
    const all = DB.expenses.list(this.client.num);
    const today = all.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
    const month = all.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth());
    const sumT = today.reduce((s, e) => s + Number(e.amount || 0), 0);
    const sumM = month.reduce((s, e) => s + Number(e.amount || 0), 0);
    document.getElementById('expStats').innerHTML = `<p>اليوم: <b>${UI.fmtNum(sumT)}</b></p><p>الشهر: <b>${UI.fmtNum(sumM)}</b></p>`;
    document.getElementById('expList').innerHTML = all.slice(-5).reverse().map(e => `<div class="flex-between" style="padding:6px 0;border-bottom:1px solid var(--border-2)"><span>${UI.esc(e.category)} ${e.details ? '- '+UI.esc(e.details) : ''}</span><b>${UI.fmtNum(e.amount)}</b></div>`).join('');
  },

  addIncome() {
    const src = document.getElementById('incSrc').value.trim();
    const amt = UI.parseNum(document.getElementById('incAmt').value);
    const period = document.getElementById('incPeriod').value;
    const notes = document.getElementById('incNotes') ? document.getElementById('incNotes').value.trim() : '';
    if (!src || amt === null || amt <= 0) return UI.toast('أدخل البيانات', 'error');
    DB.incomes.create({ client_num: this.client.num, source: src, amount: amt, period, notes, created_at: DB.now() });
    DB.logAudit('INCOME_ADD', this.client.num, `${src} ${amt}`);
    UI.toast('✅ تم الحفظ', 'success');
    document.getElementById('incSrc').value = ''; document.getElementById('incAmt').value = '';
    if (document.getElementById('incNotes')) document.getElementById('incNotes').value = '';
    this.renderIncome(); this.renderWallet(); this.renderReport();
  },

  renderIncome() {
    const all = DB.incomes.list(this.client.num);
    const today = all.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString());
    const month = all.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth());
    document.getElementById('incStats').innerHTML = `<p>اليوم: <b>${UI.fmtNum(today.reduce((s, e) => s + Number(e.amount || 0), 0))}</b></p><p>الشهر: <b>${UI.fmtNum(month.reduce((s, e) => s + Number(e.amount || 0), 0))}</b></p>`;
    document.getElementById('incList').innerHTML = all.slice(-5).reverse().map(e => `<div class="flex-between" style="padding:6px 0;border-bottom:1px solid var(--border-2)"><span>${UI.esc(e.source)}</span><b>${UI.fmtNum(e.amount)}</b></div>`).join('');
  },

  renderWallet() {
    const incAll = DB.incomes.list(this.client.num), expAll = DB.expenses.list(this.client.num);
    const sum = (arr, isToday) => arr.filter(e => isToday ? new Date(e.created_at).toDateString() === new Date().toDateString() : new Date(e.created_at).getMonth() === new Date().getMonth()).reduce((s, e) => s + Number(e.amount || 0), 0);
    const iT = sum(incAll, true), eT = sum(expAll, true), iM = sum(incAll, false), eM = sum(expAll, false);
    document.getElementById('walletSummary').innerHTML = `
      <h4 class="text-amber">اليوم:</h4>
      <div class="flex-between"><span>دخل:</span><b>${UI.fmtNum(iT)}</b></div>
      <div class="flex-between"><span>مصاريف:</span><b>${UI.fmtNum(eT)}</b></div>
      <div class="flex-between" style="color:var(--amber);font-weight:900;margin-top:8px"><span>الصافي:</span><span>${UI.fmtNum(iT-eT)}</span></div>
      <hr style="border-color:var(--border);margin:16px 0">
      <h4 class="text-amber">الشهر:</h4>
      <div class="flex-between"><span>دخل:</span><b>${UI.fmtNum(iM)}</b></div>
      <div class="flex-between"><span>مصاريف:</span><b>${UI.fmtNum(eM)}</b></div>
      <div class="flex-between" style="color:var(--amber);font-weight:900;margin-top:8px"><span>الصافي:</span><span>${UI.fmtNum(iM-eM)}</span></div>`;
  },

  addDebt(dir) {
    UI.modal({
      title: dir === 'for_me' ? 'دين لي' : 'دين عليّ',
      content: `<div class="form-group"><label class="form-label">اسم الشخص</label><input class="form-input" id="dName"></div>
                <div class="form-group"><label class="form-label">الهاتف (اختياري)</label><input class="form-input" id="dPhone"></div>
                <div class="form-group"><label class="form-label">المبلغ</label><input class="form-input" type="number" id="dAmt"></div>
                <div class="form-group"><label class="form-label">السبب</label><input class="form-input" id="dReason"></div>
                <button class="btn btn-primary btn-block" id="btnSaveD">حفظ</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnSaveD').onclick = () => {
          const name = el.querySelector('#dName').value.trim(), amt = UI.parseNum(el.querySelector('#dAmt').value);
          if (!name || amt === null || amt <= 0) return UI.toast('أدخل البيانات', 'error');
          DB.pdebts.create({ client_num: this.client.num, direction: dir, person_name: name, person_phone: el.querySelector('#dPhone').value, amount: amt, paid_amount: 0, reason: el.querySelector('#dReason').value, created_at: DB.now(), last_update: DB.now() });
          DB.logAudit('PDEBT_ADD', this.client.num, `${dir} ${name} ${amt}`);
          UI.toast('✅ تم الحفظ (دمج تلقائي عند التطابق)', 'success'); close(); this.renderDebts(); this.renderReport();
        };
      }
    });
  },

  renderDebts() {
    const all = DB.pdebts.list(this.client.num);
    const build = (dir) => {
      const rows = all.filter(d => d.direction === dir);
      if (!rows.length) return '<p class="text-muted">لا سجلات</p>';
      return rows.map(d => {
        const remain = Number(d.amount || 0) - Number(d.paid_amount || 0);
        const waBtn = d.person_phone ? `<button class="icon-btn" style="width:32px;height:32px;color:#25D366" onclick="Personal.waDebt(${d.pdebt_id})" title="واتساب"><i data-lucide="message-circle"></i></button>` : '';
        return `
        <div class="flex-between mb-2" style="padding:8px;background:var(--bg-3);border-radius:8px">
          <div style="min-width:0;flex:1"><b>${UI.esc(d.person_name)}</b><br><small>أصل: ${UI.fmtNum(d.amount)} | مسدد: ${UI.fmtNum(d.paid_amount || 0)}</small></div>
          <div style="color:var(--danger);font-weight:700;margin:0 6px">${UI.fmtNum(remain)}</div>
          <div style="display:flex;gap:4px">
            <button class="icon-btn" style="width:32px;height:32px" onclick="Personal.payDebt(${d.pdebt_id}, ${remain})" title="تسديد"><i data-lucide="hand-coins"></i></button>
            ${waBtn}
            <button class="icon-btn" style="width:32px;height:32px;color:var(--danger)" onclick="Personal.deleteDebt(${d.pdebt_id})" title="حذف"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
      }).join('');
    };
    document.getElementById('debtsForMe').innerHTML = build('for_me');
    document.getElementById('debtsOnMe').innerHTML = build('on_me');
    UI.fixIcons();
  },

  payDebt(id, remain) {
    UI.modal({
      title: 'تسديد دفعة',
      content: `<div class="form-group"><label class="form-label">المبلغ (المتبقي: ${UI.fmtNum(remain)})</label><input class="form-input" type="number" id="payAmt" value="${remain}" max="${remain}"></div>
                <div class="form-group"><label class="form-label">ملاحظة (اختياري)</label><input class="form-input" id="payNote"></div>
                <button class="btn btn-primary btn-block" id="btnPay">تأكيد</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnPay').onclick = () => {
          const v = UI.parseNum(el.querySelector('#payAmt').value);
          const note = el.querySelector('#payNote').value.trim();
          if (v === null || v <= 0) return UI.toast('أدخل مبلغاً', 'error');
          const d = DB.pdebts.list(this.client.num).find(x => x.pdebt_id === id);
          if (!d) return UI.toast('الدين غير موجود', 'error');
          const rem = Number(d.amount || 0) - Number(d.paid_amount || 0);
          const pay = Math.min(v, rem);
          DB.pdebts.update(id, { paid_amount: Number(d.paid_amount || 0) + pay });
          DB.recordDebtPayment(id, this.client.num, pay, note);
          DB.logAudit('PDEBT_PAY', this.client.num, `id=${id} amount=${pay}`);
          UI.toast('✅ تم التسديد', 'success');
          close(); this.renderDebts(); this.renderReport();
        };
      }
    });
  },

  deleteDebt(id) {
    UI.confirm({
      title: 'حذف الدين',
      message: 'هل تريد حذف هذا الدين نهائياً؟',
      danger: true,
      onConfirm: () => {
        DB.pdebts.delete(id, this.client.num);
        DB.logAudit('PDEBT_DEL', this.client.num, `id=${id}`);
        UI.toast('✅ تم الحذف', 'success');
        this.renderDebts(); this.renderReport();
      }
    });
  },

  waDebt(id) {
    const d = DB.pdebts.list(this.client.num).find(x => x.pdebt_id === id);
    if (!d) return UI.toast('الدين غير موجود', 'error');
    if (!d.person_phone) return UI.toast('لا يوجد رقم هاتف', 'error');
    const u = UI.unitOf(this.client);
    const remain = Number(d.amount || 0) - Number(d.paid_amount || 0);
    let msg;
    if (d.direction === 'for_me') {
      msg = `مرحباً ${d.person_name}،\nتذكير: المبلغ المتبقي ${UI.fmtNum(remain)} ${u}\nشكراً 🌹`;
    } else {
      msg = `مرحباً ${d.person_name}،\nكشف حسابي:\nأصل: ${UI.fmtNum(d.amount)} ${u}\nمسدد: ${UI.fmtNum(d.paid_amount || 0)} ${u}\nمتبقي: ${UI.fmtNum(remain)} ${u}\nشكراً 🌹`;
    }
    let digits = String(d.person_phone).replace(/\D/g, '');
    if (digits.startsWith('7') && digits.length === 9) digits = '967' + digits;
    else if (!/^[1-9]/.test(digits)) digits = '967' + digits;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  addNote() {
    UI.modal({
      title: 'مذكرة جديدة',
      content: `<div class="form-group"><label class="form-label">العنوان</label><input class="form-input" id="nTitle"></div>
                <div class="form-group"><label class="form-label">المحتوى</label><textarea class="form-textarea" id="nContent" rows="4"></textarea></div>
                <button class="btn btn-primary btn-block" id="btnSaveN">حفظ</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnSaveN').onclick = () => {
          const t = el.querySelector('#nTitle').value.trim();
          if (!t) return UI.toast('أدخل العنوان', 'error');
          DB.notes.create({ client_num: this.client.num, title: t, content: el.querySelector('#nContent').value, created_at: DB.now() });
          DB.logAudit('NOTE_ADD', this.client.num, t);
          UI.toast('✅ تم الحفظ', 'success'); close(); this.renderNotes(); this.renderReport();
        };
      }
    });
  },

  renderNotes() {
    const notes = DB.notes.list(this.client.num);
    document.getElementById('notesList').innerHTML = notes.length ? notes.map(n => `
      <div class="card mb-2" style="padding:16px">
        <div class="flex-between"><h4 style="color:var(--amber)">${UI.esc(n.title)}</h4>
        <button class="icon-btn" style="width:32px;height:32px;color:var(--danger)" onclick="DB.notes.delete(${n.note_id}, ${this.client.num}); Personal.renderNotes(); Personal.renderReport();"><i data-lucide="trash-2"></i></button></div>
        <p class="text-muted">${UI.esc(n.content || '')}</p>
      </div>`).join('') : '<p class="text-muted">لا مذكرات</p>';
    UI.fixIcons();
  },

  addGoal() {
    UI.modal({
      title: 'هدف ادخار',
      content: `<div class="form-group"><label class="form-label">اسم الهدف</label><input class="form-input" id="gName"></div>
                <div class="form-group"><label class="form-label">المبلغ المستهدف</label><input class="form-input" type="number" id="gTarget"></div>
                <button class="btn btn-primary btn-block" id="btnSaveG">حفظ</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnSaveG').onclick = () => {
          const n = el.querySelector('#gName').value.trim(), t = UI.parseNum(el.querySelector('#gTarget').value);
          if (!n || t === null || t <= 0) return UI.toast('أدخل البيانات', 'error');
          DB.goals.create({ client_num: this.client.num, name: n, target_amount: t, saved_amount: 0, created_at: DB.now() });
          DB.logAudit('GOAL_ADD', this.client.num, n);
          UI.toast('✅ تم الحفظ', 'success'); close(); this.renderGoals(); this.renderReport();
        };
      }
    });
  },

  renderGoals() {
    const goals = DB.goals.list(this.client.num);
    document.getElementById('goalsList').innerHTML = goals.length ? goals.map(g => {
      const saved = Number(g.saved_amount || 0), target = Number(g.target_amount || 0);
      const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
      return `<div class="card">
        <div class="flex-between mb-2">
          <h4 class="text-amber mb-0">${UI.esc(g.name)}</h4>
          <button class="icon-btn" style="width:32px;height:32px;color:var(--danger)" onclick="Personal.deleteGoal(${g.goal_id})" title="حذف"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="flex-between mb-1"><span>جمعت: ${UI.fmtNum(saved)}</span><span>الهدف: ${UI.fmtNum(target)}</span></div>
        <div style="background:var(--bg-3);height:8px;border-radius:4px;overflow:hidden"><div style="background:var(--amber);height:100%;width:${pct}%"></div></div>
        <div class="flex gap-2 mt-3">
          <input class="form-input" type="number" placeholder="مبلغ" id="gDep${g.goal_id}" style="flex:1">
          <button class="btn btn-sm btn-primary" onclick="Personal.depGoal(${g.goal_id})">إيداع</button>
        </div>
      </div>`;
    }).join('') : '<p class="text-muted">لا أهداف</p>';
    UI.fixIcons();
  },

  depGoal(id) {
    const v = UI.parseNum(document.getElementById('gDep' + id).value);
    if (v === null || v <= 0) return UI.toast('أدخل مبلغاً', 'error');
    const g = DB.goals.list(this.client.num).find(x => x.goal_id === id);
    if (!g) return UI.toast('الهدف غير موجود', 'error');
    DB.goals.update(id, { saved_amount: Number(g.saved_amount || 0) + v });
    DB.logAudit('GOAL_DEP', this.client.num, `id=${id} amount=${v}`);
    UI.toast('✅ تم الإيداع', 'success'); this.renderGoals(); this.renderReport();
  },

  deleteGoal(id) {
    UI.confirm({
      title: 'حذف الهدف',
      message: 'هل تريد حذف هذا الهدف؟',
      danger: true,
      onConfirm: () => {
        DB.goals.delete(id, this.client.num);
        DB.logAudit('GOAL_DEL', this.client.num, `id=${id}`);
        UI.toast('✅ تم الحذف', 'success');
        this.renderGoals(); this.renderReport();
      }
    });
  },

  addObligation() {
    UI.modal({
      title: 'التزام شهري',
      content: `<div class="form-group"><label class="form-label">الاسم</label><input class="form-input" id="oName"></div>
                <div class="form-group"><label class="form-label">المبلغ</label><input class="form-input" type="number" id="oAmt"></div>
                <div class="form-group"><label class="form-label">يوم السداد</label><input class="form-input" type="number" id="oDay" min="1" max="31" value="1"></div>
                <button class="btn btn-primary btn-block" id="btnSaveO">حفظ</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnSaveO').onclick = () => {
          const n = el.querySelector('#oName').value.trim(), a = UI.parseNum(el.querySelector('#oAmt').value), d = Number(el.querySelector('#oDay').value);
          if (!n || a === null || a <= 0) return UI.toast('أدخل البيانات', 'error');
          DB.obligations.create({ client_num: this.client.num, name: n, amount: a, due_day: d, is_paid_this_month: 0, created_at: DB.now() });
          DB.logAudit('OBL_ADD', this.client.num, n);
          UI.toast('✅ تم الحفظ', 'success'); close(); this.renderObligations(); this.renderReport();
        };
      }
    });
  },

  renderObligations() {
    const obs = DB.obligations.list(this.client.num);
    document.getElementById('oblList').innerHTML = obs.length ? obs.map(o => `
      <div class="flex-between mb-2" style="padding:10px;border-bottom:1px solid var(--border-2)">
        <div style="min-width:0;flex:1"><b>${UI.esc(o.name)}</b> <small class="text-muted">(يوم ${o.due_day})</small></div>
        <div style="color:var(--amber);margin:0 8px">${UI.fmtNum(o.amount)}</div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm ${o.is_paid_this_month ? 'btn-ghost' : 'btn-primary'}" onclick="Personal.toggleObl(${o.obligation_id}, ${o.is_paid_this_month})">
            ${o.is_paid_this_month ? '✅ مسدد' : '⏳ سداد'}
          </button>
          <button class="icon-btn" style="width:32px;height:32px;color:var(--danger)" onclick="Personal.deleteObligation(${o.obligation_id})" title="حذف"><i data-lucide="trash-2"></i></button>
        </div>
      </div>`).join('') : '<p class="text-muted">لا التزامات</p>';
    UI.fixIcons();
  },

  toggleObl(id, current) {
    DB.obligations.update(id, { is_paid_this_month: current ? 0 : 1, last_paid_at: DB.now() });
    this.renderObligations(); this.renderReport();
  },

  deleteObligation(id) {
    UI.confirm({
      title: 'حذف الالتزام',
      message: 'هل تريد حذف هذا الالتزام؟',
      danger: true,
      onConfirm: () => {
        DB.obligations.delete(id, this.client.num);
        UI.toast('✅ تم الحذف', 'success');
        this.renderObligations(); this.renderReport();
      }
    });
  },

  renderReport() {
    const cn = this.client.num, u = UI.unitOf(this.client);
    const monthFilter = e => new Date(e.created_at).getMonth() === new Date().getMonth();
    const incM = DB.incomes.list(cn).filter(monthFilter).reduce((s, e) => s + Number(e.amount || 0), 0);
    const expM = DB.expenses.list(cn).filter(monthFilter).reduce((s, e) => s + Number(e.amount || 0), 0);
    const forMe = DB.pdebts.list(cn).filter(d => d.direction === 'for_me').reduce((s, d) => s + (Number(d.amount || 0) - Number(d.paid_amount || 0)), 0);
    const onMe = DB.pdebts.list(cn).filter(d => d.direction === 'on_me').reduce((s, d) => s + (Number(d.amount || 0) - Number(d.paid_amount || 0)), 0);
    const goalsSaved = DB.goals.list(cn).reduce((s, g) => s + Number(g.saved_amount || 0), 0);
    const goalsTarget = DB.goals.list(cn).reduce((s, g) => s + Number(g.target_amount || 0), 0);
    const oblTotal = DB.obligations.list(cn).reduce((s, o) => s + Number(o.amount || 0), 0);
    const oblPaid = DB.obligations.list(cn).filter(o => o.is_paid_this_month).reduce((s, o) => s + Number(o.amount || 0), 0);
    const topExp = DB.getTopExpenseCategory(cn, true);

    document.getElementById('reportBox').innerHTML = `
      <h4 class="text-amber">💼 الشهر:</h4>
      <div class="flex-between mb-1"><span>الدخل:</span><b>${UI.fmtNum(incM)} ${u}</b></div>
      <div class="flex-between mb-1"><span>المصاريف:</span><b>${UI.fmtNum(expM)} ${u}</b></div>
      ${topExp ? `<div class="flex-between mb-1"><span>🏷 أكثر تصنيف:</span><b>${UI.esc(topExp.category)} (${UI.fmtNum(topExp.total)})</b></div>` : ''}
      <div class="flex-between mb-3" style="color:var(--amber);font-weight:900"><span>الصافي:</span><span>${UI.fmtNum(incM - expM)} ${u}</span></div>
      <h4 class="text-amber">🤝 الديون:</h4>
      <div class="flex-between mb-1"><span>لي (عند الناس):</span><b>${UI.fmtNum(forMe)} ${u}</b></div>
      <div class="flex-between mb-3"><span>عليّ (للناس):</span><b>${UI.fmtNum(onMe)} ${u}</b></div>
      <h4 class="text-amber">🎯 الأهداف:</h4>
      <div class="flex-between mb-3"><span>جمعت:</span><b>${UI.fmtNum(goalsSaved)} / ${UI.fmtNum(goalsTarget)} ${u}</b></div>
      <h4 class="text-amber">🔔 الالتزامات:</h4>
      <div class="flex-between mb-1"><span>الإجمالي:</span><b>${UI.fmtNum(oblTotal)}</b></div>
      <div class="flex-between mb-1"><span>المسدد:</span><b>${UI.fmtNum(oblPaid)}</b></div>
      <div class="flex-between" style="color:var(--danger);font-weight:900"><span>المتبقي:</span><span>${UI.fmtNum(oblTotal - oblPaid)}</span></div>`;
  }
};

document.addEventListener('DOMContentLoaded', () => Personal.init());
const SubPage = {
  client: null,
  init() {
    this.client = UI.requireLogin();
    if (!this.client) return;
    document.getElementById('userAvatar').textContent = this.client.name.charAt(0);
    document.getElementById('userName').textContent = this.client.name;
    if (DB.isAdmin(this.client.num) || this.client.is_admin) document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'flex');
    this.render();
  },
  render() {
    const st = DB.subscriptionStatus(this.client);
    document.getElementById('expiry').textContent = UI.fmtDate(this.client.expiry_date);
    document.getElementById('remain').textContent = st.ok ? st.days + ' يوم' : 'منتهي';
    const badge = document.getElementById('statusBadge');
    if (st.ok) badge.innerHTML = '<span class="badge badge-success">✅ ساري</span>';
    else if (st.blocked) badge.innerHTML = '<span class="badge badge-danger">⛔ موقوف</span>';
    else badge.innerHTML = '<span class="badge badge-warn">❌ منتهي</span>';

    const price = DB.getSettings().month_price || 0;
    let plansHtml = '';
    for (let i = 1; i <= 12; i++) {
      plansHtml += `<div class="card">
        <h4 class="text-amber">${DB.durationLabel(i)}</h4>
        <div style="font-size:1.5rem;font-weight:900">${UI.fmtNum(i * price)} <small class="text-muted">ريال</small></div>
        <button class="btn btn-primary btn-block mt-3" onclick="SubPage.requestRenew(${i})">تجديد</button>
      </div>`;
    }
    document.getElementById('plansGrid').innerHTML = plansHtml;

    const reqs = DB.getSubRequests().filter(r => r.client_num === Number(this.client.num)).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    document.getElementById('requestsList').innerHTML = reqs.length ? reqs.map(r => `
      <div class="flex-between mb-2" style="padding:10px;border-bottom:1px solid var(--border-2)">
        <div>#${r.req_id} - ${r.months} شهر ${r.note ? `<br><small class="text-muted">📝 ${UI.esc(r.note)}</small>` : ''}</div>
        <div class="badge ${r.status === 'PENDING' ? 'badge-warn' : r.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}">${r.status === 'PENDING' ? 'قيد المراجعة' : r.status === 'APPROVED' ? 'مقبول' : 'مرفوض'}</div>
        ${r.status === 'PENDING' ? `<button class="btn btn-sm btn-ghost" onclick="SubPage.cancelReq(${r.req_id})">إلغاء</button>
          <button class="btn btn-sm btn-outline" onclick="SubPage.attachProof(${r.req_id})">📎 إشعار</button>` : ''}
      </div>`).join('') : '<p class="text-muted">لا طلبات سابقة</p>';
  },
  requestRenew(months) {
    const pending = DB.getSubRequests().find(
      r => Number(r.client_num) === Number(this.client.num) && r.status === 'PENDING'
    );
    if (pending) {
      UI.toast(`لديك طلب قيد المراجعة (#${pending.req_id}). ألغِه أولاً.`, 'error');
      return;
    }
    const price = DB.getSettings().month_price || 0;
    const amount = months * price;
    UI.modal({
      title: 'تأكيد التجديد',
      content: `<p class="mb-3">المدة: ${months} شهر — المبلغ: ${amount}</p>
        <div class="form-group"><label class="form-label">ملاحظة (اختياري)</label><input class="form-input" id="reqNote"></div>
        <div class="flex gap-2"><button class="btn btn-primary" data-yes>تأكيد</button><button class="btn btn-ghost" data-close>إلغاء</button></div>`,
      onOpen: (el, close) => {
        el.querySelector('[data-yes]').onclick = () => {
          const note = el.querySelector('#reqNote').value.trim();
          DB.createSubRequest({ client_num: this.client.num, months, amount, note });
          DB.logAudit('SUB_REQUEST', this.client.num, `months=${months} amount=${amount}`);
          UI.toast('✅ تم إرسال الطلب للإدارة', 'success');
          close(); this.render();
        };
      }
    });
  },
  cancelReq(id) {
    DB.cancelSubRequest(id, this.client.num);
    UI.toast('✅ تم الإلغاء', 'success');
    this.render();
  },
  attachProof(reqId) {
    UI.modal({
      title: '📎 إرفاق إشعار التحويل',
      content: `<div class="form-group"><label class="form-label">رقم عملية التحويل / ملاحظة</label>
        <input class="form-input" id="proofText" placeholder="مثال: رقم الحوالة 12345"></div>
        <button class="btn btn-primary btn-block" id="btnProof">إرسال</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnProof').onclick = () => {
          const content = el.querySelector('#proofText').value.trim();
          if (!content) return UI.toast('أدخل المحتوى', 'error');
          DB.addPaymentProof(reqId, this.client.num, content);
          DB.logAudit('PAYMENT_PROOF', this.client.num, `req=${reqId}`);
          UI.toast('✅ تم إرسال الإشعار للإدارة', 'success');
          close();
        };
      }
    });
  }
};
document.addEventListener('DOMContentLoaded', () => SubPage.init());
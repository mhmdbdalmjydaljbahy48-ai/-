document.addEventListener('DOMContentLoaded', async () => {
  const client = UI.requireLogin();
  if (!client) return;
  document.getElementById('year').textContent = new Date().getFullYear();

  const st = DB.subscriptionStatus(client);
  if (!st.ok) { location.href = 'subscription.html'; return; }

  document.getElementById('userAvatar').textContent = (client.name || '?').charAt(0);
  document.getElementById('userName').textContent = client.name || '—';
  document.getElementById('userRole').textContent = client.account_type === 'تجاري' ? client.shop_name || 'تاجر' : (client.account_type || 'غير محدد');

  // ✅ إصلاح #44: إظهار زر لوحة الإدارة للمدير
  if (DB.isAdmin(client.num) || client.is_admin) {
    document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'flex');
  }

  document.getElementById('welcomeName').textContent = client.name;
  document.getElementById('daysLeft').textContent = Math.max(0, st.days || 0);
  document.getElementById('subStatus').textContent = `ينتهي اشتراكك في ${UI.fmtDate(client.expiry_date)}`;

  // تحقق التذكيرات (D1/D3/D7)
  const reminder = DB.checkRemindersOnLogin(client.num);
  if (reminder) {
    setTimeout(() => {
      UI.modal({
        title: reminder.title,
        content: `<p class="mb-3">${reminder.message}</p>
          <a href="subscription.html" class="btn btn-primary btn-block">تجديد الاشتراك الآن</a>`
      });
    }, 1500);
  }

  // إظهار الإشعارات المعلقة
  UI.showPendingNotifications();

  if (!client.account_type) {
    askAccountType(client);
  }

  const sales = DB.getCashSales(client.num).concat(DB.getNetworkSales(client.num));
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.sale_date).toDateString() === today).length;
  document.getElementById('todaySales').textContent = todaySales;

  const debts = DB.getShopDebts(client.num);
  const totalDebt = debts.reduce((s, d) => s + (Number(d.debt_amount) - Number(d.paid_amount || 0)), 0);
  document.getElementById('totalDebts').textContent = UI.fmtNum(totalDebt);

  const recent = [];
  DB.getCashSales(client.num).slice(-3).forEach(s => recent.push({ t: 'بيع كاش', d: s.sale_date, v: s.total_amount }));
  DB.getNetworkSales(client.num).slice(-2).forEach(s => recent.push({ t: 'بيع شبكة', d: s.sale_date, v: s.total_amount }));
  if (recent.length) {
    document.getElementById('recentActivity').innerHTML = recent.sort((a,b) => new Date(b.d) - new Date(a.d)).slice(0,5).map(r =>
      `<div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-2)">
        <span>${r.t}</span>
        <span style="color:var(--amber);font-weight:700">${UI.fmtNum(r.v)} ${UI.unitOf(client)}</span>
        <span class="text-muted" style="font-size:.8rem">${UI.fmtDateTime(r.d)}</span>
      </div>`
    ).join('');
  }

  function askAccountType(client) {
    UI.modal({
      title: '👋 مرحباً! خطوة واحدة قبل البدء',
      content: `<p class="mb-3">هل أنت شخص فردي أم صاحب متجر؟</p>
        <div class="flex gap-2">
          <button class="btn btn-primary" data-type="فردي" style="flex:1">👤 شخص فردي</button>
          <button class="btn btn-outline" data-type="تجاري" style="flex:1">🏪 محل تجاري</button>
        </div>`,
      onOpen: (el) => {
        el.querySelectorAll('[data-type]').forEach(btn => {
          btn.onclick = () => {
            const type = btn.dataset.type;
            if (type === 'فردي') {
              DB.updateClient(client.num, { account_type: 'فردي' });
              UI.toast('✅ تم اعتماد حسابك كفردي', 'success');
              setTimeout(() => location.reload(), 400);
            } else {
              openShopSetup(client);
            }
          };
        });
      }
    });
  }

  function openShopSetup(client) {
    UI.modal({
      title: '🏪 بيانات المتجر',
      content: `
        <div class="form-group"><label class="form-label">اسم المتجر</label><input class="form-input" id="sn"></div>
        <div class="form-group"><label class="form-label">نوع النشاط</label><input class="form-input" id="at" placeholder="بقالة، إلكترونيات..."></div>
        <div class="form-group"><label class="form-label">الموقع/الشارع</label><input class="form-input" id="loc"></div>
        <div class="form-group"><label class="form-label">الدولة</label>
          <select class="form-select" id="ctry">
            <option>اليمن</option><option>السعودية</option><option>عمان</option><option>مصر</option>
            <option>الامارات</option><option>قطر</option><option>البحرين</option><option>الكويت</option>
            <option>العراق</option><option>سوريا</option><option>الاردن</option><option>السودان</option><option>دولة اخرى</option>
          </select></div>
        <div class="form-group"><label class="form-label">العملة</label>
          <select class="form-select" id="cur">
            <option value="الريال اليمني">الريال اليمني</option>
            <option value="الريال السعودي">الريال السعودي</option>
            <option value="الدولار">الدولار</option>
          </select></div>
        <button class="btn btn-primary btn-block" id="save">حفظ والبدء</button>`,
      onOpen: (el, close) => {
        el.querySelector('#save').onclick = () => {
          const sn = el.querySelector('#sn').value.trim();
          if (!sn) return UI.toast('أدخل اسم المتجر', 'error');
          DB.updateClient(client.num, {
            account_type: 'تجاري',
            shop_name: sn,
            activity_type: el.querySelector('#at').value.trim(),
            location: el.querySelector('#loc').value.trim(),
            shop_location: el.querySelector('#ctry').value,
            currency: el.querySelector('#cur').value,
          });
          UI.toast('✅ تم حفظ بيانات المتجر!', 'success');
          close(); setTimeout(() => location.reload(), 400);
        };
      }
    });
  }
});
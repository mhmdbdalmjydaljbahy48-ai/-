const Shop = {
  cart: [],
  client: null,
  _scannerInstance: null,
  _currentScanTarget: null,

  init() {
    this.client = UI.requireLogin();
    if (!this.client || !UI.requireActiveSubscription(this.client)) return;
    document.getElementById('userAvatar').textContent = this.client.name.charAt(0);
    document.getElementById('userName').textContent = this.client.name;
    document.getElementById('userRole').textContent = this.client.account_type || 'مستخدم';
    if (DB.isAdmin(this.client.num) || this.client.is_admin) {
      document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'flex');
    }
    document.querySelectorAll('.tab').forEach(t => t.onclick = (e) => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const targetContent = document.getElementById('tab-' + e.currentTarget.dataset.tab);
      if (targetContent) targetContent.classList.add('active');
    });
    document.getElementById('saleType').onchange = (e) => {
      document.getElementById('custGroup').style.display = e.target.value === 'd' ? 'block' : 'none';
      if (e.target.value === 'd') this.loadCustomerSelect();
    };
    this.loadProductsSelect();
    this.renderProducts();
    this.renderCustomers();
    this.loadDebtCustomers();
    this.renderRecentInvoices();
    this.updateCalcRates();
  },

  // ═══════════════════════════════════════════════════════════
  //                    دوال الباركود
  // ═══════════════════════════════════════════════════════════

  scanBarcode(targetInputId) {
    if (typeof Html5Qrcode === 'undefined') {
      UI.toast('❌ مكتبة المسح لم تُحمّل. تحقق من الإنترنت.', 'error');
      return;
    }
    this._currentScanTarget = targetInputId;
    const modal = document.getElementById('barcodeScannerModal');
    const statusEl = document.getElementById('scannerStatus');
    statusEl.innerHTML = '⏳ جاري تشغيل الكاميرا...';
    modal.style.display = 'grid';
    setTimeout(() => modal.classList.add('active'), 10);

    // إيقاف أي ماسح سابق
    if (this._scannerInstance) {
      try { this._scannerInstance.stop(); } catch(e) {}
      this._scannerInstance = null;
    }

    const formats = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE,
    ];

    this._scannerInstance = new Html5Qrcode("barcodeReader", { formatsToSupport: formats });
    this._scannerInstance.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 160 } },
      (decodedText) => this._onScanSuccess(decodedText),
      () => {}
    ).then(() => {
      statusEl.innerHTML = '✅ الكاميرا تعمل — وجّهها نحو الباركود';
    }).catch((err) => {
      console.error(err);
      const msg = String(err || '');
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        statusEl.innerHTML = '❌ لم يتم السماح باستخدام الكاميرا. افتح الإعدادات واسمح للموقع بالوصول للكاميرا.';
      } else if (msg.includes('NotFound') || msg.includes('no camera')) {
        statusEl.innerHTML = '❌ لا توجد كاميرا متاحة على هذا الجهاز. استخدم الإدخال اليدوي.';
      } else {
        statusEl.innerHTML = '❌ تعذر تشغيل الكاميرا. استخدم الإدخال اليدوي.<br><small class="text-muted">' + UI.esc(msg.substring(0, 100)) + '</small>';
      }
      UI.toast('تعذر فتح الكاميرا. استخدم الإدخال اليدوي.', 'error');
    });
  },

  _onScanSuccess(decodedText) {
    const targetId = this._currentScanTarget;
    if (targetId) {
      const input = document.getElementById(targetId);
      if (input) {
        input.value = decodedText;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    UI.toast('✅ تم قراءة الباركود: ' + decodedText, 'success');
    this.closeScanner();

    // إذا كان في حقل المبيعات → أضف للسلة تلقائياً
    if (targetId === 'saleBarcode') {
      setTimeout(() => this.addByBarcode(), 200);
    }
  },

  closeScanner() {
    const modal = document.getElementById('barcodeScannerModal');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
    if (this._scannerInstance) {
      const inst = this._scannerInstance;
      this._scannerInstance = null;
      try {
        inst.stop().then(() => { try { inst.clear(); } catch(e) {} }).catch(() => {});
      } catch(e) {}
    }
  },

  addByBarcode() {
    const input = document.getElementById('saleBarcode');
    const code = (input.value || '').trim();
    if (!code) return UI.toast('❌ أدخل أو امسح الباركود أولاً', 'error');

    const product = DB.findProductByBarcode(code);
    if (!product) {
      UI.toast('❌ لا يوجد منتج بهذا الباركود: ' + code, 'error');
      return;
    }
    if (Number(product.quantity) <= 0) {
      UI.toast('⚠️ المنتج [ ' + product.product_name + ' ] غير متوفر في المخزون', 'error');
      return;
    }

    // اختيار المنتج في القائمة + إضافته للسلة
    const sel = document.getElementById('prodSelect');
    const opt = Array.from(sel.options).find(o => Number(o.value) === Number(product.product_id));
    if (!opt) {
      UI.toast('⚠️ المنتج غير متاح للبيع (تحقق من المخزون)', 'error');
      return;
    }
    sel.value = product.product_id;
    document.getElementById('prodQty').value = 1;
    this.addToCart();
    input.value = '';
    input.focus();
  },

  // ═══════════════════════════════════════════════════════════
  //                    دوال المتجر الأساسية
  // ═══════════════════════════════════════════════════════════

  loadProductsSelect() {
    const prods = DB.getProducts().filter(p => p.quantity > 0);
    const sel = document.getElementById('prodSelect');
    if(!prods.length) {
      sel.innerHTML = '<option value="0">لا توجد منتجات (اذهب لقسم التوريد)</option>';
      return;
    }
    sel.innerHTML = prods.map(p => `<option value="${p.product_id}">${UI.esc(p.product_name)} (متوفر: ${p.quantity})</option>`).join('');
  },

  addToCart() {
    const pid = Number(document.getElementById('prodSelect').value);
    const qty = UI.parseNum(document.getElementById('prodQty').value, 1);
    if (!pid || qty === null || qty <= 0) return UI.toast('يجب إضافة منتج أولاً واختيار كمية صحيحة', 'error');
    const p = DB.findProduct(pid);
    if (!p) return UI.toast('المنتج غير موجود', 'error');
    const existing = this.cart.find(c => c.pid === pid);
    const currentQty = existing ? existing.qty : 0;
    const totalQty = currentQty + qty;
    if (totalQty > p.quantity) {
      UI.modal({
        title: '⚠️ الكمية غير متوفرة',
        content: `<p class="mb-3">المتوفر: <b>${p.quantity}</b> فقط. هل تريد المواصلة بالسالب؟</p>
                  <div class="flex gap-2">
                    <button class="btn btn-primary" data-yes>✅ نعم</button>
                    <button class="btn btn-ghost" data-close>❌ لا</button>
                  </div>`,
        onOpen: (el, close) => {
          el.querySelector('[data-yes]').onclick = () => {
            if (existing) {
              existing.qty = totalQty;
              existing.total = existing.qty * existing.price;
            } else {
              this.cart.push({ pid, pname: p.product_name, qty, price: p.price, cost: p.purchase_price, total: qty * p.price });
            }
            this.renderCart(); document.getElementById('prodQty').value = 1; close();
          };
        }
      });
      return;
    }
    if (existing) {
      existing.qty = totalQty;
      existing.total = existing.qty * existing.price;
    } else {
      this.cart.push({ pid, pname: p.product_name, qty, price: p.price, cost: p.purchase_price, total: qty * p.price });
    }
    this.renderCart();
    document.getElementById('prodQty').value = 1;
    UI.toast('✅ تمت الإضافة: ' + p.product_name, 'success');
  },

  renderCart() {
    const box = document.getElementById('cartItems');
    let total = 0;
    box.innerHTML = this.cart.map((c, i) => {
      total += c.total;
      return `<div class="cart-item">
        <div><b>${UI.esc(c.pname)}</b><br><small>${c.qty} × ${c.price}</small></div>
        <div style="color:var(--amber);font-weight:700">${UI.fmtNum(c.total)}</div>
        <button class="icon-btn" onclick="Shop.removeFromCart(${i})" style="width:32px;height:32px;color:var(--danger)"><i data-lucide="trash-2"></i></button>
      </div>`;
    }).join('');
    document.getElementById('cartTotal').textContent = UI.fmtNum(total) + ' ' + UI.unitOf(this.client);
    UI.fixIcons();
  },

  removeFromCart(i) { this.cart.splice(i, 1); this.renderCart(); },

  loadCustomerSelect() {
    const custs = DB.getCustomers(this.client.num);
    const sel = document.getElementById('saleCustomer');
    sel.innerHTML = '<option value="0">عميل عام (بدون اسم)</option>' + custs.map(c => `<option value="${c.customer_phone}">${UI.esc(c.customer_name)} (${c.customer_phone})</option>`).join('');
  },

  async submitSale() {
    if (!this.cart.length) return UI.toast('السلة فارغة', 'error');
    const type = document.getElementById('saleType').value;
    let phone = 0, name = 'عميل عام';
    if (type === 'd') {
      const sel = document.getElementById('saleCustomer');
      phone = Number(sel.value);
      if (!phone) return UI.toast('اختر عميلاً للدين', 'error');
      name = sel.options[sel.selectedIndex].text.split(' (')[0];
    } else {
      const input = await new Promise(resolve => {
        let done = false;
        const finish = (val) => { if (!done) { done = true; resolve(val); } };
        UI.modal({
          title: 'اسم الزبون (اختياري)',
          content: `<div class="form-group"><input class="form-input" id="cn" placeholder="اتركه فارغاً لعميل عام"></div>
                    <button class="btn btn-primary btn-block" id="ok">متابعة</button>`,
          onOpen: (el, close) => {
            el.querySelector('#ok').onclick = () => { const v = el.querySelector('#cn').value.trim(); finish(v); close(); };
            el.querySelector('[data-close]').onclick = () => { finish(''); close(); };
            el.onclick = (e) => { if (e.target === el) { finish(''); close(); } };
          }
        });
      });
      name = input || (type === 'c' ? 'عميل كاش عام' : 'عميل شبكة عام');
    }
    try {
      const res = DB.createSale({ client_num: this.client.num, kind: type, customer_name: name, customer_phone: phone, items: this.cart });
      UI.toast(`✅ تم حفظ الفاتورة #${res.invoice_num}`, 'success');
      this.cart = []; this.renderCart();
      this.loadProductsSelect(); this.renderProducts();
      this.renderRecentInvoices(); this.loadDebtCustomers();
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  renderRecentInvoices() {
    const sales = [
      ...DB.getCashSales(this.client.num).map(s => ({...s, kind: 'c'})),
      ...DB.getNetworkSales(this.client.num).map(s => ({...s, kind: 'n'})),
      ...DB.getShopDebts(this.client.num).map(s => ({...s, kind: 'd', total_amount: s.debt_amount, sale_date: s.debt_date}))
    ].sort((a,b) => new Date(b.sale_date) - new Date(a.sale_date)).slice(0, 5);

    document.getElementById('recentInvoices').innerHTML = sales.map(s => `
      <div class="flex-between mb-2" style="padding:8px;background:var(--bg-3);border-radius:8px">
        <div><b>#${s.invoice_num}</b> - ${UI.esc(s.product_name)}</div>
        <div style="color:var(--amber)">${UI.fmtNum(s.total_amount)}</div>
        <button class="btn btn-sm btn-outline" onclick="Shop.downloadInvoice('${s.kind}', ${s.invoice_num})"><i data-lucide="download"></i></button>
      </div>`).join('') || 'لا توجد فواتير';
    UI.fixIcons();
  },

  downloadInvoice(kind, invNum) {
    const rows = kind === 'd' ? DB.getShopDebts(this.client.num).filter(d => d.invoice_num === invNum)
      : kind === 'c' ? DB.getCashSales(this.client.num).filter(s => s.invoice_num === invNum)
      : DB.getNetworkSales(this.client.num).filter(s => s.invoice_num === invNum);
    if (!rows.length) return UI.toast('الفاتورة غير موجودة', 'error');
    const u = UI.unitOf(this.client); const shop = this.client.shop_name || this.client.name;
    const L = ['====================================','          فاتورة مبيعات             ','====================================',`المحل: ${shop}`,`رقم الفاتورة: ${invNum}`,`نوع الفاتورة: ${kind === 'c' ? 'كاش' : kind === 'n' ? 'شبكة' : 'آجلة'}`,`اسم العميل: ${rows[0].customer_name}`,`التاريخ: ${UI.fmtDateTime(rows[0].sale_date || rows[0].debt_date)}`,'------------------------------------'];
    let total = 0;
    for (const r of rows) { const amt = kind === 'd' ? r.debt_amount : r.total_amount; L.push(`${r.product_name} | ${r.quantity} × ${r.single_price} = ${UI.fmtNum(amt)} ${u}`); total += Number(amt); }
    L.push('------------------------------------',`الإجمالي: ${UI.fmtNum(total)} ${u}`,'====================================','        شكراً لتسوقكم معنا!         ');
    const blob = new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Invoice_${invNum}.txt`; a.click(); URL.revokeObjectURL(a.href);
    UI.toast('✅ تم تحميل الفاتورة', 'success');
  },

  renderProducts(query = '') {
    const grid = document.getElementById('productsGrid');
    const q = String(query || '').toLowerCase().trim();
    const prods = DB.getProducts().filter(p => !q || (p.product_name || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q));
    grid.innerHTML = prods.map(p => `
      <div class="card">
        <h4 class="mb-1" style="color:var(--amber)">${UI.esc(p.product_name)}</h4>
        ${p.barcode ? `<div class="barcode-tag">🏷️ ${UI.esc(p.barcode)}</div>` : ''}
        <div class="text-muted" style="font-size:.85rem;margin-top:6px">السعر: ${UI.fmtNum(p.price)} | التكلفة: ${UI.fmtNum(p.purchase_price)}</div>
        <div class="badge ${p.quantity > 0 ? 'badge-success' : 'badge-danger'} mt-2">المخزون: ${p.quantity}</div>
      </div>`).join('') || '<p class="text-muted">لا توجد منتجات. اذهب لقسم التوريد لإضافة منتجات.</p>';
  },

  renderCustomers() {
    const custs = DB.getCustomers(this.client.num);
    document.getElementById('customersGrid').innerHTML = custs.map(c => `
      <div class="flex-between mb-2" style="padding:10px;border-bottom:1px solid var(--border-2)">
        <span><b>${UI.esc(c.customer_name)}</b></span><span class="text-muted">${c.customer_phone}</span>
      </div>`).join('') || '<p class="text-muted">لا يوجد عملاء</p>';
    document.getElementById('custSummary').textContent = `إجمالي العملاء: ${custs.length}`;
  },

  openAddCustomer() {
    UI.modal({
      title: 'إضافة عميل',
      content: `<div class="form-group"><label class="form-label">الاسم</label><input class="form-input" id="cName" required></div>
                <div class="form-group"><label class="form-label">الرقم</label><input class="form-input" id="cPhone" type="number" required></div>
                <button class="btn btn-primary btn-block" id="btnSaveCust">حفظ</button>`,
      onOpen: (el, close) => {
        el.querySelector('#btnSaveCust').onclick = () => {
          const name = el.querySelector('#cName').value.trim(); const phone = UI.parseNum(el.querySelector('#cPhone').value, 1);
          if (!name || phone === null) return UI.toast('أدخل البيانات', 'error');
          try {
            DB.createCustomer(this.client.num, { name, phone });
            DB.logAudit('CUSTOMER_ADD', this.client.num, `${name} ${phone}`);
            UI.toast('✅ تم الحفظ', 'success'); close(); this.renderCustomers(); this.loadDebtCustomers();
          } catch(e) { UI.toast(e.message, 'error'); }
        };
      }
    });
  },

  loadDebtCustomers() {
    const custs = DB.getCustomers(this.client.num);
    document.getElementById('debtCustomerSelect').innerHTML = '<option value="">-- اختر عميل --</option>' + custs.map(c => `<option value="${c.customer_phone}">${UI.esc(c.customer_name)} (${c.customer_phone})</option>`).join('');
  },

  loadDebtDetails() {
    const phone = document.getElementById('debtCustomerSelect').value;
    if (!phone) return;
    const totals = DB.debtTotals(this.client.num, phone);
    const box = document.getElementById('debtDetails');
    if (totals.remain <= 0) { box.innerHTML = '<div class="badge badge-success">✅ العميل لا توجد عليه ديون</div>'; return; }
    const rows = DB.getDebtDetailsLimited(this.client.num, phone, 40).map(d => `
      <div class="flex-between" style="padding:6px 0;border-bottom:1px solid var(--border-2);font-size:.85rem">
        <span>${UI.esc(d.product_name)} × ${d.quantity}</span><span class="text-muted">${UI.fmtDate(d.debt_date)}</span>
        <span style="color:var(--danger)">${UI.fmtNum(d.debt_amount - (d.paid_amount || 0))}</span>
      </div>`).join('');
    box.innerHTML = `
      <div class="mb-3">
        <div class="flex-between mb-1"><span>إجمالي الدين:</span><b>${UI.fmtNum(totals.total)}</b></div>
        <div class="flex-between mb-1"><span>المسدد:</span><b>${UI.fmtNum(totals.paid)}</b></div>
        <div class="flex-between" style="color:var(--danger);font-size:1.1rem"><span>المتبقي:</span><b>${UI.fmtNum(totals.remain)}</b></div>
      </div>
      <details class="mb-3" style="padding:10px;background:var(--bg-3);border-radius:8px">
        <summary style="cursor:pointer;font-weight:700">📋 تفاصيل الديون (أول 40)</summary>
        <div class="mt-2">${rows}</div>
      </details>
      <div class="form-group"><label class="form-label">المبلغ المراد تسديده</label><input class="form-input" type="number" id="payAmount" max="${totals.remain}" value="${totals.remain}"></div>
      <div class="flex gap-2">
        <button class="btn btn-primary" style="flex:1" onclick="Shop.payDebt(${phone}, false)">💸 تسديد</button>
        <button class="btn btn-danger" style="flex:1" onclick="Shop.payDebt(${phone}, true)">🗑️ تصفير كلي</button>
      </div>`;
  },

  payDebt(phone, full) {
    if (full) {
      UI.confirm({ title: 'تأكيد', message: 'هل أنت متأكد من تصفير ديون هذا العميل بالكامل؟ سيتم أرشفتها.', danger: true, onConfirm: () => {
        DB.settleFullDebt(this.client.num, phone); UI.toast('✅ تم التصفير والأرشفة', 'success'); this.loadDebtDetails();
      }});
    } else {
      const amt = UI.parseNum(document.getElementById('payAmount').value);
      if (amt === null || amt <= 0) return UI.toast('أدخل مبلغاً صحيحاً', 'error');
      try { DB.payDebt(this.client.num, phone, amt); UI.toast('✅ تم تسجيل الدفعة', 'success'); this.loadDebtDetails(); }
      catch (e) { UI.toast(e.message, 'error'); }
    }
  },

  calcImport() {
    const form = document.getElementById('importForm');
    const cartons = UI.parseNum(form.cartons.value) || 0; const inside = UI.parseNum(form.inside.value) || 1;
    const cartonPrice = UI.parseNum(form.cartonPrice.value) || 0; const profit = UI.parseNum(form.profit.value) || 0; const paid = UI.parseNum(form.paid.value) || 0;
    const total = cartons * cartonPrice; const cost = cartonPrice / inside; const sell = cost + profit;
    document.getElementById('importSummary').style.display = 'block';
    document.getElementById('impTotal').textContent = total.toFixed(2);
    document.getElementById('impCost').textContent = cost.toFixed(2);
    document.getElementById('impSell').textContent = sell.toFixed(2);
    document.getElementById('impRemain').textContent = (total - paid).toFixed(2);
  },

  saveImport(form) {
    const fd = new FormData(form);
    const cartons = UI.parseNum(fd.get('cartons')) || 0;
    const inside = UI.parseNum(fd.get('inside')) || 1;
    const cartonPrice = UI.parseNum(fd.get('cartonPrice')) || 0;
    const paid = UI.parseNum(fd.get('paid')) || 0;
    const profit = UI.parseNum(fd.get('profit')) || 0;
    const barcode = (fd.get('barcode') || '').trim() || null;

    const data = {
      client_num: this.client.num, product_name: fd.get('product_name'), merchant_name: fd.get('merchant'),
      number_of_cartons: cartons, inside_carton: inside,
      price_carton: cartonPrice, full_amount: cartons * cartonPrice,
      paid_amount: paid, residual_amount: cartons * cartonPrice - paid,
      single_item_price: (cartonPrice / inside) + profit,
      item_cost: cartonPrice / inside, profit_amount: profit,
      barcode: barcode,
    };
    try {
      DB.createImport(data);
      UI.toast('✅ تم حفظ التوريد وتحديث المنتجات', 'success');
      form.reset();
      document.getElementById('importBarcode').value = '';
      document.getElementById('importSummary').style.display = 'none';
      this.renderProducts(); this.loadProductsSelect();
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  },

  updateCalcRates() {
    const rates = DB.getRates();
    document.getElementById('calcRatesInfo').textContent = `💵 الدولار: ${rates.usd} YER | 🇸🇦 السعودي: ${rates.sar} YER`;
    this.doCalc();
  },

  doCalc() {
    const from = document.getElementById('calcFrom').value; const to = document.getElementById('calcTo').value;
    const amt = UI.parseNum(document.getElementById('calcAmount').value) || 0; const r = DB.getRates();
    let res = 0;
    if (from === to) res = amt; else if (from === 'usd' && to === 'yer') res = amt * r.usd;
    else if (from === 'sar' && to === 'yer') res = amt * r.sar; else if (from === 'yer' && to === 'usd') res = amt / r.usd;
    else if (from === 'yer' && to === 'sar') res = amt / r.sar; else if (from === 'usd' && to === 'sar') res = (amt * r.usd) / r.sar;
    else if (from === 'sar' && to === 'usd') res = (amt * r.sar) / r.usd;
    document.getElementById('calcResult').textContent = UI.fmtNum(res) + ' ' + (to === 'usd' ? '$' : to === 'sar' ? 'SAR' : 'YER');
  },

  // ═══════════════════════════════════════════════════════════
  //                    التقارير الشاملة
  // ═══════════════════════════════════════════════════════════

  backToReportMenu() { document.getElementById('reportOutput').innerHTML = ''; },

  reportProducts() {
    const prods = DB.getProducts();
    const totalCartons = DB.getTotalCartonsImported(this.client.num);
    const totalQty = prods.reduce((s, p) => s + Number(p.quantity || 0), 0);
    let html = `
      <div class="card mb-3">
        <h3 class="card-title">📦 تقارير المنتجات</h3>
        <div class="grid-3 mb-3">
          <div class="stat-box"><small class="text-muted">إجمالي المنتجات</small><div style="font-size:1.5rem;font-weight:900">${prods.length}</div></div>
          <div class="stat-box"><small class="text-muted">إجمالي الحبات في المخزون</small><div style="font-size:1.5rem;font-weight:900;color:var(--amber)">${UI.fmtNum(totalQty)}</div></div>
          <div class="stat-box"><small class="text-muted">إجمالي الكراتين المستوردة</small><div style="font-size:1.5rem;font-weight:900;color:var(--success)">${UI.fmtNum(totalCartons)}</div></div>
        </div>
        <div class="form-group">
          <label class="form-label">🔍 بحث عن منتج</label>
          <input class="form-input" placeholder="اكتب اسم المنتج أو الباركود..." oninput="Shop.filterReportProducts(this.value)">
        </div>
        <div id="rptProductsList">${this._renderProductsTable(prods)}</div>
        <button class="btn btn-outline mt-3" onclick="Shop.backToReportMenu()">◀ رجوع</button>
      </div>`;
    document.getElementById('reportOutput').innerHTML = html;
  },

  _renderProductsTable(prods) {
    if (!prods.length) return '<p class="text-muted">لا توجد منتجات</p>';
    return `<table class="report-table">
      <thead><tr><th>المنتج</th><th>الباركود</th><th>سعر الشراء</th><th>سعر البيع</th><th>الربح/حبة</th><th>المخزون</th></tr></thead>
      <tbody>${prods.map(p => {
        const q = Number(p.quantity) || 0;
        const c = Number(p.units_per_carton) || 1;
        const ctn = Math.floor(q / c), loose = q % c;
        const profit = Number(p.price || 0) - Number(p.purchase_price || 0);
        return `<tr>
          <td><b>${UI.esc(p.product_name)}</b></td>
          <td>${p.barcode ? '<code>' + UI.esc(p.barcode) + '</code>' : '—'}</td>
          <td>${UI.fmtNum(p.purchase_price)}</td>
          <td>${UI.fmtNum(p.price)}</td>
          <td style="color:var(--success)">${UI.fmtNum(profit)}</td>
          <td>${q} حبة (${ctn} كرتون و ${loose} حبة)</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  },

  filterReportProducts(q) {
    const list = DB.searchProductsByName(q).concat(
      DB.getProducts().filter(p => (p.barcode||'').toLowerCase().includes((q||'').toLowerCase()) && !DB.searchProductsByName(q).find(x => x.product_id === p.product_id))
    );
    document.getElementById('rptProductsList').innerHTML = this._renderProductsTable(list);
  },

  reportCustomers() {
    const custs = DB.getAllCustomersWithBalances(this.client.num);
    const total = custs.length;
    const totalDebt = custs.reduce((s, c) => s + c.remain, 0);
    const totalPaid = custs.reduce((s, c) => s + c.total_paid, 0);
    let html = `
      <div class="card mb-3">
        <h3 class="card-title">👥 تقارير العملاء</h3>
        <div class="grid-3 mb-3">
          <div class="stat-box"><small class="text-muted">إجمالي العملاء</small><div style="font-size:1.5rem;font-weight:900">${total}</div></div>
          <div class="stat-box"><small class="text-muted">إجمالي المسدد</small><div style="font-size:1.5rem;font-weight:900;color:var(--success)">${UI.fmtNum(totalPaid)}</div></div>
          <div class="stat-box"><small class="text-muted">إجمالي المتبقي</small><div style="font-size:1.5rem;font-weight:900;color:var(--danger)">${UI.fmtNum(totalDebt)}</div></div>
        </div>
        <table class="report-table">
          <thead><tr><th>العميل</th><th>الرقم</th><th>إجمالي الدين</th><th>المسدد</th><th>المتبقي</th></tr></thead>
          <tbody>${custs.map(c => `<tr>
            <td><b>${UI.esc(c.customer_name)}</b></td>
            <td>${c.customer_phone}</td>
            <td>${UI.fmtNum(c.total_debt)}</td>
            <td style="color:var(--success)">${UI.fmtNum(c.total_paid)}</td>
            <td style="color:${c.remain > 0 ? 'var(--danger)' : 'var(--success)'};font-weight:700">${UI.fmtNum(c.remain)}</td>
          </tr>`).join('')}</tbody>
        </table>
        <button class="btn btn-outline mt-3" onclick="Shop.backToReportMenu()">◀ رجوع</button>
      </div>`;
    document.getElementById('reportOutput').innerHTML = html;
  },

  reportSales() {
    const analytics = DB.getAdvancedAnalytics(this.client.num);
    const monthImports = DB.getImportsByPeriod(this.client.num, 'month').reduce((s, i) => s + Number(i.full_amount || 0), 0);
    const todayTotal = analytics.today_cash + analytics.today_network + analytics.today_debt;
    const monthTotal = analytics.month_cash + analytics.month_network + analytics.month_new_debt;
    let html = `
      <div class="card mb-3">
        <h3 class="card-title">📈 تقارير المبيعات والاستيراد</h3>
        <h4 class="text-amber mb-2">🟢 مبيعات اليوم:</h4>
        <div class="grid-3 mb-3">
          <div class="stat-box"><small>💰 كاش</small><div style="font-weight:900;color:var(--success)">${UI.fmtNum(analytics.today_cash)}</div></div>
          <div class="stat-box"><small>💳 شبكة</small><div style="font-weight:900;color:var(--info)">${UI.fmtNum(analytics.today_network)}</div></div>
          <div class="stat-box"><small>📝 ديون</small><div style="font-weight:900;color:var(--warn)">${UI.fmtNum(analytics.today_debt)}</div></div>
        </div>
        <div class="flex-between mb-4" style="padding:12px;background:var(--bg-3);border-radius:8px;font-size:1.1rem">
          <b>إجمالي مبيعات اليوم:</b>
          <b style="color:var(--amber)">${UI.fmtNum(todayTotal)}</b>
        </div>
        <h4 class="text-amber mb-2">🔵 مبيعات هذا الشهر:</h4>
        <div class="grid-3 mb-3">
          <div class="stat-box"><small>💰 كاش</small><div style="font-weight:900;color:var(--success)">${UI.fmtNum(analytics.month_cash)}</div></div>
          <div class="stat-box"><small>💳 شبكة</small><div style="font-weight:900;color:var(--info)">${UI.fmtNum(analytics.month_network)}</div></div>
          <div class="stat-box"><small>📝 ديون جديدة</small><div style="font-weight:900;color:var(--warn)">${UI.fmtNum(analytics.month_new_debt)}</div></div>
        </div>
        <div class="flex-between mb-4" style="padding:12px;background:var(--bg-3);border-radius:8px;font-size:1.1rem">
          <b>إجمالي مبيعات الشهر:</b>
          <b style="color:var(--amber)">${UI.fmtNum(monthTotal)}</b>
        </div>
        <h4 class="text-amber mb-2">🔴 حركة الاستيراد والديون:</h4>
        <div class="flex-between mb-2"><span>🚛 استيراد الشهر:</span><b>${UI.fmtNum(monthImports)}</b></div>
        <div class="flex-between mb-2"><span>✅ تسديدات الديون (هذا الشهر):</span><b style="color:var(--success)">${UI.fmtNum(analytics.month_paid_debt)}</b></div>
        <div class="flex-between mb-3" style="padding:12px;background:var(--bg-3);border-radius:8px">
          <span><b>⚠️ إجمالي الديون المتبقية في السوق:</b></span>
          <b style="color:var(--danger);font-size:1.2rem">${UI.fmtNum(analytics.total_remaining_debts)}</b>
        </div>
        <button class="btn btn-outline" onclick="Shop.backToReportMenu()">◀ رجوع</button>
      </div>`;
    document.getElementById('reportOutput').innerHTML = html;
  },

  reportProfits() {
    const today = DB.getProfitsByPeriod(this.client.num, 'today');
    const month = DB.getProfitsByPeriod(this.client.num, 'month');
    let html = `
      <div class="card mb-3">
        <h3 class="card-title">💰 تقارير الأرباح الصافية</h3>
        <p class="text-muted mb-3">يُحسب الربح = (سعر البيع - سعر التكلفة) × الكمية المباعة (كاش + شبكة فقط)</p>
        <div class="grid-2 mb-3">
          <div class="card card-golden">
            <h4>📅 اليوم</h4>
            <div style="font-size:2.5rem;font-weight:900;color:var(--amber)">${UI.fmtNum(today)}</div>
            <small class="text-muted">صافي ربح اليوم</small>
          </div>
          <div class="card card-golden">
            <h4>📆 هذا الشهر</h4>
            <div style="font-size:2.5rem;font-weight:900;color:var(--amber)">${UI.fmtNum(month)}</div>
            <small class="text-muted">صافي ربح الشهر</small>
          </div>
        </div>
        <button class="btn btn-outline mt-3" onclick="Shop.backToReportMenu()">◀ رجوع</button>
      </div>`;
    document.getElementById('reportOutput').innerHTML = html;
  },

  reportDebts() {
    const debts = DB.getShopDebts(this.client.num);
    const totalRemaining = debts.reduce((s, d) => s + Math.max(0, Number(d.debt_amount) - Number(d.paid_amount || 0)), 0);
    const totalOriginal = debts.reduce((s, d) => s + Number(d.debt_amount || 0), 0);
    const totalPaid = debts.reduce((s, d) => s + Number(d.paid_amount || 0), 0);
    const activeDebts = debts.filter(d => Number(d.debt_amount) > Number(d.paid_amount || 0));
    let html = `
      <div class="card mb-3">
        <h3 class="card-title">📝 تقارير الديون الشاملة</h3>
        <div class="grid-3 mb-3">
          <div class="stat-box"><small>إجمالي الديون المسجلة</small><div style="font-weight:900">${UI.fmtNum(totalOriginal)}</div></div>
          <div class="stat-box"><small>المسدد</small><div style="font-weight:900;color:var(--success)">${UI.fmtNum(totalPaid)}</div></div>
          <div class="stat-box"><small>المتبقي</small><div style="font-weight:900;color:var(--danger)">${UI.fmtNum(totalRemaining)}</div></div>
        </div>
        <h4 class="text-amber mb-2">🔴 الديون النشطة (${activeDebts.length}):</h4>
        <table class="report-table">
          <thead><tr><th>العميل</th><th>المنتج</th><th>الكمية</th><th>المبلغ</th><th>المسدد</th><th>المتبقي</th><th>التاريخ</th></tr></thead>
          <tbody>${activeDebts.slice(-30).reverse().map(d => {
            const paid = Number(d.paid_amount || 0);
            const rem = Number(d.debt_amount) - paid;
            return `<tr>
              <td><b>${UI.esc(d.customer_name)}</b></td>
              <td>${UI.esc(d.product_name)}</td>
              <td>${d.quantity}</td>
              <td>${UI.fmtNum(d.debt_amount)}</td>
              <td style="color:var(--success)">${UI.fmtNum(paid)}</td>
              <td style="color:var(--danger);font-weight:700">${UI.fmtNum(rem)}</td>
              <td><small>${UI.fmtDate(d.debt_date)}</small></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
        ${activeDebts.length > 30 ? '<p class="text-muted mt-2" style="font-size:.85rem">يُعرض آخر 30 دين نشط</p>' : ''}
        <button class="btn btn-outline mt-3" onclick="Shop.backToReportMenu()">◀ رجوع</button>
      </div>`;
    document.getElementById('reportOutput').innerHTML = html;
  },

  reportSearchSales() {
    let html = `
      <div class="card mb-3">
        <h3 class="card-title">🔍 بحث عن عمليات بيع</h3>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">طريقة البحث</label>
            <select class="form-select" id="rptSearchType">
              <option value="invoice">🔖 رقم الفاتورة</option>
              <option value="name">👤 اسم العميل</option>
              <option value="phone">📞 رقم الهاتف</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">نوع العملية</label>
            <select class="form-select" id="rptSaleKind">
              <option value="all">كل الأنواع</option>
              <option value="c">💰 كاش</option>
              <option value="n">💳 شبكة</option>
              <option value="d">📝 دين</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">قيمة البحث</label>
          <input class="form-input" id="rptSearchValue" placeholder="أدخل قيمة البحث">
        </div>
        <button class="btn btn-primary" onclick="Shop.runSalesSearch()"><i data-lucide="search"></i> بحث</button>
        <div id="rptSearchResults" class="mt-3"></div>
        <button class="btn btn-outline mt-3" onclick="Shop.backToReportMenu()">◀ رجوع</button>
      </div>`;
    document.getElementById('reportOutput').innerHTML = html;
    UI.fixIcons();
  },

  runSalesSearch() {
    const type = document.getElementById('rptSearchType').value;
    const kind = document.getElementById('rptSaleKind').value;
    const value = document.getElementById('rptSearchValue').value.trim();
    if (!value) return UI.toast('أدخل قيمة البحث', 'error');
    let all = [];
    if (kind === 'c' || kind === 'all') {
      DB.getCashSales(this.client.num).forEach(s => all.push({ ...s, _kind: 'كاش', _date: s.sale_date }));
    }
    if (kind === 'n' || kind === 'all') {
      DB.getNetworkSales(this.client.num).forEach(s => all.push({ ...s, _kind: 'شبكة', _date: s.sale_date }));
    }
    if (kind === 'd' || kind === 'all') {
      DB.getShopDebts(this.client.num).forEach(d => all.push({ ...d, _kind: 'دين', _date: d.debt_date, total_amount: d.debt_amount }));
    }
    const filtered = all.filter(s => {
      if (type === 'invoice') return String(s.invoice_num) === value;
      if (type === 'name') return (s.customer_name || '').toLowerCase().includes(value.toLowerCase());
      if (type === 'phone') return String(s.customer_phone) === value;
      return false;
    });
    const box = document.getElementById('rptSearchResults');
    if (!filtered.length) {
      box.innerHTML = '<div class="card"><p class="text-muted">❌ لا توجد نتائج مطابقة</p></div>';
      return;
    }
    box.innerHTML = `
      <div class="card">
        <h4>✅ النتائج (${filtered.length}):</h4>
        <table class="report-table">
          <thead><tr><th>النوع</th><th>الفاتورة</th><th>العميل</th><th>المنتج</th><th>الكمية</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
          <tbody>${filtered.slice(0, 100).map(s => `<tr>
            <td>${s._kind}</td>
            <td>${s.invoice_num}</td>
            <td>${UI.esc(s.customer_name)}</td>
            <td>${UI.esc(s.product_name)}</td>
            <td>${s.quantity}</td>
            <td style="color:var(--amber)">${UI.fmtNum(s.total_amount)}</td>
            <td><small>${UI.fmtDateTime(s._date)}</small></td>
          </tr>`).join('')}</tbody>
        </table>
        ${filtered.length > 100 ? '<p class="text-muted mt-2">يُعرض أول 100 نتيجة فقط</p>' : ''}
      </div>`;
  },

  reportProductMovement() {
    const best = DB.getBestSellingProduct(this.client.num, 'month');
    const movement = DB.getProductMovement(this.client.num);
    const totalMonth = movement.reduce((s, p) => s + p.month_sold, 0);
    const totalToday = movement.reduce((s, p) => s + p.today_sold, 0);
    let html = `
      <div class="card mb-3">
        <h3 class="card-title">📊 تقرير حركة المنتجات والأرباح</h3>
        ${best ? `
          <div class="card card-golden mb-4">
            <h4>🌟 <b>المنتج الأكثر مبيعاً هذا الشهر</b></h4>
            <div style="font-size:1.8rem;font-weight:900;color:var(--amber)">${UI.esc(best.name)}</div>
            <div>الكمية المباعة: <b>${best.qty}</b> حبة</div>
          </div>
        ` : '<p class="text-muted mb-3">لا توجد مبيعات مسجلة هذا الشهر</p>'}
        <div class="grid-2 mb-4">
          <div class="stat-box"><small>مبيعات اليوم (كل المنتجات)</small><div style="font-size:1.5rem;font-weight:900;color:var(--success)">${totalToday} حبة</div></div>
          <div class="stat-box"><small>مبيعات الشهر (كل المنتجات)</small><div style="font-size:1.5rem;font-weight:900;color:var(--amber)">${totalMonth} حبة</div></div>
        </div>
        <h4 class="text-amber mb-2">📦 تفاصيل جميع المنتجات:</h4>
        <table class="report-table">
          <thead><tr><th>المنتج</th><th>الباركود</th><th>الشراء</th><th>البيع</th><th>الربح/حبة</th><th>مبيعات اليوم</th><th>مبيعات الشهر</th><th>المخزون</th></tr></thead>
          <tbody>${movement.map(p => {
            const q = Number(p.quantity) || 0;
            const c = Number(p.units_per_carton) || 1;
            const ctn = Math.floor(q / c), loose = q % c;
            return `<tr>
              <td><b>${UI.esc(p.product_name)}</b></td>
              <td>${p.barcode ? '<code>' + UI.esc(p.barcode) + '</code>' : '—'}</td>
              <td>${UI.fmtNum(p.purchase_price)}</td>
              <td>${UI.fmtNum(p.price)}</td>
              <td style="color:var(--success)">${UI.fmtNum(p.profit_per_unit)}</td>
              <td style="color:var(--success)">${p.today_sold}</td>
              <td style="color:var(--amber)">${p.month_sold}</td>
              <td>${ctn} كرتون و ${loose} حبة</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
        <button class="btn btn-outline mt-3" onclick="Shop.backToReportMenu()">◀ رجوع</button>
      </div>`;
    document.getElementById('reportOutput').innerHTML = html;
  }
};

document.addEventListener('DOMContentLoaded', () => Shop.init());

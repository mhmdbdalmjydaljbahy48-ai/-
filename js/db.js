/* ═══════════════════════════════════════════════════════════
   ✨️ FT — طبقة البيانات — النسخة النهائية (v7)
   (تحقق مرن من الإيميل + دعم كامل للباركود والتقارير)
   ═══════════════════════════════════════════════════════════ */

const DB = (() => {
  const PREFIX = 'ft_';
  const KEYS = {
    users: 'users', accounts: 'user_accounts', clients: 'clients',
    subRequests: 'sub_requests', inquiries: 'inquiries', auditLog: 'audit_log',
    products: 'products', shopCustomers: 'shop_customers', shopDebts: 'shop_debts',
    cashSales: 'cash_sales', networkSales: 'network_sales', imports: 'imports',
    settings: 'settings', rates: 'rates',
    personalExpenses: 'personal_expenses', personalIncome: 'personal_income',
    personalDebts: 'personal_debts', personalDebtPayments: 'personal_debt_payments',
    personalNotes: 'personal_notes', personalGoals: 'personal_goals',
    personalObligations: 'personal_obligations', currentSession: 'current_session',
    debtArchive: 'debt_archive',
    notifications: 'notifications',
    paymentProofs: 'payment_proofs',
    adminList: 'admin_list',
  };

  // دالة مساعدة لتنظيف النصوص من المسافات والرموز الخفية
  function cleanText(str) {
    if (!str) return '';
    return String(str).replace(/[\s\u200e\u200f\u202a-\u202e\u200b\u200c\u200d\u2066-\u2069\u00A0]/g, '');
  }

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : (fallback !== undefined ? fallback : null);
    } catch { return fallback !== undefined ? fallback : null; }
  }
  function set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('ft-db-change', { detail: { key } }));
    return value;
  }
  function generateId() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }
  function now() { return new Date().toISOString(); }
  function daysBetween(d1, d2) { return Math.floor((new Date(d2) - new Date(d1)) / 86400000); }
  function addMonths(dateStr, months) {
    const d = new Date(dateStr); d.setMonth(d.getMonth() + Number(months)); return d.toISOString();
  }
  function addPrecise(dateStr, { minutes=0, hours=0, days=0, months=0 }) {
    const d = new Date(dateStr);
    if (minutes) d.setMinutes(d.getMinutes() + minutes);
    if (hours) d.setHours(d.getHours() + hours);
    if (days) d.setDate(d.getDate() + days);
    if (months) d.setMonth(d.getMonth() + months);
    return d.toISOString();
  }

  const AR_DIGITS = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                      '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
                      '٫':'.','٬':',','،':',' };
  function norm(s) {
    return String(s || '').replace(/[٠-٩۰-۹٫٬،]/g, ch => AR_DIGITS[ch] || ch).trim();
  }
  function parseNum(s, min = 0) {
    const v = Number(norm(s).replace(/,/g, ''));
    if (!isFinite(v) || v < min) return null;
    return v;
  }
  function parseFloatN(s, min = 0) {
    let t = norm(s).replace(/\s/g, '');
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
    else t = t.replace(/,/g, '.');
    const v = parseFloat(t);
    if (!isFinite(v) || v < min) return null;
    return v;
  }

  async function hashPassword(pw, salt = null, iterations = 10000) {
    const useSalt = salt || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    const enc = new TextEncoder();
    let data = useSalt + '::' + pw;
    for (let i = 0; i < iterations; i++) {
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(data + ':' + i));
      data = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    return `sha256it$${iterations}$${useSalt}$${data}`;
  }
  async function verifyPassword(pw, stored) {
    if (!stored) return false;
    if (stored.startsWith('sha256it$')) {
      const parts = stored.split('$');
      const recomputed = await hashPassword(pw, parts[2], Number(parts[1]));
      return recomputed === stored;
    }
    if (stored.startsWith('sha256$')) {
      const parts = stored.split('$');
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(parts[1] + '::' + pw));
      const h = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
      return h === parts[2];
    }
    return pw === stored;
  }

  const DEFAULT_SETTINGS = {
    month_price: 0, trial_months: 1,
    registration_mode: 'first_only',
    email_suffix: '', // تم إزالة الشرط الصارم للسماح بأي إيميل صحيح
    support_phone_1: '738439579', support_phone_2: '785068462',
    support_country_code: '967',
    support_telegram: 'https://t.me/+967734427533',
    support_instagram: 'faisalalqahtanifffff',
    support_messenger: 'https://m.me/faisalalqahtanifffff',
    support_whatsapp_msg: 'مرحباً، أريد الاستفسار عن النظام',
    pay_contact_name: 'المهندس/ محمد', pay_contact_phone: '785068462',
    pay_transfer_number: '738439579', sub_price_unit: 'ريال',
  };

  function getSettings() {
    let stored;
    try {
      const raw = localStorage.getItem(PREFIX + KEYS.settings);
      stored = raw ? JSON.parse(raw) : null;
    } catch { stored = null; }
    const base = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {};
    return Object.assign({}, DEFAULT_SETTINGS, base);
  }
  function setSettings(s) {
    const safe = (s && typeof s === 'object' && !Array.isArray(s)) ? s : {};
    return set(KEYS.settings, Object.assign({}, DEFAULT_SETTINGS, safe));
  }
  function updateSettings(patch) {
    const s = Object.assign(getSettings(), patch || {});
    setSettings(s); return s;
  }

  function getRates() {
    const r = get(KEYS.rates, null);
    if (!r || typeof r !== 'object' || Array.isArray(r)) return { usd: 0, sar: 0 };
    return { usd: Number(r.usd) || 0, sar: Number(r.sar) || 0 };
  }
  function setRates(r) {
    const safe = (r && typeof r === 'object' && !Array.isArray(r)) ? r : {};
    return set(KEYS.rates, { usd: Number(safe.usd) || 0, sar: Number(safe.sar) || 0 });
  }

  function getAdminList() {
    const list = get(KEYS.adminList, null);
    if (list && Array.isArray(list)) return list;
    const clients = getAllClients();
    const first = clients[0];
    const initial = first ? [first.num] : [];
    set(KEYS.adminList, initial);
    return initial;
  }
  function isAdmin(num) { return getAdminList().map(Number).includes(Number(num)); }
  function addAdmin(num) {
    const list = getAdminList();
    if (!list.map(Number).includes(Number(num))) { list.push(Number(num)); set(KEYS.adminList, list); }
  }
  function removeAdmin(num) {
    set(KEYS.adminList, getAdminList().filter(n => Number(n) !== Number(num)));
  }

  function getAllClients() { const a = get(KEYS.clients, []); return Array.isArray(a) ? a : []; }
  function findClient(num) { return getAllClients().find(c => Number(c.num) === Number(num)); }
  function findClientByEmail(email) {
    const clean = cleanText(email).toLowerCase();
    return getAllClients().find(c => cleanText(c.email).toLowerCase() === clean);
  }

  // ✅ دالة التحقق الجديدة: مرنة جداً وتقبل أي إيميل صالح
  function validateEmail(email, suffix) {
    let e = cleanText(email);
    if (!e || e.length > 150) return false;
    
    // التحقق من الصيغة الأساسية (شيء@شيء.شيء)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e)) return false;
    
    // تجاهلنا شرط الـ suffix الصارم لأنه كان يسبب مشاكل في المتصفحات
    return true;
  }

  function getRegistrationMode() { return getSettings().registration_mode || 'first_only'; }
  function canRegister() {
    const mode = getRegistrationMode();
    if (mode === 'closed') return { ok: false, why: 'التسجيل مغلق. تواصل مع الإدارة.' };
    if (mode === 'open') return { ok: true, why: '' };
    if (getAllClients().length === 0) return { ok: true, why: '' };
    return { ok: false, why: 'التسجيل الذاتي مغلق. تواصل مع الإدارة.' };
  }

  async function createClient({ num, name, email, password, months, shop_name, activity_type, location, shop_location, currency, account_type }) {
    const clients = getAllClients();
    if (clients.find(c => Number(c.num) === Number(num))) throw new Error('رقم العميل مستخدم من قبل');
    
    const cleanEmail = cleanText(email);
    if (clients.find(c => cleanText(c.email).toLowerCase() === cleanEmail.toLowerCase())) {
      throw new Error('الإيميل مستخدم من قبل');
    }
    
    const trial = months !== undefined ? months : getSettings().trial_months || 1;
    const start = now();
    const expiry = addMonths(start, trial);
    const client = {
      num: Number(num), name, email: cleanEmail,
      password_hash: await hashPassword(password),
      subscription_months: trial,
      subscription_duration: durationLabel(trial),
      money: 0, start_date: start, expiry_date: expiry,
      is_active: 1, fail_count: 0, locked_until: null,
      last_reminder_kind: null, last_reminder_at: null,
      account_type: account_type || null, shop_name: shop_name || null,
      activity_type: activity_type || null, location: location || null,
      shop_location: shop_location || null, currency: currency || null,
      created_at: now(),
    };
    clients.push(client);
    set(KEYS.clients, clients);
    if (clients.length === 1) addAdmin(client.num);
    return client;
  }

  function updateClient(num, patch) {
    const clients = getAllClients();
    const idx = clients.findIndex(c => Number(c.num) === Number(num));
    if (idx < 0) return null;
    clients[idx] = { ...clients[idx], ...patch };
    if (patch.expiry_date === undefined && (patch.subscription_months !== undefined || patch.start_date !== undefined)) {
      clients[idx].expiry_date = addMonths(clients[idx].start_date, clients[idx].subscription_months);
    }
    set(KEYS.clients, clients);
    return clients[idx];
  }

  function updateClientNum(oldNum, newNum) {
    newNum = Number(newNum); oldNum = Number(oldNum);
    if (newNum === oldNum) return true;
    if (findClient(newNum)) throw new Error('الرقم الجديد مستخدم');
    const clients = getAllClients();
    const idx = clients.findIndex(c => Number(c.num) === oldNum);
    if (idx < 0) throw new Error('العميل غير موجود');
    clients[idx].num = newNum;
    set(KEYS.clients, clients);
    ['shop_customers','shop_debts','cash_sales','network_sales','imports',
     'personal_expenses','personal_income','personal_debts','personal_debt_payments',
     'personal_notes','personal_goals','personal_obligations','sub_requests',
     'debt_archive','notifications','payment_proofs'].forEach(k => {
      const rows = get(k, []);
      let changed = false;
      rows.forEach(r => { if (Number(r.client_num) === oldNum) { r.client_num = newNum; changed = true; } });
      if (changed) set(k, rows);
    });
    const admins = getAdminList().map(n => Number(n) === oldNum ? newNum : n);
    set(KEYS.adminList, admins);
    const sess = currentSession();
    if (sess && Number(sess.clientNum) === oldNum) setSession(newNum);
    return true;
  }

  function deleteClient(num) {
    set(KEYS.clients, getAllClients().filter(c => Number(c.num) !== Number(num)));
    removeAdmin(num);
    purgeClientData(num);
  }

  function purgeClientData(num) {
    const tables = ['shop_customers','shop_debts','cash_sales','network_sales','imports',
      'personal_expenses','personal_income','personal_debts','personal_debt_payments',
      'personal_notes','personal_goals','personal_obligations','sub_requests',
      'debt_archive','notifications','payment_proofs'];
    tables.forEach(k => set(k, get(k, []).filter(r => Number(r.client_num) !== Number(num))));
  }

  function currentSession() { return get(KEYS.currentSession, null); }
  function setSession(num) { set(KEYS.currentSession, { clientNum: Number(num), at: now() }); }
  function clearSession() { set(KEYS.currentSession, null); }
  function currentClient() {
    const s = currentSession(); if (!s) return null;
    const c = findClient(s.clientNum);
    if (!c) { clearSession(); return null; }
    return c;
  }

  async function login(num, password) {
    const c = findClient(num);
    if (!c) throw new Error('رقم العميل غير موجود');
    const locked = c.locked_until ? new Date(c.locked_until) : null;
    if (locked && locked > new Date()) {
      const mins = Math.ceil((locked - new Date()) / 60000);
      throw new Error(`⛔ الحساب مقفل. حاول بعد ${mins} دقيقة.`);
    }
    const ok = await verifyPassword(password, c.password_hash);
    if (!ok) {
      const fails = (c.fail_count || 0) + 1;
      if (fails >= 5) {
        updateClient(num, { fail_count: 0, locked_until: new Date(Date.now() + 15*60000).toISOString() });
        throw new Error('⛔ 5 محاولات فاشلة. الحساب مقفل 15 دقيقة.');
      }
      updateClient(num, { fail_count: fails });
      throw new Error(`كلمة المرور غير صحيحة (محاولة ${fails}/5)`);
    }
    const patch = { fail_count: 0, locked_until: null };
    if (!c.password_hash.startsWith('sha256it$')) patch.password_hash = await hashPassword(password);
    updateClient(num, patch);
    setSession(c.num);
    logAudit('LOGIN', c.num);
    return findClient(num);
  }

  function logout() {
    const c = currentClient();
    if (c) logAudit('LOGOUT', c.num);
    clearSession();
  }

  function subscriptionStatus(client) {
    if (!client) return { ok: false, expired: true, blocked: true, days: null };
    const dl = daysBetween(now(), client.expiry_date);
    const blocked = Number(client.is_active) === 0;
    const expired = dl < 0;
    return { ok: !blocked && !expired, blocked, expired, days: dl, expiry: client.expiry_date };
  }
  function durationLabel(months) {
    const labels = { 0:'صفر شهر',1:'شهر واحد',2:'شهرين',3:'ثلاثة أشهر',4:'أربعة أشهر',
      5:'خمسة أشهر',6:'ستة أشهر',7:'سبعة أشهر',8:'ثمانية أشهر',9:'تسعة أشهر',
      10:'عشرة أشهر',11:'أحد عشر شهر',12:'سنة كاملة' };
    return labels[months] || `${months} شهر`;
  }

  function createSubRequest({ client_num, months, amount, note = '' }) {
    const reqs = get(KEYS.subRequests, []);
    const id = generateId();
    reqs.unshift({
      req_id: id, client_num: Number(client_num), months: Number(months),
      amount: Number(amount), note: note || '',
      status: 'PENDING', created_at: now(),
      decided_at: null, decided_by: null, telegram_id: null,
    });
    set(KEYS.subRequests, reqs);
    logAudit('SUB_REQUEST', client_num, `req=${id} months=${months} amount=${amount}`);
    return id;
  }
  function getSubRequests() { const a = get(KEYS.subRequests, []); return Array.isArray(a) ? a : []; }
  function pendingSubRequests() { return getSubRequests().filter(r => r.status === 'PENDING'); }

  function approveSubRequest(reqId, byUser) {
    const reqs = getSubRequests();
    const idx = reqs.findIndex(r => r.req_id === Number(reqId));
    if (idx < 0) throw new Error('الطلب غير موجود');
    if (reqs[idx].status !== 'PENDING') throw new Error('الطلب معالج مسبقاً');
    const client = findClient(reqs[idx].client_num);
    if (!client) throw new Error('العميل غير موجود');
    const r = reqs[idx];
    const nowDate = now();
    const isExpired = daysBetween(nowDate, client.expiry_date) < 0;
    let newStart = client.start_date, newMonths = r.months;
    if (isExpired) newStart = nowDate;
    else newMonths = (client.subscription_months || 0) + r.months;
    updateClient(r.client_num, {
      subscription_months: newMonths, subscription_duration: durationLabel(newMonths),
      start_date: newStart, expiry_date: addMonths(newStart, newMonths),
      money: (client.money || 0) + r.amount, is_active: 1,
      last_reminder_kind: null, last_reminder_at: null,
    });
    reqs[idx].status = 'APPROVED';
    reqs[idx].decided_at = nowDate;
    reqs[idx].decided_by = byUser || null;
    set(KEYS.subRequests, reqs);
    addNotification(r.client_num, '✅ تم تفعيل اشتراكك',
      `تم تفعيل اشتراكك لمدة ${durationLabel(r.months)}. ينتهي في ${new Date(addMonths(newStart, newMonths)).toLocaleDateString('ar-EG')}.`);
    logAudit('SUB_APPROVED', r.client_num, `req=${reqId}`);
    return r;
  }
  function rejectSubRequest(reqId, byUser) {
    const reqs = getSubRequests();
    const idx = reqs.findIndex(r => r.req_id === Number(reqId));
    if (idx < 0) throw new Error('الطلب غير موجود');
    reqs[idx].status = 'REJECTED';
    reqs[idx].decided_at = now();
    reqs[idx].decided_by = byUser || null;
    set(KEYS.subRequests, reqs);
    addNotification(reqs[idx].client_num, '❌ تم رفض طلب التجديد',
      `طلب التجديد #${reqId} لم يُقبل. للاستفسار تواصل مع الإدارة.`);
    return reqs[idx];
  }
  function cancelSubRequest(reqId, clientNum) {
    const reqs = getSubRequests();
    const idx = reqs.findIndex(r => r.req_id === Number(reqId) && Number(r.client_num) === Number(clientNum) && r.status === 'PENDING');
    if (idx < 0) return false;
    reqs[idx].status = 'CANCELLED';
    reqs[idx].decided_at = now();
    set(KEYS.subRequests, reqs);
    return true;
  }

  function grantSubscription(num, { minutes=0, hours=0, days=0, months=0, amount=0, resetMonthsIfExpired=true }) {
    const client = findClient(num);
    if (!client) throw new Error('العميل غير موجود');
    const isExpired = daysBetween(now(), client.expiry_date) < 0;
    const base = isExpired ? now() : client.expiry_date;
    const newExpiry = addPrecise(base, { minutes, hours, days, months });
    let newMonths = client.subscription_months || 0;
    let newStart = client.start_date;
    if (months > 0) {
      if (isExpired && resetMonthsIfExpired) { newStart = now(); newMonths = months; }
      else newMonths += months;
    }
    return updateClient(num, {
      expiry_date: newExpiry, subscription_months: newMonths,
      subscription_duration: durationLabel(newMonths), start_date: newStart,
      money: (client.money || 0) + Number(amount || 0),
      is_active: 1,
      last_reminder_kind: null, last_reminder_at: null,
    });
  }

  function addInquiry(data) {
    const arr = get(KEYS.inquiries, []);
    arr.unshift({ id: generateId(), ...data, created_at: now() });
    set(KEYS.inquiries, arr);
  }
  function getInquiries() { const a = get(KEYS.inquiries, []); return Array.isArray(a) ? a : []; }
  function deleteInquiry(id) { set(KEYS.inquiries, getInquiries().filter(i => i.id !== Number(id))); }
  function clearInquiries() { set(KEYS.inquiries, []); }

  function getProducts() { const a = get(KEYS.products, []); return Array.isArray(a) ? a : []; }
  function findProduct(id) { return getProducts().find(p => p.product_id === Number(id)); }
  function findProductByName(name) {
    return getProducts().find(p => (p.product_name||'').toLowerCase() === (name||'').toLowerCase());
  }
  function findProductByBarcode(barcode) {
    if (!barcode) return null;
    const b = String(barcode).trim();
    if (!b) return null;
    return getProducts().find(p => String(p.barcode || '').trim() === b) || null;
  }

  function createProduct({ product_name, price=0, selling_price=0, purchase_price=0, quantity=0, units_per_carton=1, barcode=null }) {
    const products = getProducts();
    if (findProductByName(product_name)) throw new Error('المنتج موجود بنفس الاسم');
    if (barcode) {
      const existing = findProductByBarcode(barcode);
      if (existing) throw new Error(`الباركود [${barcode}] مستخدم للمنتج: ${existing.product_name}`);
    }
    const p = { product_id: generateId(), product_name, price, selling_price, purchase_price,
      quantity, units_per_carton, barcode: barcode || null, is_active: 1, created_at: now() };
    products.push(p); set(KEYS.products, products); return p;
  }
  function updateProduct(id, patch) {
    const products = getProducts();
    const idx = products.findIndex(p => p.product_id === Number(id));
    if (idx < 0) return null;
    if (patch.barcode) {
      const existing = findProductByBarcode(patch.barcode);
      if (existing && existing.product_id !== Number(id)) {
        throw new Error(`الباركود [${patch.barcode}] مستخدم للمنتج: ${existing.product_name}`);
      }
    }
    products[idx] = { ...products[idx], ...patch };
    set(KEYS.products, products); return products[idx];
  }

  function getCustomers(clientNum) {
    return get(KEYS.shopCustomers, []).filter(c => Number(c.client_num) === Number(clientNum));
  }
  function findCustomerByPhone(clientNum, phone) {
    return get(KEYS.shopCustomers, []).find(c => Number(c.client_num) === Number(clientNum) && Number(c.customer_phone) === Number(phone));
  }
  function createCustomer(clientNum, { name, phone }) {
    const all = get(KEYS.shopCustomers, []);
    if (all.find(c => Number(c.customer_phone) === Number(phone))) throw new Error('رقم الهاتف مستخدم من قبل');
    const cust = { customer_phone: Number(phone), client_num: Number(clientNum), customer_name: name, created_at: now() };
    all.push(cust); set(KEYS.shopCustomers, all); return cust;
  }

  function newInvoiceNum(clientNum) {
    const all = [...get(KEYS.cashSales, []), ...get(KEYS.networkSales, []), ...get(KEYS.shopDebts, [])]
      .filter(s => Number(s.client_num) === Number(clientNum));
    let n = Math.floor(Date.now() / 1000) % 100000000;
    while (all.find(s => s.invoice_num === n)) n++;
    return n;
  }
  function createSale({ client_num, kind, customer_name, customer_phone, items }) {
    if (!items || !items.length) throw new Error('السلة فارغة');
    const inv = newInvoiceNum(client_num);
    const results = [];
    if (kind === 'd') {
      const debts = get(KEYS.shopDebts, []);
      for (const it of items) {
        const row = { debt_id: generateId(), client_num: Number(client_num),
          customer_phone: Number(customer_phone), customer_name,
          product_name: it.pname, quantity: Number(it.qty),
          single_price: Number(it.price), debt_amount: Number(it.total),
          paid_amount: 0, invoice_num: inv, debt_date: now() };
        debts.push(row); results.push(row);
      }
      set(KEYS.shopDebts, debts);
    } else {
      const key = kind === 'c' ? KEYS.cashSales : KEYS.networkSales;
      const table = get(key, []);
      for (const it of items) {
        const profit = (Number(it.price) - Number(it.cost || 0)) * Number(it.qty);
        const row = { sale_id: generateId(), client_num: Number(client_num),
          customer_name, customer_phone: Number(customer_phone),
          product_name: it.pname, quantity: Number(it.qty),
          single_price: Number(it.price), total_amount: Number(it.total),
          profit_amount: profit, invoice_num: inv, sale_date: now() };
        table.push(row); results.push(row);
      }
      set(key, table);
    }
    for (const it of items) {
      const p = findProduct(it.pid);
      if (p) updateProduct(p.product_id, { quantity: (p.quantity || 0) - Number(it.qty) });
    }
    logAudit('SALE_' + kind.toUpperCase(), client_num, `inv=${inv} items=${items.length}`);
    return { invoice_num: inv, rows: results };
  }
  function getCashSales(clientNum) { return get(KEYS.cashSales, []).filter(s => Number(s.client_num) === Number(clientNum)); }
  function getNetworkSales(clientNum) { return get(KEYS.networkSales, []).filter(s => Number(s.client_num) === Number(clientNum)); }
  function getShopDebts(clientNum) { return get(KEYS.shopDebts, []).filter(d => Number(d.client_num) === Number(clientNum)); }
  function getCustomerDebts(clientNum, phone) {
    return getShopDebts(clientNum).filter(d => Number(d.customer_phone) === Number(phone));
  }
  function getDebtDetailsLimited(clientNum, phone, limit = 40) {
    return getCustomerDebts(clientNum, phone)
      .filter(d => Number(d.debt_amount) > Number(d.paid_amount || 0))
      .slice(0, limit);
  }
  function debtTotals(clientNum, phone) {
    const debts = getCustomerDebts(clientNum, phone);
    const total = debts.reduce((s, d) => s + Number(d.debt_amount), 0);
    const paid = debts.reduce((s, d) => s + Number(d.paid_amount || 0), 0);
    return { total, paid, remain: total - paid };
  }
  function payDebt(clientNum, phone, amount) {
    const debts = get(KEYS.shopDebts, []);
    const mine = debts.filter(d => Number(d.client_num) === Number(clientNum) && Number(d.customer_phone) === Number(phone))
      .sort((a, b) => new Date(a.debt_date) - new Date(b.debt_date));
    if (!mine.length) throw new Error('لا ديون لهذا العميل');
    let remaining = Number(amount);
    for (const debt of mine) {
      if (remaining <= 0) break;
      const debtRemain = Number(debt.debt_amount) - Number(debt.paid_amount || 0);
      if (debtRemain <= 0) continue;
      const toPay = Math.min(remaining, debtRemain);
      const idx = debts.findIndex(d => d.debt_id === debt.debt_id);
      debts[idx].paid_amount = (debts[idx].paid_amount || 0) + toPay;
      remaining -= toPay;
    }
    set(KEYS.shopDebts, debts);
    logAudit('DEBT_PAY', clientNum, `phone=${phone} amount=${amount}`);
  }
  function settleFullDebt(clientNum, phone) {
    const all = get(KEYS.shopDebts, []);
    const toArchive = all.filter(d => Number(d.client_num) === Number(clientNum) && Number(d.customer_phone) === Number(phone));
    if (toArchive.length) {
      const arch = get(KEYS.debtArchive, []);
      toArchive.forEach(d => arch.push({ ...d, reason: 'PAID_FULL', archived_at: now() }));
      set(KEYS.debtArchive, arch);
    }
    set(KEYS.shopDebts, all.filter(d => !(Number(d.client_num) === Number(clientNum) && Number(d.customer_phone) === Number(phone))));
    logAudit('DEBT_FULL', clientNum, `phone=${phone} archived=${toArchive.length}`);
  }
  function getDebtArchive(clientNum) {
    return get(KEYS.debtArchive, []).filter(d => Number(d.client_num) === Number(clientNum));
  }

  function getImports(clientNum) { return get(KEYS.imports, []).filter(i => Number(i.client_num) === Number(clientNum)); }
  function createImport(row) {
    const arr = get(KEYS.imports, []);
    const r = { import_id: generateId(), ...row, import_date: now() };
    arr.push(r); set(KEYS.imports, arr);
    const existing = findProductByName(row.product_name);
    const totalQty = Number(row.number_of_cartons) * Number(row.inside_carton);
    const bc = row.barcode ? String(row.barcode).trim() : null;
    if (existing) {
      updateProduct(existing.product_id, {
        price: Number(row.single_item_price), selling_price: Number(row.single_item_price),
        purchase_price: Number(row.item_cost), quantity: (existing.quantity || 0) + totalQty,
        units_per_carton: Number(row.inside_carton),
        barcode: bc || existing.barcode || null,
      });
    } else {
      createProduct({ product_name: row.product_name, price: Number(row.single_item_price),
        selling_price: Number(row.single_item_price), purchase_price: Number(row.item_cost),
        quantity: totalQty, units_per_carton: Number(row.inside_carton),
        barcode: bc });
    }
    logAudit('IMPORT', row.client_num, `${row.product_name} x${totalQty}`);
    return r;
  }

  function crudOps(key, idField) {
    return {
      list(clientNum) { return get(key, []).filter(r => Number(r.client_num) === Number(clientNum)); },
      create(row) {
        const arr = get(key, []);
        const r = { [idField]: generateId(), ...row, created_at: now() };
        arr.push(r); set(key, arr); return r;
      },
      update(id, patch) {
        const arr = get(key, []);
        const idx = arr.findIndex(r => r[idField] === Number(id));
        if (idx < 0) return null;
        arr[idx] = { ...arr[idx], ...patch };
        set(key, arr); return arr[idx];
      },
      delete(id, clientNum) {
        set(key, get(key, []).filter(r => !(r[idField] === Number(id) && Number(r.client_num) === Number(clientNum))));
      }
    };
  }
  const expenses = crudOps(KEYS.personalExpenses, 'expense_id');
  const incomes = crudOps(KEYS.personalIncome, 'income_id');
  const notes = crudOps(KEYS.personalNotes, 'note_id');
  const goals = crudOps(KEYS.personalGoals, 'goal_id');
  const obligations = crudOps(KEYS.personalObligations, 'obligation_id');

  const pdebts = {
    list(clientNum) { return get(KEYS.personalDebts, []).filter(r => Number(r.client_num) === Number(clientNum)); },
    create(row) {
      const arr = get(KEYS.personalDebts, []);
      const existing = arr.find(r =>
        Number(r.client_num) === Number(row.client_num) &&
        r.direction === row.direction &&
        r.person_name === row.person_name &&
        String(r.person_phone || '') === String(row.person_phone || '')
      );
      if (existing) {
        existing.amount = Number(existing.amount) + Number(row.amount);
        if (row.reason) existing.reason = row.reason;
        existing.last_update = now();
        set(KEYS.personalDebts, arr);
        return existing;
      }
      const r = { pdebt_id: generateId(), ...row, created_at: now(), last_update: now() };
      arr.push(r); set(KEYS.personalDebts, arr); return r;
    },
    update(id, patch) {
      const arr = get(KEYS.personalDebts, []);
      const idx = arr.findIndex(r => r.pdebt_id === Number(id));
      if (idx < 0) return null;
      arr[idx] = { ...arr[idx], ...patch, last_update: now() };
      set(KEYS.personalDebts, arr); return arr[idx];
    },
    delete(id, clientNum) {
      set(KEYS.personalDebts, get(KEYS.personalDebts, []).filter(r => !(r.pdebt_id === Number(id) && Number(r.client_num) === Number(clientNum))));
      set(KEYS.personalDebtPayments, get(KEYS.personalDebtPayments, []).filter(r => !(r.pdebt_id === Number(id) && Number(r.client_num) === Number(clientNum))));
    }
  };

  function recordDebtPayment(pdebtId, clientNum, amount, note = '') {
    const arr = get(KEYS.personalDebtPayments, []);
    const row = { payment_id: generateId(), pdebt_id: Number(pdebtId), client_num: Number(clientNum), amount: Number(amount), note: note || '', created_at: now() };
    arr.push(row); set(KEYS.personalDebtPayments, arr);
    return row;
  }
  function getDebtPayments(clientNum) {
    return get(KEYS.personalDebtPayments, []).filter(r => Number(r.client_num) === Number(clientNum));
  }

  function resetObligationsIfNeeded(clientNum) {
    const arr = get(KEYS.personalObligations, []);
    const nowY = new Date().getFullYear(), nowM = new Date().getMonth();
    let changed = false;
    arr.forEach(o => {
      if (Number(o.client_num) !== Number(clientNum)) return;
      if (!o.is_paid_this_month) return;
      const paid = o.last_paid_at ? new Date(o.last_paid_at) : null;
      if (!paid || paid.getFullYear() !== nowY || paid.getMonth() !== nowM) {
        o.is_paid_this_month = 0; changed = true;
      }
    });
    if (changed) set(KEYS.personalObligations, arr);
  }

  function getTopExpenseCategory(clientNum, inMonth = true) {
    const list = expenses.list(clientNum).filter(e => {
      if (!inMonth) return true;
      const d = new Date(e.created_at), n = new Date();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
    });
    const totals = {};
    list.forEach(e => { totals[e.category] = (totals[e.category] || 0) + Number(e.amount || 0); });
    let top = null, max = 0;
    for (const [cat, sum] of Object.entries(totals)) if (sum > max) { max = sum; top = cat; }
    return top ? { category: top, total: max } : null;
  }

  function addNotification(clientNum, title, body) {
    const arr = get(KEYS.notifications, []);
    arr.unshift({ id: generateId(), client_num: Number(clientNum), title, body, read: 0, created_at: now() });
    set(KEYS.notifications, arr);
  }
  function getNotifications(clientNum) {
    return get(KEYS.notifications, []).filter(n => Number(n.client_num) === Number(clientNum));
  }
  function markAllNotificationsRead(clientNum) {
    const arr = get(KEYS.notifications, []);
    let changed = false;
    arr.forEach(n => { if (Number(n.client_num) === Number(clientNum) && !n.read) { n.read = 1; changed = true; } });
    if (changed) set(KEYS.notifications, arr);
  }

  function addPaymentProof(reqId, clientNum, content) {
    const arr = get(KEYS.paymentProofs, []);
    const row = { id: generateId(), req_id: Number(reqId), client_num: Number(clientNum), content, created_at: now() };
    arr.push(row); set(KEYS.paymentProofs, arr); return row;
  }
  function getPaymentProofs(reqId) {
    return get(KEYS.paymentProofs, []).filter(p => Number(p.req_id) === Number(reqId));
  }

  function checkRemindersOnLogin(clientNum) {
    const c = findClient(clientNum);
    if (!c) return null;
    const st = subscriptionStatus(c);
    const dl = st.days;
    if (dl === null || dl < 0) return null;
    if (dl > 7) return null;
    const lastReminder = c.last_reminder_kind;
    let kind = null;
    if (dl <= 1) kind = 'D1';
    else if (dl <= 3) kind = 'D3';
    else if (dl <= 7) kind = 'D7';
    if (!kind || lastReminder === kind) return null;
    updateClient(clientNum, { last_reminder_kind: kind, last_reminder_at: now() });
    return {
      kind, days: dl,
      title: '⏰ تنبيه اشتراك',
      message: `ينتهي اشتراكك خلال <b>${dl} يوم</b>. جدّده الآن لتجنب التوقف.`,
    };
  }

  function logAudit(action, clientNum, details = '') {
    const arr = get(KEYS.auditLog, []);
    arr.unshift({ log_id: generateId(), client_num: clientNum, action, details, created_at: now() });
    if (arr.length > 2000) arr.length = 2000;
    set(KEYS.auditLog, arr);
  }
  function getAuditLog(limit = 100) { return get(KEYS.auditLog, []).slice(0, limit); }

  function getTotalCartonsImported(clientNum) {
    return getImports(clientNum).reduce((s, i) => s + Number(i.number_of_cartons || 0), 0);
  }

  function searchProductsByName(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return getProducts();
    return getProducts().filter(p => (p.product_name || '').toLowerCase().includes(q));
  }

  function getAllCustomersWithBalances(clientNum) {
    return getCustomers(clientNum).map(c => {
      const t = debtTotals(clientNum, c.customer_phone);
      return { ...c, total_debt: t.total, total_paid: t.paid, remain: t.remain };
    });
  }

  function getSalesByPeriod(clientNum, kind, period) {
    let sales;
    if (kind === 'cash') sales = getCashSales(clientNum);
    else if (kind === 'network') sales = getNetworkSales(clientNum);
    else sales = getShopDebts(clientNum);
    return sales.filter(s => {
      const dt = new Date(s.sale_date || s.debt_date);
      if (isNaN(dt.getTime())) return false;
      const now = new Date();
      if (period === 'today') return dt.toDateString() === now.toDateString();
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    });
  }

  function getDebtPaidTotal(clientNum, period) {
    return getShopDebts(clientNum).filter(d => {
      const dt = new Date(d.debt_date);
      if (isNaN(dt.getTime())) return false;
      const now = new Date();
      if (period === 'today') return dt.toDateString() === now.toDateString();
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).reduce((s, d) => s + Number(d.paid_amount || 0), 0);
  }

  function getImportsByPeriod(clientNum, period) {
    return getImports(clientNum).filter(i => {
      const dt = new Date(i.import_date);
      if (isNaN(dt.getTime())) return false;
      const now = new Date();
      if (period === 'today') return dt.toDateString() === now.toDateString();
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    });
  }

  function getProfitsByPeriod(clientNum, period) {
    const cash = getSalesByPeriod(clientNum, 'cash', period);
    const network = getSalesByPeriod(clientNum, 'network', period);
    const products = getProducts();
    let total = 0;
    [...cash, ...network].forEach(s => {
      const p = products.find(pr => (pr.product_name || '').toLowerCase() === (s.product_name || '').toLowerCase());
      if (p) {
        const cost = Number(p.purchase_price) || 0;
        total += (Number(s.single_price || 0) - cost) * Number(s.quantity || 0);
      }
    });
    return total;
  }

  function getBestSellingProduct(clientNum, period) {
    const all = [
      ...getSalesByPeriod(clientNum, 'cash', period),
      ...getSalesByPeriod(clientNum, 'network', period),
      ...getSalesByPeriod(clientNum, 'debt', period)
    ];
    const totals = {};
    all.forEach(s => {
      const name = s.product_name;
      if (name) totals[name] = (totals[name] || 0) + Number(s.quantity || 0);
    });
    let best = null, max = 0;
    for (const [name, qty] of Object.entries(totals)) {
      if (qty > max) { max = qty; best = name; }
    }
    return best ? { name: best, qty: max } : null;
  }

  function getProductMovement(clientNum) {
    const products = getProducts();
    const all = {
      today: [...getSalesByPeriod(clientNum, 'cash', 'today'), ...getSalesByPeriod(clientNum, 'network', 'today'), ...getSalesByPeriod(clientNum, 'debt', 'today')],
      month: [...getSalesByPeriod(clientNum, 'cash', 'month'), ...getSalesByPeriod(clientNum, 'network', 'month'), ...getSalesByPeriod(clientNum, 'debt', 'month')]
    };
    return products.map(p => {
      const name = (p.product_name || '').toLowerCase();
      const today = all.today.filter(s => (s.product_name || '').toLowerCase() === name).reduce((sum, s) => sum + Number(s.quantity || 0), 0);
      const month = all.month.filter(s => (s.product_name || '').toLowerCase() === name).reduce((sum, s) => sum + Number(s.quantity || 0), 0);
      return {
        ...p,
        today_sold: today,
        month_sold: month,
        profit_per_unit: (Number(p.price) || 0) - (Number(p.purchase_price) || 0)
      };
    });
  }

  function getAdvancedAnalytics(clientNum) {
    return {
      today_cash: getSalesByPeriod(clientNum, 'cash', 'today').reduce((s, x) => s + Number(x.total_amount || 0), 0),
      today_network: getSalesByPeriod(clientNum, 'network', 'today').reduce((s, x) => s + Number(x.total_amount || 0), 0),
      today_debt: getSalesByPeriod(clientNum, 'debt', 'today').reduce((s, x) => s + Number(x.debt_amount || 0), 0),
      month_cash: getSalesByPeriod(clientNum, 'cash', 'month').reduce((s, x) => s + Number(x.total_amount || 0), 0),
      month_network: getSalesByPeriod(clientNum, 'network', 'month').reduce((s, x) => s + Number(x.total_amount || 0), 0),
      month_new_debt: getSalesByPeriod(clientNum, 'debt', 'month').reduce((s, x) => s + Number(x.debt_amount || 0), 0),
      month_paid_debt: getDebtPaidTotal(clientNum, 'month'),
      total_remaining_debts: getShopDebts(clientNum).reduce((s, d) => s + Math.max(0, Number(d.debt_amount) - Number(d.paid_amount || 0)), 0)
    };
  }

  function runMigrations() {
    const clients = getAllClients();
    let changed = false;
    clients.forEach(c => {
      if (c.fail_count === undefined) { c.fail_count = 0; changed = true; }
      if (c.locked_until === undefined) { c.locked_until = null; changed = true; }
      if (c.last_reminder_kind === undefined) { c.last_reminder_kind = null; changed = true; }
      if (c.last_reminder_at === undefined) { c.last_reminder_at = null; changed = true; }
    });
    if (changed) set(KEYS.clients, clients);
    if (!get(KEYS.adminList, null)) getAdminList();
    updateSettings({});
  }

  function init() {
    if (!get(KEYS.settings)) setSettings(getSettings());
    if (!get(KEYS.rates)) setRates({ usd: 0, sar: 0 });
    runMigrations();
  }

  return {
    init, get, set, generateId, now, daysBetween, addMonths, addPrecise,
    hashPassword, verifyPassword, cleanText,
    norm, parseNum, parseFloatN,
    getSettings, setSettings, updateSettings, getRates, setRates,
    validateEmail, getRegistrationMode, canRegister,
    getAllClients, findClient, findClientByEmail, createClient, updateClient,
    updateClientNum, deleteClient, purgeClientData,
    getAdminList, isAdmin, addAdmin, removeAdmin,
    currentSession, setSession, clearSession, currentClient, login, logout,
    subscriptionStatus, durationLabel,
    createSubRequest, getSubRequests, pendingSubRequests, approveSubRequest,
    rejectSubRequest, cancelSubRequest, grantSubscription,
    addInquiry, getInquiries, deleteInquiry, clearInquiries,
    getProducts, findProduct, findProductByName, findProductByBarcode, createProduct, updateProduct,
    getCustomers, findCustomerByPhone, createCustomer,
    createSale, getCashSales, getNetworkSales, getShopDebts, getCustomerDebts,
    getDebtDetailsLimited, debtTotals, payDebt, settleFullDebt, getDebtArchive,
    getImports, createImport,
    expenses, incomes, pdebts, notes, goals, obligations,
    recordDebtPayment, getDebtPayments, resetObligationsIfNeeded, getTopExpenseCategory,
    addNotification, getNotifications, markAllNotificationsRead,
    addPaymentProof, getPaymentProofs,
    checkRemindersOnLogin,
    logAudit, getAuditLog,
    runMigrations,
    getTotalCartonsImported, searchProductsByName, getAllCustomersWithBalances,
    getSalesByPeriod, getDebtPaidTotal, getImportsByPeriod, getProfitsByPeriod,
    getBestSellingProduct, getProductMovement, getAdvancedAnalytics,
  };
})();

DB.init();

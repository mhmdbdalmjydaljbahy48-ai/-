const Notifs = {
  client: null,

  init() {
    this.client = UI.requireLogin();
    if (!this.client) return;
    document.getElementById('userAvatar').textContent = this.client.name.charAt(0);
    document.getElementById('userName').textContent = this.client.name;
    document.getElementById('userRole').textContent = this.client.account_type || 'مستخدم';
    
    if (DB.isAdmin(this.client.num) || this.client.is_admin) {
      document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'flex');
    }

    this.render();
  },

  render() {
    const list = DB.getNotifications(this.client.num).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const box = document.getElementById('notificationsList');

    if (list.length === 0) {
      box.innerHTML = '<div class="card text-center"><p class="text-muted mb-0">لا توجد إشعارات أو رسائل حالياً.</p></div>';
      return;
    }

    box.innerHTML = list.map(n => {
      // تحديد لون الإطار بناءً على نوع الإشعار
      let borderColor = 'var(--border-2)';
      let icon = 'info';
      let titleColor = 'var(--text)';

      if (n.type === 'red') { borderColor = 'var(--danger)'; icon = 'alert-circle'; titleColor = 'var(--danger)'; }
      else if (n.type === 'yellow') { borderColor = 'var(--amber)'; icon = 'alert-triangle'; titleColor = 'var(--amber)'; }
      else if (n.type === 'green') { borderColor = 'var(--success)'; icon = 'check-circle'; titleColor = 'var(--success)'; }
      else if (n.type === 'blue') { borderColor = '#3B82F6'; icon = 'bot'; titleColor = '#3B82F6'; }

      return `
      <div class="card mb-3" style="border-right: 5px solid ${borderColor}; position:relative;">
        <div class="flex-between mb-2">
          <h4 style="color:${titleColor}; margin:0; display:flex; align-items:center; gap:8px;">
            <i data-lucide="${icon}" style="width:20px;height:20px;"></i> ${UI.esc(n.title)}
          </h4>
          <button class="icon-btn" style="width:32px;height:32px; color:var(--danger);" onclick="Notifs.deleteOne(${n.id})" title="حذف الإشعار">
            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
          </button>
        </div>
        <p style="white-space: pre-wrap; margin-bottom:10px; color:var(--text-2);">${UI.esc(n.body)}</p>
        <small class="text-muted" style="display:block; text-align:left;">${UI.fmtDateTime(n.created_at)}</small>
      </div>`;
    }).join('');

    UI.fixIcons();
    // تعليم الكل كمقروء عند فتح الصفحة
    DB.markAllNotificationsRead(this.client.num);
  },

  deleteOne(id) {
    UI.confirm({
      title: 'حذف إشعار',
      message: 'هل تريد حذف هذا الإشعار نهائياً؟',
      danger: true,
      onConfirm: () => {
        DB.deleteNotification(id);
        UI.toast('تم الحذف', 'success');
        this.render();
      }
    });
  },

  clearAll() {
    UI.confirm({
      title: 'مسح جميع الإشعارات',
      message: 'هل تريد مسح جميع رسائلك وإشعاراتك؟ لا يمكن التراجع.',
      danger: true,
      onConfirm: () => {
        DB.clearNotifications(this.client.num);
        UI.toast('تم مسح جميع الإشعارات', 'success');
        this.render();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Notifs.init());

// ICB Census Administration Portal Application Logic

const state = {
  token: localStorage.getItem('icb_access_token') || '',
  admin: JSON.parse(localStorage.getItem('icb_admin_profile') || 'null'),
  currentView: 'dashboard',
  students: [],
  selectedStudentIds: new Set(),
  currentPage: 1,
  totalPages: 1,
  totalStudents: 0,
  pageSize: 20,
  activeFilters: {},
  stats: null
};

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const bgColors = {
    info: 'bg-slate-900 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-600 text-white'
  };

  const toast = document.createElement('div');
  toast.className = `${bgColors[type] || bgColors.info} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Universal API wrapper
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(endpoint, { ...options, headers });

    if (res.status === 401) {
      // Attempt token refresh
      const refreshed = await attemptRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${state.token}`;
        const retryRes = await fetch(endpoint, { ...options, headers });
        return handleResponse(retryRes);
      } else {
        logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return handleResponse(res);
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
}

async function handleResponse(res) {
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server request failed');
    }
    return data;
  }
  if (!res.ok) throw new Error(`Request returned status ${res.status}`);
  return res;
}

async function attemptRefreshToken() {
  try {
    const res = await fetch('/api/admin/refresh-token', { method: 'POST' });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) {
      state.token = data.accessToken;
      localStorage.setItem('icb_access_token', data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------

async function login(email, password) {
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-sm"></i> Authenticating...';

  try {
    const data = await apiRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    state.token = data.accessToken;
    state.admin = data.admin;
    localStorage.setItem('icb_access_token', data.accessToken);
    localStorage.setItem('icb_admin_profile', JSON.stringify(data.admin));

    initApp();
    showToast(`Welcome back, ${data.admin.name}!`, 'success');
  } catch (error) {
    // handled by apiRequest toast
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In to Console</span><i class="fa-solid fa-arrow-right text-xs"></i>';
  }
}

function logout() {
  state.token = '';
  state.admin = null;
  localStorage.removeItem('icb_access_token');
  localStorage.removeItem('icb_admin_profile');

  fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});

  document.getElementById('appContainer').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
}

// ----------------------------------------------------
// NAVIGATION & ROLE UI
// ----------------------------------------------------

function initApp() {
  if (!state.token || !state.admin) {
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    return;
  }

  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('hidden');

  // Set Profile Display
  document.getElementById('userName').textContent = state.admin.name || 'Administrator';
  document.getElementById('userInitial').textContent = (state.admin.name || 'A')[0].toUpperCase();
  document.getElementById('userRoleBadge').textContent = state.admin.role;

  // Role permissions
  const isSuperAdmin = state.admin.role === 'SuperAdmin';
  document.getElementById('nav-admins').classList.toggle('hidden', !isSuperAdmin);
  document.getElementById('nav-audit').classList.toggle('hidden', !isSuperAdmin);

  navigate('dashboard');
}

function navigate(viewName) {
  state.currentView = viewName;

  // Update navigation buttons styling
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.remove('bg-blue-600/20', 'text-blue-400');
  });
  const activeNav = document.getElementById(`nav-${viewName}`);
  if (activeNav) activeNav.classList.add('bg-blue-600/20', 'text-blue-400');

  // Toggle sections
  ['dashboard', 'students', 'admins', 'audit'].forEach((name) => {
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.toggle('hidden', name !== viewName);
  });

  const titles = {
    dashboard: 'Dashboard Overview',
    students: 'Student Census Records',
    admins: 'Administrator Management',
    audit: 'System Audit Trail'
  };
  document.getElementById('pageTitle').textContent = titles[viewName] || 'Census Admin';

  refreshCurrentView();
}

function refreshCurrentView() {
  if (state.currentView === 'dashboard') loadDashboardStats();
  if (state.currentView === 'students') loadStudents();
  if (state.currentView === 'admins') loadAdmins();
  if (state.currentView === 'audit') loadAuditLogs();
}

// ----------------------------------------------------
// DASHBOARD VIEW
// ----------------------------------------------------

async function loadDashboardStats() {
  try {
    const data = await apiRequest('/api/admin/dashboard/stats');
    state.stats = data;

    document.getElementById('statTotal').textContent = data.totalStudents || 0;
    document.getElementById('statVerified').textContent = data.statusCounts?.Verified || 0;
    document.getElementById('statScholarship').textContent = data.scholarshipRecipients || 0;
    document.getElementById('statScholarship2').textContent = data.scholarshipRecipients || 0;
    document.getElementById('statDisability').textContent = data.disabilities || 0;
    document.getElementById('statOrphans').textContent = data.orphans || 0;

    const devPct = data.digitalAccess?.devicePercentage || 0;
    const intPct = data.digitalAccess?.internetPercentage || 0;
    document.getElementById('statDevicePct').textContent = `${devPct}%`;
    document.getElementById('barDevice').style.width = `${devPct}%`;
    document.getElementById('statInternetPct').textContent = `${intPct}%`;
    document.getElementById('barInternet').style.width = `${intPct}%`;

    // Render Class Breakdown
    const classContainer = document.getElementById('classBreakdownContainer');
    classContainer.innerHTML = '';
    const classes = data.byClass || [];
    if (classes.length === 0) {
      classContainer.innerHTML = '<p class="text-xs text-slate-400">No enrollment records yet.</p>';
    } else {
      const maxCount = Math.max(...classes.map((c) => c.count), 1);
      classes.forEach((c) => {
        const pct = Math.round((c.count / maxCount) * 100);
        const row = document.createElement('div');
        row.className = 'space-y-1';
        row.innerHTML = `
          <div class="flex justify-between text-xs">
            <span class="font-medium text-slate-700">${c._id ? `Class ${c._id}` : 'Unassigned'}</span>
            <span class="font-bold text-slate-900">${c.count}</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${pct}%"></div>
          </div>
        `;
        classContainer.appendChild(row);
      });
    }

    // Status breakdown
    const statusContainer = document.getElementById('statusBreakdownContainer');
    statusContainer.innerHTML = '';
    const statuses = [
      { name: 'Submitted', color: 'bg-blue-500' },
      { name: 'Under Review', color: 'bg-amber-500' },
      { name: 'Verified', color: 'bg-emerald-500' },
      { name: 'Rejected', color: 'bg-rose-500' }
    ];
    statuses.forEach((st) => {
      const count = data.statusCounts?.[st.name] || 0;
      const el = document.createElement('div');
      el.className = 'flex items-center justify-between text-xs py-1';
      el.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${st.color}"></span>
          <span class="text-slate-600">${st.name}</span>
        </div>
        <span class="font-bold text-slate-800">${count}</span>
      `;
      statusContainer.appendChild(el);
    });

    // Shift breakdown
    const shiftContainer = document.getElementById('shiftBreakdownContainer');
    shiftContainer.innerHTML = '';
    (data.byShift || []).forEach((sh) => {
      const el = document.createElement('div');
      el.className = 'flex items-center justify-between text-xs py-1';
      el.innerHTML = `
        <span class="text-slate-600">${sh._id || 'Standard Shift'}</span>
        <span class="font-bold text-slate-800">${sh.count}</span>
      `;
      shiftContainer.appendChild(el);
    });
  } catch (error) {
    // handled
  }
}

// ----------------------------------------------------
// STUDENT RECORDS VIEW & FILTERING
// ----------------------------------------------------

async function loadStudents() {
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Querying records...</td></tr>';

  const params = new URLSearchParams({
    page: state.currentPage,
    limit: state.pageSize,
    ...state.activeFilters
  });

  const searchVal = document.getElementById('searchInput')?.value?.trim();
  if (searchVal) params.set('search', searchVal);

  try {
    const data = await apiRequest(`/api/admin/students?${params.toString()}`);
    state.students = data.items || [];
    state.totalPages = data.pages || 1;
    state.totalStudents = data.total || 0;

    renderStudentTable();
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-rose-500">Failed to load student records.</td></tr>';
  }
}

function renderStudentTable() {
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = '';

  if (state.students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-slate-400">No student census records matched this filter.</td></tr>';
    updatePaginationUI();
    return;
  }

  const isSuperAdmin = state.admin?.role === 'SuperAdmin';
  const isRegistrar = state.admin?.role === 'Registrar';
  const canEdit = isSuperAdmin || isRegistrar;

  state.students.forEach((s) => {
    const isChecked = state.selectedStudentIds.has(s._id);
    const personal = s.personalDetails || {};
    const edu = s.educationalDetails || {};

    const statusBadgeClasses = {
      Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
      'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
      Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
    };

    const tr = document.createElement('tr');
    tr.className = `hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-blue-50/40' : ''}`;
    tr.innerHTML = `
      <td class="p-3 text-center">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleStudentSelection('${s._id}', this.checked)" class="rounded border-slate-300">
      </td>
      <td class="p-3 font-mono">
        <div class="font-bold text-slate-800">${edu.admissionNumber || 'N/A'}</div>
        <div class="text-[10px] text-slate-400">${s.submissionReference}</div>
      </td>
      <td class="p-3">
        <div class="font-semibold text-slate-900">${personal.studentName || 'Unnamed'}</div>
        <div class="text-[10px] text-slate-500">${personal.cnicOrFormBNumber || 'No CNIC'}</div>
      </td>
      <td class="p-3 font-medium text-slate-700">
        ${edu.class ? `Class ${edu.class}` : '—'} ${edu.section ? `(${edu.section})` : ''}
      </td>
      <td class="p-3 text-slate-600">${edu.shift || 'Morning'}</td>
      <td class="p-3 text-slate-600">${personal.gender || '—'}</td>
      <td class="p-3">
        <span class="inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusBadgeClasses[s.submissionStatus] || 'bg-slate-100'}">
          ${s.submissionStatus}
        </span>
      </td>
      <td class="p-3 text-slate-500">${s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'N/A'}</td>
      <td class="p-3 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="viewStudentDetails('${s._id}')" title="View Full Bio-Data" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
            <i class="fa-solid fa-eye text-xs"></i>
          </button>
          <a href="/api/admin/students/${s._id}/print" target="_blank" title="Print Official Sheet" class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">
            <i class="fa-solid fa-print text-xs"></i>
          </a>
          ${canEdit ? `
            <button onclick="changeStudentStatusPrompt('${s._id}', '${s.submissionStatus}')" title="Update Status" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
          ` : ''}
          ${isSuperAdmin ? `
            <button onclick="deleteStudentRecord('${s._id}')" title="Soft-Delete" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          ` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updatePaginationUI();
  updateBulkBar();
}

function updatePaginationUI() {
  const start = state.totalStudents === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1;
  const end = Math.min(state.currentPage * state.pageSize, state.totalStudents);

  document.getElementById('pageStart').textContent = start;
  document.getElementById('pageEnd').textContent = end;
  document.getElementById('totalStudentsCount').textContent = state.totalStudents;
  document.getElementById('currentPageNum').textContent = state.currentPage;
  document.getElementById('totalPagesNum').textContent = state.totalPages;

  document.getElementById('prevPageBtn').disabled = state.currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = state.currentPage >= state.totalPages;
}

function changePage(delta) {
  const target = state.currentPage + delta;
  if (target >= 1 && target <= state.totalPages) {
    state.currentPage = target;
    loadStudents();
  }
}

// ----------------------------------------------------
// BULK OPERATIONS & SELECTIONS
// ----------------------------------------------------

function toggleSelectAll(checkbox) {
  if (checkbox.checked) {
    state.students.forEach((s) => state.selectedStudentIds.add(s._id));
  } else {
    state.selectedStudentIds.clear();
  }
  renderStudentTable();
}

function toggleStudentSelection(id, checked) {
  if (checked) {
    state.selectedStudentIds.add(id);
  } else {
    state.selectedStudentIds.delete(id);
  }
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  const count = state.selectedStudentIds.size;
  document.getElementById('selectedCount').textContent = count;
  bar.classList.toggle('hidden', count === 0);
}

async function applyBulkStatus() {
  const status = document.getElementById('bulkStatusSelect').value;
  if (!status) return showToast('Please select a target status', 'warning');

  const ids = Array.from(state.selectedStudentIds);
  if (ids.length === 0) return;

  try {
    const data = await apiRequest('/api/admin/students/bulk-status-update', {
      method: 'POST',
      body: JSON.stringify({ ids, status })
    });
    showToast(`Updated status to ${status} for ${data.updated} students`, 'success');
    state.selectedStudentIds.clear();
    loadStudents();
  } catch (error) {
    // handled
  }
}

async function bulkPrintSelected() {
  const ids = Array.from(state.selectedStudentIds);
  if (ids.length === 0) return showToast('Select at least one record to print', 'warning');

  try {
    const res = await fetch('/api/admin/students/bulk-print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify({ ids })
    });

    if (!res.ok) throw new Error('Bulk print generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function exportCurrentSelection(format = 'xlsx') {
  const ids = Array.from(state.selectedStudentIds);
  const payload = ids.length > 0 ? { ids, format } : { filter: state.activeFilters, format };

  try {
    showToast(`Generating ${format.toUpperCase()} export...`, 'info');
    const res = await fetch('/api/admin/students/bulk-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Export generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icb-census-export.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Export downloaded successfully', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ----------------------------------------------------
// STUDENT DETAIL MODAL
// ----------------------------------------------------

async function viewStudentDetails(studentId) {
  try {
    const s = await apiRequest(`/api/admin/students/${studentId}`);
    const modal = document.getElementById('studentDetailModal');
    const modalContent = document.getElementById('modalContent');

    document.getElementById('modalStudentName').textContent = s.personalDetails?.studentName || 'Student Bio-Data';
    document.getElementById('modalStudentRef').textContent = `Reference: ${s.submissionReference} | Adm: ${s.educationalDetails?.admissionNumber || 'N/A'}`;
    document.getElementById('modalStudentStatus').textContent = s.submissionStatus;
    document.getElementById('modalPrintBtn').onclick = () => window.open(`/api/admin/students/${s._id}/print`, '_blank');

    const p = s.personalDetails || {};
    const d = s.domicileInformation || {};
    const present = s.address?.present || {};
    const perm = s.address?.permanent || {};
    const r = s.religionLanguageDetails || {};
    const par = s.parentGuardian || {};
    const f = par.father || {};
    const m = par.mother || {};
    const orphan = par.orphanGuardian || {};
    const edu = s.educationalDetails || {};
    const sib = s.siblingDetails || {};
    const trans = s.transportScholarship || {};
    const health = s.healthDetails || {};
    const dig = s.digitalAccess || {};

    modalContent.innerHTML = `
      <!-- Section 1 -->
      <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
        <h4 class="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
          <i class="fa-solid fa-user text-blue-600"></i> 1. Personal Identification
        </h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><span class="text-slate-400 block text-[10px]">Student Name</span><strong class="text-slate-800">${p.studentName || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">CNIC / Form-B</span><strong class="text-slate-800">${p.cnicOrFormBNumber || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Gender</span><strong class="text-slate-800">${p.gender || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Date of Birth</span><strong class="text-slate-800">${p.dateOfBirth ? p.dateOfBirth.split('T')[0] : 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Birth Province</span><strong class="text-slate-800">${p.provinceOfBirth || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Birth District</span><strong class="text-slate-800">${p.districtOfBirth || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Nationality</span><strong class="text-slate-800">${d.nationality || 'Pakistani'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Domicile</span><strong class="text-slate-800">${d.domicileProvince || 'N/A'} (${d.domicileDistrict || 'N/A'})</strong></div>
        </div>
      </div>

      <!-- Section 2 -->
      <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
        <h4 class="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
          <i class="fa-solid fa-location-dot text-blue-600"></i> 2. Residential Addresses
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-3 bg-white rounded-lg border border-slate-200">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Present Address</span>
            <p class="text-slate-800 mt-1">${present.houseNo ? `H# ${present.houseNo}, ` : ''}${present.streetNo ? `St# ${present.streetNo}, ` : ''}${present.sectorSocietyVillageName || ''}, ${present.city || 'Islamabad'}</p>
            <p class="text-[11px] text-slate-500 mt-1">Phone: ${present.contactNumber || 'N/A'}</p>
          </div>
          <div class="p-3 bg-white rounded-lg border border-slate-200">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Permanent Address</span>
            <p class="text-slate-800 mt-1">${perm.houseNo ? `H# ${perm.houseNo}, ` : ''}${perm.streetNo ? `St# ${perm.streetNo}, ` : ''}${perm.sectorSocietyVillageName || ''}, ${perm.city || 'Islamabad'}</p>
            <p class="text-[11px] text-slate-500 mt-1">Phone: ${perm.contactNumber || 'N/A'}</p>
          </div>
        </div>
      </div>

      <!-- Section 3 & 4 -->
      <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
        <h4 class="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
          <i class="fa-solid fa-people-roof text-blue-600"></i> 3. Parent & Guardian Information
        </h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><span class="text-slate-400 block text-[10px]">Father's Name</span><strong class="text-slate-800">${f.name || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Father's Profession</span><strong class="text-slate-800">${f.profession || 'N/A'} ${f.bps ? `(BPS-${f.bps})` : ''}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Father's CNIC</span><strong class="text-slate-800">${f.cnic || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Father's Monthly Income</span><strong class="text-slate-800">${f.incomePerMonth || 'N/A'}</strong></div>

          <div><span class="text-slate-400 block text-[10px]">Mother's Name</span><strong class="text-slate-800">${m.name || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Mother's Profession</span><strong class="text-slate-800">${m.profession || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Mother's CNIC</span><strong class="text-slate-800">${m.cnic || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Orphan Status</span><strong class="text-slate-800">${orphan.isOrphan ? `Yes (${orphan.orphanType || 'Registered'})` : 'No'}</strong></div>
        </div>
      </div>

      <!-- Section 5 -->
      <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
        <h4 class="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
          <i class="fa-solid fa-book-open text-blue-600"></i> 4. Educational & College Records
        </h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><span class="text-slate-400 block text-[10px]">Admission #</span><strong class="text-slate-800">${edu.admissionNumber || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Class & Section</span><strong class="text-slate-800">${edu.class || 'N/A'} - ${edu.section || 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Shift</span><strong class="text-slate-800">${edu.shift || 'Morning'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Medium & Mode</span><strong class="text-slate-800">${edu.mediumOfInstruction || 'English'} (${edu.modeOfStudy || 'Regular'})</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Last Class Result</span><strong class="text-slate-800">${edu.resultPercentageLastClass ? `${edu.resultPercentageLastClass}%` : 'N/A'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Transport Facility</span><strong class="text-slate-800">${trans.transportFacility || 'None'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Scholarship</span><strong class="text-slate-800">${trans.recipientOfScholarship === 'Yes' ? 'Yes' : 'No'}</strong></div>
          <div><span class="text-slate-400 block text-[10px]">Siblings in ICB</span><strong class="text-slate-800">${sib.siblingsSameInstitution || 0}</strong></div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  } catch (error) {
    // handled
  }
}

function closeStudentModal() {
  document.getElementById('studentDetailModal').classList.add('hidden');
}

async function changeStudentStatusPrompt(studentId, currentStatus) {
  const newStatus = prompt(`Update status for student:\nCurrent: ${currentStatus}\nEnter one of: Submitted, Under Review, Verified, Rejected`, currentStatus);
  if (!newStatus || newStatus === currentStatus) return;

  if (!['Submitted', 'Under Review', 'Verified', 'Rejected'].includes(newStatus)) {
    return showToast('Invalid status value entered', 'error');
  }

  try {
    await apiRequest(`/api/admin/students/${studentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Status updated to ${newStatus}`, 'success');
    loadStudents();
  } catch (error) {
    // handled
  }
}

async function deleteStudentRecord(studentId) {
  if (!confirm('Are you sure you want to soft-delete this student census record?')) return;

  try {
    await apiRequest(`/api/admin/students/${studentId}`, { method: 'DELETE' });
    showToast('Record deleted successfully', 'success');
    loadStudents();
  } catch (error) {
    // handled
  }
}

// ----------------------------------------------------
// ADMIN MANAGEMENT (SuperAdmin only)
// ----------------------------------------------------

async function loadAdmins() {
  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Querying accounts...</td></tr>';

  try {
    const admins = await apiRequest('/api/admin/admins');
    tbody.innerHTML = '';

    if (admins.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">No administrator accounts found.</td></tr>';
      return;
    }

    admins.forEach((adm) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition-colors';
      tr.innerHTML = `
        <td class="p-3 font-semibold text-slate-900">${adm.name}</td>
        <td class="p-3 font-mono text-slate-600">${adm.email}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${adm.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-700' : adm.role === 'Registrar' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}">
            ${adm.role}
          </span>
        </td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${adm.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
            ${adm.isActive !== false ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td class="p-3 text-slate-500">${new Date(adm.createdAt).toLocaleDateString()}</td>
        <td class="p-3 text-slate-500">${adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleDateString() : 'Never'}</td>
        <td class="p-3 text-right">
          <button onclick="toggleAdminStatus('${adm._id}', ${adm.isActive !== false})" class="px-2.5 py-1 text-xs rounded border hover:bg-slate-50 font-medium">
            ${adm.isActive !== false ? 'Disable' : 'Enable'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    // handled
  }
}

function openCreateAdminModal() {
  document.getElementById('createAdminModal').classList.remove('hidden');
}

function closeCreateAdminModal() {
  document.getElementById('createAdminModal').classList.add('hidden');
}

async function handleCreateAdmin(e) {
  e.preventDefault();
  const name = document.getElementById('newAdminName').value.trim();
  const email = document.getElementById('newAdminEmail').value.trim();
  const password = document.getElementById('newAdminPassword').value;
  const role = document.getElementById('newAdminRole').value;

  try {
    await apiRequest('/api/admin/create-admin', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });
    showToast(`Administrator ${name} created`, 'success');
    closeCreateAdminModal();
    loadAdmins();
  } catch (error) {
    // handled
  }
}

async function toggleAdminStatus(id, currentActive) {
  try {
    await apiRequest(`/api/admin/admins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !currentActive })
    });
    showToast(`Account ${!currentActive ? 'activated' : 'disabled'}`, 'info');
    loadAdmins();
  } catch (error) {
    // handled
  }
}

// ----------------------------------------------------
// AUDIT LOG VIEWER
// ----------------------------------------------------

async function loadAuditLogs() {
  const tbody = document.getElementById('auditTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Querying audit trails...</td></tr>';

  const action = document.getElementById('auditActionFilter')?.value || '';
  const params = new URLSearchParams({ limit: 100 });
  if (action) params.set('action', action);

  try {
    const data = await apiRequest(`/api/admin/audit-log?${params.toString()}`);
    const logs = data.logs || [];
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">No audit events recorded.</td></tr>';
      return;
    }

    const actionColors = {
      VIEW: 'bg-slate-100 text-slate-700',
      EDIT: 'bg-amber-100 text-amber-700',
      PRINT: 'bg-blue-100 text-blue-700',
      EXPORT: 'bg-emerald-100 text-emerald-700',
      DELETE: 'bg-rose-100 text-rose-700'
    };

    logs.forEach((log) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition-colors';
      tr.innerHTML = `
        <td class="p-3 font-mono text-slate-500">${new Date(log.timestamp).toLocaleString()}</td>
        <td class="p-3 font-semibold text-slate-900">${log.adminId?.name || 'Unknown'} <span class="text-[10px] text-slate-400">(${log.adminId?.email || 'N/A'})</span></td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${actionColors[log.action] || 'bg-slate-100'}">${log.action}</span>
        </td>
        <td class="p-3 text-slate-700">${log.details || '—'}</td>
        <td class="p-3 font-mono text-slate-400">${log.ipAddress || '—'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    // handled
  }
}

// ----------------------------------------------------
// FILTER DRAWER & SEARCH
// ----------------------------------------------------

function toggleFilterDrawer() {
  document.getElementById('filterDrawer').classList.toggle('hidden');
}

function clearFilters() {
  ['filterClass', 'filterGender', 'filterShift', 'filterStatus', 'filterScholarship', 'filterDisability'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  state.activeFilters = {};
  state.currentPage = 1;
  updateActiveFilterBadge();
  loadStudents();
}

function updateActiveFilterBadge() {
  const activeCount = Object.keys(state.activeFilters).length;
  const badge = document.getElementById('activeFilterBadge');
  badge.textContent = activeCount;
  badge.classList.toggle('hidden', activeCount === 0);
}

// ----------------------------------------------------
// EVENT LISTENERS INITIALIZATION
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;
      login(email, pass);
    });
  }

  // Create Admin Form
  const createAdminForm = document.getElementById('createAdminForm');
  if (createAdminForm) {
    createAdminForm.addEventListener('submit', handleCreateAdmin);
  }

  // Search input debounced
  let searchTimeout = null;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.currentPage = 1;
        loadStudents();
      }, 400);
    });
  }

  // Filter dropdown listeners
  ['filterClass', 'filterGender', 'filterShift', 'filterStatus', 'filterScholarship', 'filterDisability'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const keyMap = {
          filterClass: 'class',
          filterGender: 'gender',
          filterShift: 'shift',
          filterStatus: 'submissionStatus',
          filterScholarship: 'recipientOfScholarship',
          filterDisability: 'hasMajorDisability'
        };
        const paramKey = keyMap[id];
        if (el.value) {
          state.activeFilters[paramKey] = el.value;
        } else {
          delete state.activeFilters[paramKey];
        }
        state.currentPage = 1;
        updateActiveFilterBadge();
        loadStudents();
      });
    }
  });

  initApp();
});

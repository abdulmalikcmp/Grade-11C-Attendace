// manager.js — class manager dashboard

let currentUser = null;

async function loadUser() {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) {
    window.location.href = 'index.html';
    return;
  }
  const data = await res.json();
  currentUser = data.user;

  if (currentUser.role !== 'manager') {
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('welcomeText').textContent = `Hi, ${currentUser.name.split(' ')[1] || currentUser.name}`;
  loadToday();
  loadHistory();
  loadStats();
}

function initialsAvatar(name) {
  const initial = name.charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <rect width="120" height="120" fill="#1a1f5c"/>
    <text x="50%" y="50%" fill="#f5e6b8" font-size="50" font-family="Arial" text-anchor="middle" dy=".35em">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

async function loadToday() {
  const grid = document.getElementById('studentsGrid');
  const summaryGrid = document.getElementById('summaryGrid');
  try {
    const res = await apiFetch('/api/attendance/today');
    const data = await res.json();

    const total = data.students.length;
    const present = data.students.filter((s) => s.status === 'present').length;
    const absent = total - present;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    summaryGrid.innerHTML = `
      <div class="stat-card"><div class="num">${total}</div><div class="label">Total Students</div></div>
      <div class="stat-card present"><div class="num">${present}</div><div class="label">Present Today</div></div>
      <div class="stat-card absent"><div class="num">${absent}</div><div class="label">Absent Today</div></div>
      <div class="stat-card"><div class="num">${pct}%</div><div class="label">Attendance %</div></div>
    `;

    grid.innerHTML = '';
    data.students.forEach((s) => {
      const isPresent = s.status === 'present';
      const card = document.createElement('div');
      card.className = 'student-card';
      card.innerHTML = `
        <img class="avatar" src="images/${s.name.toLowerCase()}.jpg"
             onerror="this.src='${initialsAvatar(s.name)}'" alt="${s.name}">
        <h4>${s.name}</h4>
        <div class="role-tag">Grade 11C Student</div>
        <div class="status-pill ${isPresent ? 'present' : 'absent'}">
          ${isPresent ? 'Present ✓' : 'Absent'}
        </div>
        <div class="time-note">${isPresent ? 'Checked in at ' + s.time : 'Not checked in yet'}</div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = '<div class="empty-note">Could not load today\'s attendance.</div>';
  }
}

async function loadHistory(dateFilter) {
  const body = document.getElementById('historyBody');
  body.innerHTML = '<tr><td colspan="4" class="empty-note">Loading...</td></tr>';
  try {
    const url = dateFilter ? `/api/attendance/history?date=${dateFilter}` : '/api/attendance/history';
    const res = await apiFetch(url);
    const data = await res.json();

    if (data.records.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="empty-note">No attendance records found.</td></tr>';
      return;
    }

    body.innerHTML = data.records
      .map(
        (r) => `
      <tr>
        <td>${r.name}</td>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td><span class="status-pill present" style="padding:3px 10px;">${r.status}</span></td>
      </tr>`
      )
      .join('');
  } catch (err) {
    body.innerHTML = '<tr><td colspan="4" class="empty-note">Could not load history.</td></tr>';
  }
}

async function loadStats() {
  const body = document.getElementById('statsBody');
  try {
    const res = await apiFetch('/api/attendance/stats');
    const data = await res.json();

    body.innerHTML = data.stats
      .map(
        (s) => `
      <tr>
        <td>${s.name}</td>
        <td>${s.days_present} / ${s.total_days}</td>
        <td style="min-width:140px;">
          ${s.percentage}%
          <div class="percent-bar"><div class="percent-bar-fill" style="width:${s.percentage}%"></div></div>
        </td>
      </tr>`
      )
      .join('');
  } catch (err) {
    body.innerHTML = '<tr><td colspan="3" class="empty-note">Could not load statistics.</td></tr>';
  }
}

document.getElementById('filterBtn').addEventListener('click', () => {
  const date = document.getElementById('dateFilter').value;
  if (date) loadHistory(date);
});
document.getElementById('clearFilterBtn').addEventListener('click', () => {
  document.getElementById('dateFilter').value = '';
  loadHistory();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

loadUser();

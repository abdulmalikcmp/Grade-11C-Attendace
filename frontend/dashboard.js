// dashboard.js — student dashboard

let currentUser = null;

async function loadUser() {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) {
    window.location.href = 'index.html';
    return;
  }
  const data = await res.json();
  currentUser = data.user;

  if (currentUser.role !== 'student') {
    window.location.href = 'manager.html';
    return;
  }

  document.getElementById('welcomeText').textContent = `Hi, ${currentUser.name}`;
  loadRoster();
}

async function loadRoster() {
  const grid = document.getElementById('studentsGrid');
  try {
    const res = await apiFetch('/api/attendance/roster');
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();

    grid.innerHTML = '';
    data.students.forEach((s) => {
      grid.appendChild(buildStudentCard(s));
    });
  } catch (err) {
    grid.innerHTML = '<div class="empty-note">Could not load student list. Please refresh.</div>';
  }
}

function buildStudentCard(s) {
  const card = document.createElement('div');
  const isSelf = currentUser.id === s.student_id;
  card.className = 'student-card' + (isSelf ? ' is-self' : '');

  const isPresent = s.status === 'present';

  card.innerHTML = `
    <img class="avatar" src="images/${s.name.toLowerCase()}.jpg"
         onerror="this.src='${initialsAvatar(s.name)}'" alt="${s.name}">
    <h4>${s.name}${isSelf ? ' (You)' : ''}</h4>
    <div class="role-tag">Grade 11C Student</div>
    <div class="status-pill ${isPresent ? 'present' : 'absent'}">
      ${isPresent ? 'Present Today ✓' : 'Not marked yet'}
    </div>
    <div id="action-${s.student_id}"></div>
  `;

  const actionSlot = card.querySelector(`#action-${s.student_id}`);
  if (isSelf) {
    if (isPresent) {
      actionSlot.innerHTML = `<div class="time-note">Marked at ${s.time}</div>`;
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn-mark';
      btn.textContent = '✓ Mark Present';
      btn.addEventListener('click', () => markPresent(btn));
      actionSlot.appendChild(btn);
    }
  } else {
    actionSlot.innerHTML = `<div class="time-note">${isPresent ? 'Marked at ' + s.time : 'Only ' + s.name + ' can mark her own attendance'}</div>`;
  }

  return card;
}

function initialsAvatar(name) {
  const initial = name.charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <rect width="120" height="120" fill="#1a1f5c"/>
    <text x="50%" y="50%" fill="#f5e6b8" font-size="50" font-family="Arial" text-anchor="middle" dy=".35em">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

async function markPresent(btn) {
  btn.disabled = true;
  btn.textContent = 'Marking...';
  try {
    const res = await apiFetch('/api/attendance/mark', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Could not mark attendance.');
      btn.disabled = false;
      btn.textContent = '✓ Mark Present';
      return;
    }
    loadRoster();
  } catch (err) {
    alert('Could not reach the server.');
    btn.disabled = false;
    btn.textContent = '✓ Mark Present';
  }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

loadUser();

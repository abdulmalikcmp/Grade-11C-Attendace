// auth.js — handles the login / sign-up page

const alertBox = document.getElementById('alertBox');

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert show ${type}`;
}
function hideAlert() {
  alertBox.className = 'alert';
}

// ----- Tabs -----
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.form-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + 'Panel').classList.add('active');
    hideAlert();
  });
});

// ----- Sign-up role toggle -----
const signupRole = document.getElementById('signupRole');
const studentNameGroup = document.getElementById('studentNameGroup');
const managerNameGroup = document.getElementById('managerNameGroup');
signupRole.addEventListener('change', () => {
  if (signupRole.value === 'manager') {
    studentNameGroup.style.display = 'none';
    managerNameGroup.style.display = 'block';
  } else {
    studentNameGroup.style.display = 'block';
    managerNameGroup.style.display = 'none';
  }
});

// ----- Login -----
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || 'Login failed. Please check your details.');
      return;
    }
    redirectByRole(data.user.role);
  } catch (err) {
    showAlert('Could not reach the server. Is the backend running?');
  }
});

// ----- Sign up -----
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const role = signupRole.value;
  const name = role === 'manager'
    ? document.getElementById('managerName').value.trim()
    : document.getElementById('studentName').value;
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || 'Could not create account.');
      return;
    }
    redirectByRole(data.user.role);
  } catch (err) {
    showAlert('Could not reach the server. Is the backend running?');
  }
});

// ----- Forgot password -----
document.getElementById('forgotBtn').addEventListener('click', () => {
  showAlert(
    'Password resets are handled by Mr. Abdulmalik (Class Manager) from the Manager Dashboard. Please contact him directly.',
    'success'
  );
});

function redirectByRole(role) {
  window.location.href = role === 'manager' ? 'manager.html' : 'dashboard.html';
}

// If already logged in, skip straight to the right dashboard
(async function checkExistingSession() {
  try {
    const res = await apiFetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      redirectByRole(data.user.role);
    }
  } catch (err) {
    // not logged in / server not reachable yet — stay on this page
  }
})();

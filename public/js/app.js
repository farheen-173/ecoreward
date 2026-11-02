/**
 * EcoReward - Student Application Client
 * Clean, lightweight, responsive client logic
 */

const State = {
  currentStudent: null,
  selectedBottles: 1,
  rewards: []
};

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type} toast-show`;
  toast.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal Handlers
function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('modal-open');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('modal-open'));
  document.body.style.overflow = '';
}

// App Initialization
async function initApp() {
  setupEventListeners();
  loadStoredStudentSession();

  await Promise.all([
    fetchStats(),
    fetchRewards(),
    fetchLeaderboard()
  ]);

  renderRegistrationQR();
  handleUrlParams();
}

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'register' && !State.currentStudent) {
    openModal('register-modal');
  } else if (params.get('action') === 'claim') {
    if (State.currentStudent) openClaimModal();
    else openModal('login-modal');
  }
}

function loadStoredStudentSession() {
  const saved = localStorage.getItem('ecoreward_student');
  if (saved) {
    try {
      State.currentStudent = JSON.parse(saved);
      renderStudentUI();
      refreshStudentData();
    } catch (e) {
      localStorage.removeItem('ecoreward_student');
    }
  } else {
    renderStudentUI();
  }
}

async function fetchStats() {
  try {
    const stats = await API.getStats();
    const bottlesEl = document.getElementById('stat-total-bottles');
    const pointsEl = document.getElementById('stat-total-points');
    const co2El = document.getElementById('stat-total-co2');
    const studentsEl = document.getElementById('stat-active-students');

    if (bottlesEl) bottlesEl.textContent = stats.totalBottles;
    if (pointsEl) pointsEl.textContent = stats.totalPoints;
    if (co2El) co2El.textContent = `${stats.totalCO2Kg} kg`;
    if (studentsEl) studentsEl.textContent = stats.activeStudents;
  } catch (e) {
    console.warn(e);
  }
}

async function fetchRewards() {
  try {
    const data = await API.getRewards();
    State.rewards = data.rewards || [];
    renderRewards(State.rewards);
  } catch (e) {
    console.warn(e);
  }
}

async function fetchLeaderboard() {
  try {
    const data = await API.getLeaderboard();
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    const list = data.leaderboard || [];
    container.innerHTML = list.map((s, idx) => {
      const isYou = State.currentStudent && State.currentStudent.id === s.id;
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      return `
        <div class="leaderboard-item ${isYou ? 'current-user-rank' : ''}">
          <div class="rank-badge">${medal}</div>
          <div class="leader-info">
            <div class="leader-name">${s.name} ${isYou ? '<span class="you-tag">(You)</span>' : ''}</div>
            <div class="leader-sub">${s.grade || 'Student'} • 🍾 ${s.totalBottles || 0} bottles</div>
          </div>
          <div class="leader-points">
            <span class="points-val">${s.points}</span>
            <span class="points-lbl">Pts</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn(e);
  }
}

async function refreshStudentData() {
  if (!State.currentStudent) return;
  try {
    const data = await API.getStudentProfile(State.currentStudent.id);
    State.currentStudent = data.student;
    localStorage.setItem('ecoreward_student', JSON.stringify(data.student));
    renderStudentUI();
    renderClaims(data.claims || []);
    renderSurpriseProgress(data.student.points || 0);
    renderRedemptions(data.redemptions || []);
  } catch (e) {
    console.warn(e);
  }
}

function renderSurpriseProgress(currentPoints) {
  const container = document.getElementById('student-surprise-progress');
  if (!container) return;

  const surpriseRewards = State.rewards || [];
  if (!surpriseRewards.length) return;

  container.innerHTML = surpriseRewards.map(r => {
    const pct = Math.min(100, Math.round((currentPoints / r.pointsCost) * 100));
    const isUnlocked = currentPoints >= r.pointsCost;

    return `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 700; font-size: 0.9rem; color: #064e3b;">${r.icon} ${r.title}</span>
          <span style="font-size: 0.8rem; font-weight: 700; color: ${isUnlocked ? '#059669' : '#64748b'};">
            ${isUnlocked ? 'Ready to Unlock! 🎉' : `${currentPoints} / ${r.pointsCost} Pts`}
          </span>
        </div>
        <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 6px;">
          <div style="width: ${pct}%; height: 100%; background: ${isUnlocked ? '#10b981' : '#34d399'};"></div>
        </div>
        ${isUnlocked ? `
          <button class="btn btn-xs btn-primary" style="margin-top: 4px;" onclick="claimSurpriseGift('${r.id}')">
            🎁 Unlock Now (${r.pointsCost} Pts)
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderRedemptions(redemptions) {
  const container = document.getElementById('student-redemptions-list');
  if (!container) return;

  if (!redemptions || !redemptions.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <h5 style="font-size: 0.92rem; color: #064e3b; margin-top: 10px; margin-bottom: 8px;">Active Gift Claim Vouchers:</h5>
    ${redemptions.map(r => `
      <div class="redemption-card">
        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px;">
          <span>🎁 ${r.rewardTitle}</span>
          <span style="color: #059669;">-${r.pointsSpent} Pts</span>
        </div>
        <div class="voucher-box">
          <span style="font-size: 0.75rem; color: #64748b;">GIFT CLAIM CODE:</span>
          <code style="font-size: 1.05rem; font-weight: 800; color: #064e3b;">${r.code}</code>
          <button class="btn btn-xs btn-outline" onclick="copyGiftCode('${r.code}')">Copy</button>
        </div>
        <div style="font-size: 0.75rem; color: #64748b;">Show this code to the school green team to collect your surprise gift!</div>
      </div>
    `).join('')}
  `;
}

function renderStudentUI() {
  const loggedOutNav = document.getElementById('nav-logged-out');
  const loggedInNav = document.getElementById('nav-logged-in');
  const dashboard = document.getElementById('student-dashboard-section');

  if (State.currentStudent) {
    if (loggedOutNav) loggedOutNav.style.display = 'none';
    if (loggedInNav) loggedInNav.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'block';

    const s = State.currentStudent;
    const nameEl = document.getElementById('dash-name');
    const emailEl = document.getElementById('dash-email');
    const gradeEl = document.getElementById('dash-grade');
    const pointsEl = document.getElementById('dash-points');
    const bottlesEl = document.getElementById('dash-bottles');
    const co2El = document.getElementById('dash-co2');

    if (nameEl) nameEl.textContent = s.name;
    if (emailEl) emailEl.textContent = s.email;
    if (gradeEl) gradeEl.textContent = s.grade || 'Student';
    if (pointsEl) pointsEl.textContent = s.points;
    if (bottlesEl) bottlesEl.textContent = s.totalBottles || 0;
    if (co2El) co2El.textContent = `${(s.co2SavedKg || 0).toFixed(2)} kg`;
  } else {
    if (loggedOutNav) loggedOutNav.style.display = 'flex';
    if (loggedInNav) loggedInNav.style.display = 'none';
    if (dashboard) dashboard.style.display = 'none';
  }
}

function renderRewards(rewards) {
  const container = document.getElementById('rewards-grid');
  if (!container) return;

  container.innerHTML = rewards.map(r => {
    const userPts = State.currentStudent ? State.currentStudent.points : 0;
    const canAfford = userPts >= r.pointsCost;

    return `
      <div class="reward-card">
        <div class="reward-icon-circle">${r.icon}</div>
        <span class="reward-category">SURPRISE REWARD</span>
        <h4 class="reward-title">${r.title}</h4>
        <p class="reward-desc">${r.description}</p>
        <div class="reward-bottom">
          <div class="reward-cost">
            <span class="cost-num">${r.pointsCost}</span>
            <span class="cost-unit">Points</span>
          </div>
          <button 
            class="btn btn-sm ${canAfford ? 'btn-primary' : 'btn-secondary'}" 
            ${!canAfford ? 'disabled' : ''}
            onclick="claimSurpriseGift('${r.id}')"
          >
            ${canAfford ? 'Unlock Surprise Gift' : `Need ${r.pointsCost - userPts} Pts`}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderClaims(claims) {
  const container = document.getElementById('student-claims-list');
  if (!container) return;

  if (!claims.length) {
    container.innerHTML = `<p style="color: #64748b; font-size: 0.88rem; padding: 10px 0;">No bottles deposited yet. Drop a bottle in the dustbin and click Claim Reward!</p>`;
    return;
  }

  container.innerHTML = claims.slice(0, 8).map(c => {
    const isApp = c.status === 'approved';
    const isRej = c.status === 'rejected';
    const badgeClass = isApp ? 'badge-approved' : isRej ? 'badge-rejected' : 'badge-pending';
    const badgeText = isApp ? 'Approved ✅' : isRej ? 'Rejected ❌' : 'Pending Admin Approval ⏳';
    const time = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
      <div class="claim-history-row">
        <div class="claim-icon">${isApp ? '🍾' : '⏳'}</div>
        <div class="claim-details">
          <div class="claim-title">${c.bottles} Bottle${c.bottles > 1 ? 's' : ''} Deposited</div>
          <div class="claim-time">${time} • Claim #${c.id}</div>
        </div>
        <div class="claim-status-block">
          <span class="claim-badge ${badgeClass}">${badgeText}</span>
          <span class="claim-pts-val">+${c.pointsRequested} Pts</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderRedemptions(redemptions) {
  const container = document.getElementById('student-redemptions-list');
  if (!container) return;

  if (!redemptions.length) {
    container.innerHTML = `<p style="color: #64748b; font-size: 0.88rem; padding: 10px 0;">No surprise gifts unlocked yet. Keep recycling bottles to earn points!</p>`;
    return;
  }

  container.innerHTML = redemptions.map(r => `
    <div class="redemption-card">
      <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 6px;">
        <span>🎁 ${r.rewardTitle}</span>
        <span style="color: #059669;">-${r.pointsSpent} Pts</span>
      </div>
      <div class="voucher-box">
        <span style="font-size: 0.75rem; color: #64748b;">GIFT CLAIM CODE:</span>
        <code style="font-size: 1.05rem; font-weight: 800; color: #064e3b;">${r.code}</code>
        <button class="btn btn-xs btn-outline" onclick="copyGiftCode('${r.code}')">Copy</button>
      </div>
      <div style="font-size: 0.75rem; color: #64748b;">Show this code to the school green team to receive your mystery gift!</div>
    </div>
  `).join('');
}

// Bottle Claim Handlers
function openClaimModal() {
  if (!State.currentStudent) {
    showToast('Please log in with your email first!', 'info');
    openModal('login-modal');
    return;
  }
  setBottleCount(1);
  openModal('claim-modal');
}

function setBottleCount(num) {
  State.selectedBottles = Math.max(1, Math.min(10, num));
  const countEl = document.getElementById('claim-bottle-count');
  const ptsEl = document.getElementById('claim-points-calc');
  if (countEl) countEl.textContent = State.selectedBottles;
  if (ptsEl) ptsEl.textContent = `+${State.selectedBottles * 10} Eco-Points`;
}

async function submitBottleClaim() {
  if (!State.currentStudent) return;
  const btn = document.getElementById('btn-submit-bottle');
  if (btn) btn.disabled = true;

  try {
    const res = await API.submitClaim({
      studentId: State.currentStudent.id,
      bottles: State.selectedBottles
    });

    closeModal('claim-modal');
    showToast('✅ Bottle drop recorded! Queued for School Admin approval.', 'success');
    await refreshStudentData();
    await fetchStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Surprise Gift Redemption
async function claimSurpriseGift(rewardId) {
  if (!State.currentStudent) {
    showToast('Please log in to redeem surprise gifts!', 'info');
    openModal('login-modal');
    return;
  }

  const gift = State.rewards.find(r => r.id === rewardId);
  if (!gift) return;

  if (!confirm(`Unlock "${gift.title}" for ${gift.pointsCost} Eco-Points?`)) return;

  try {
    const res = await API.redeemReward({
      studentId: State.currentStudent.id,
      rewardId
    });

    showToast(`🎉 Surprise Gift Unlocked! Claim Code: ${res.voucherCode}`, 'success');
    await refreshStudentData();
    await fetchRewards();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function copyGiftCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast('Copied claim code to clipboard!', 'info');
  });
}

function logoutStudent() {
  State.currentStudent = null;
  localStorage.removeItem('ecoreward_student');
  renderStudentUI();
  showToast('Logged out.', 'info');
}

// Generate Registration QR Code (Pure JS)
function renderRegistrationQR() {
  const qrTarget = `${window.location.origin}/#registration-box`;
  if (window.EcoQR) {
    window.EcoQR.renderToElement('reg-qr-code-img', qrTarget, {
      cellSize: 5,
      margin: 1,
      fgColor: '#064e3b'
    });
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Bottle counter buttons
  const minusBtn = document.getElementById('btn-minus-bottle');
  const plusBtn = document.getElementById('btn-plus-bottle');
  if (minusBtn) minusBtn.addEventListener('click', () => setBottleCount(State.selectedBottles - 1));
  if (plusBtn) plusBtn.addEventListener('click', () => setBottleCount(State.selectedBottles + 1));

  // Submit bottle claim
  const submitClaimBtn = document.getElementById('btn-submit-bottle');
  if (submitClaimBtn) submitClaimBtn.addEventListener('click', submitBottleClaim);

  // Student Registration Form
  const regForm = document.getElementById('student-reg-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-student-name').value.trim();
      const email = document.getElementById('reg-student-email').value.trim();
      const grade = document.getElementById('reg-student-grade').value.trim();

      try {
        const res = await API.registerStudent({ name, email, grade });
        State.currentStudent = res.student;
        localStorage.setItem('ecoreward_student', JSON.stringify(res.student));
        closeModal('register-modal');
        showToast(res.message, 'success');
        renderStudentUI();
        await refreshStudentData();
        await fetchStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Student Login Form (Simply using Email!)
  const loginForm = document.getElementById('student-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-student-email').value.trim();

      try {
        const res = await API.loginStudent({ email });
        State.currentStudent = res.student;
        localStorage.setItem('ecoreward_student', JSON.stringify(res.student));
        closeModal('login-modal');
        showToast(`Welcome back, ${res.student.name}!`, 'success');
        renderStudentUI();
        await refreshStudentData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Backdrop modal close
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', (e) => {
      if (e.target === bd) closeAllModals();
    });
  });
}

document.addEventListener('DOMContentLoaded', initApp);

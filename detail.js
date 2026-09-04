let currentRollState = null;
let currentCharacter = null;
let loadedStatuses = [];

window.addEventListener('DOMContentLoaded', () => {
  renderCharacterDetail();
});

async function renderCharacterDetail() {
  const container = document.getElementById('detailContainer');
  
  const storedId = localStorage.getItem('selectedCharacterId');
  const charId = storedId ? Number(storedId) : null;

  if (!charId) {
    container.innerHTML = '<p class="error-state">No character selected.</p>';
    return;
  }

  // Fetch status options from statuses.json
  try {
    const statusRes = await fetch('./statuses.json').catch(() => null);
    if (statusRes && statusRes.ok) {
      loadedStatuses = await statusRes.json();
    }
  } catch (err) {
    console.error('Failed to load statuses.json', err);
  }

  const characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
  currentCharacter = characters.find(c => c.id === charId);

  if (!currentCharacter) {
    container.innerHTML = '<p class="error-state">Character not found in local storage.</p>';
    return;
  }

  if (typeof currentCharacter.adversityTokens !== 'number') {
    currentCharacter.adversityTokens = 0;
  }

  if (typeof currentCharacter.notes !== 'string') {
    currentCharacter.notes = '';
  }

  if (!currentCharacter.status && loadedStatuses.length > 0) {
    currentCharacter.status = loadedStatuses[0].id;
  }

  const activeStatusObj = getStatusObject(currentCharacter.status);
  const bonuses = (currentCharacter.class && currentCharacter.class.bonuses) ? currentCharacter.class.bonuses : {};

  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-title-row">
          <h2>${escapeHtml(currentCharacter.name)}</h2>
          ${currentCharacter.class ? `<span class="class-badge">${escapeHtml(currentCharacter.class.name)}</span>` : ''}
        </div>
      </div>

      <!-- Interactive Health Status Card Button -->
      <button class="status-card-btn" onclick="openStatusModal()">
        <div class="status-card-header">
          <span class="status-card-label">Health Status</span>
          <span id="statusCardValue" class="status-card-value">${escapeHtml(activeStatusObj ? activeStatusObj.label : 'Select Status')} &rsaquo;</span>
        </div>
        <div id="statusCardDesc" class="status-card-desc">
          ${escapeHtml(activeStatusObj ? activeStatusObj.description : 'Tap to change status condition.')}
        </div>
      </button>

      <!-- Adversity Tokens Tracker -->
      <div class="token-tracker">
        <span class="token-label">Adversity Tokens</span>
        <div class="token-controls">
          <button class="token-btn" id="subTokenBtn" onclick="adjustAdversityTokens(-1)">&minus;</button>
          <span id="tokenCount" class="token-count">${currentCharacter.adversityTokens}</span>
          <button class="token-btn" onclick="adjustAdversityTokens(1)">&plus;</button>
        </div>
      </div>

      <!-- Dice Roll Output Banner -->
      <div id="rollBanner" class="roll-banner">
        <span class="roll-stat">Tap a stat box to roll</span>
        <div id="rollResult" class="roll-result">-</div>
      </div>

      <!-- Stat Buttons with Class Bonus Tags -->
      <div class="stats-container">
        ${renderStatButton('Brain', currentCharacter.stats.brain, bonuses.brain)}
        ${renderStatButton('Brawn', currentCharacter.stats.brawn, bonuses.brawn)}
        ${renderStatButton('Fight', currentCharacter.stats.fight, bonuses.fight)}
        ${renderStatButton('Flight', currentCharacter.stats.flight, bonuses.flight)}
        ${renderStatButton('Grit', currentCharacter.stats.grit, bonuses.grit)}
        ${renderStatButton('Charm', currentCharacter.stats.charm, bonuses.charm)}
      </div>

      <!-- Class & Skills Information Cards -->
      <div class="skills-section">
        ${currentCharacter.class && currentCharacter.class.description ? `
          <div class="skill-card">
            <div class="skill-title">Class Description</div>
            <div class="skill-name">${escapeHtml(currentCharacter.class.name)}</div>
            <div class="skill-description">${escapeHtml(currentCharacter.class.description)}</div>
          </div>
        ` : ''}

        ${(currentCharacter.skills && currentCharacter.skills.length > 0) ? currentCharacter.skills.map(skill => `
          <div class="skill-card">
            <div class="skill-title">Special Skill</div>
            <div class="skill-name">${escapeHtml(skill.name)}</div>
            <div class="skill-description">${escapeHtml(skill.description)}</div>
          </div>
        `).join('') : ''}
      </div>

      <!-- Character Notes Section -->
      <div class="notes-section">
        <div class="notes-header">
          <span class="notes-title">Character Notes</span>
          <span id="notesStatus" class="notes-status">Saved!</span>
        </div>
        <textarea id="characterNotes" class="notes-textarea" placeholder="Write character notes, inventory, or story details here...">${escapeHtml(currentCharacter.notes)}</textarea>
        <button type="button" class="btn-save-notes" onclick="saveNotes()">Save Notes</button>
      </div>
    </div>
  `;

  updateTokenButtonState();
}

function getStatusObject(statusId) {
  return loadedStatuses.find(s => s.id === statusId) || null;
}

/* Modal Functions */
function openStatusModal() {
  const modalList = document.getElementById('statusModalList');
  if (!modalList) return;

  modalList.innerHTML = loadedStatuses.map(status => `
    <div class="status-option-item ${currentCharacter && currentCharacter.status === status.id ? 'selected' : ''}" 
         onclick="selectStatusFromModal('${status.id}')">
      <div class="status-option-header">
        <span class="status-option-title">${escapeHtml(status.label)}</span>
        ${currentCharacter && currentCharacter.status === status.id ? '<span style="color:#60a5fa; font-weight:bold;">✓ Active</span>' : ''}
      </div>
      <div class="status-option-desc">${escapeHtml(status.description)}</div>
    </div>
  `).join('');

  document.getElementById('statusModal').classList.add('active');
}

function closeStatusModal() {
  document.getElementById('statusModal').classList.remove('active');
}

function closeStatusModalOnOverlay(event) {
  if (event.target.id === 'statusModal') {
    closeStatusModal();
  }
}

function selectStatusFromModal(newStatusId) {
  if (!currentCharacter) return;

  currentCharacter.status = newStatusId;

  // Persist update in localStorage
  const characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
  const index = characters.findIndex(c => c.id === currentCharacter.id);
  if (index !== -1) {
    characters[index].status = newStatusId;
    localStorage.setItem('pwa_characters', JSON.stringify(characters));
  }

  // Update card UI on character page
  const selectedObj = getStatusObject(newStatusId);
  if (selectedObj) {
    const valEl = document.getElementById('statusCardValue');
    const descEl = document.getElementById('statusCardDesc');

    if (valEl) valEl.innerHTML = `${escapeHtml(selectedObj.label)} &rsaquo;`;
    if (descEl) descEl.textContent = selectedObj.description;
  }

  closeStatusModal();
}

function renderStatButton(statName, diceSides, bonusVal) {
  const bonus = bonusVal ? Number(bonusVal) : 0;
  const bonusLabel = bonus > 0 ? `<span class="stat-bonus-tag">(+${bonus})</span>` : '';

  return `
    <button class="stat-btn" data-stat="${statName}" onclick="rollDice('${statName}', ${diceSides}, ${bonus})">
      <div class="stat-title">${statName}</div>
      <div class="stat-value">d${diceSides}${bonusLabel}</div>
    </button>
  `;
}

function adjustAdversityTokens(amount) {
  if (!currentCharacter) return;

  const newCount = Math.max(0, (currentCharacter.adversityTokens || 0) + amount);
  currentCharacter.adversityTokens = newCount;

  document.getElementById('tokenCount').textContent = newCount;
  updateTokenButtonState();

  const characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
  const index = characters.findIndex(c => c.id === currentCharacter.id);
  if (index !== -1) {
    characters[index].adversityTokens = newCount;
    localStorage.setItem('pwa_characters', JSON.stringify(characters));
  }
}

function updateTokenButtonState() {
  const subBtn = document.getElementById('subTokenBtn');
  if (subBtn && currentCharacter) {
    subBtn.disabled = currentCharacter.adversityTokens <= 0;
  }
}

function saveNotes() {
  if (!currentCharacter) return;

  const textarea = document.getElementById('characterNotes');
  const notesContent = textarea ? textarea.value : '';

  currentCharacter.notes = notesContent;

  const characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
  const index = characters.findIndex(c => c.id === currentCharacter.id);
  if (index !== -1) {
    characters[index].notes = notesContent;
    localStorage.setItem('pwa_characters', JSON.stringify(characters));
  }

  const statusEl = document.getElementById('notesStatus');
  if (statusEl) {
    statusEl.classList.add('visible');
    setTimeout(() => {
      statusEl.classList.remove('visible');
    }, 2000);
  }
}

function rollDice(statName, diceSides, bonus = 0) {
  const sides = Number(diceSides);
  if (!sides) return;

  const rollVal = Math.floor(Math.random() * sides) + 1;
  const isMaxRoll = (rollVal === sides);

  if (currentRollState && currentRollState.statName === statName && currentRollState.canExplode) {
    currentRollState.rolls.push(rollVal);
    currentRollState.diceTotal += rollVal;
    currentRollState.canExplode = isMaxRoll;
  } else {
    currentRollState = {
      statName: statName,
      sides: sides,
      bonus: bonus,
      rolls: [rollVal],
      diceTotal: rollVal,
      canExplode: isMaxRoll
    };
  }

  updateRollUI();
}

function updateRollUI() {
  const bannerStat = document.querySelector('.roll-stat');
  const resultDisplay = document.getElementById('rollResult');
  const statButtons = document.querySelectorAll('.stat-btn');

  const { statName, sides, bonus, rolls, diceTotal, canExplode } = currentRollState;
  const hasExploded = rolls.length > 1 || canExplode;
  const finalTotal = diceTotal + bonus;

  statButtons.forEach(btn => btn.classList.remove('active-exploding'));

  if (canExplode) {
    const activeBtn = document.querySelector(`.stat-btn[data-stat="${statName}"]`);
    if (activeBtn) activeBtn.classList.add('active-exploding');
  }

  const bonusText = bonus > 0 ? ` + ${bonus} bonus` : '';
  const rollFormula = `[${rolls.join(' + ')}]${bonusText}`;

  if (canExplode) {
    bannerStat.textContent = `${statName} (d${sides}) — Max Roll! Tap to explode! ${rollFormula}`;
  } else if (rolls.length > 1) {
    bannerStat.textContent = `${statName} (d${sides}) — Exploded Total ${rollFormula}`;
  } else {
    bannerStat.textContent = `${statName} (d${sides}) ${bonusText}`;
  }

  resultDisplay.textContent = finalTotal;
  resultDisplay.className = 'roll-result';

  if (canExplode) {
    resultDisplay.classList.add('crit-max');
  } else if (hasExploded) {
    resultDisplay.classList.add('crit-exploded');
  } else if (diceTotal === 1) {
    resultDisplay.classList.add('crit-min');
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, match => {
    const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return escapeMap[match];
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}
window.addEventListener('online', () => {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'REFRESH_CACHE' });
  }
});
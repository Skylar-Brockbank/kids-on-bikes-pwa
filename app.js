let loadedClasses = [];
let loadedSkills = [];
let editingModalSkills = [];

window.addEventListener('DOMContentLoaded', () => {
  loadDataAndRender();
});

async function loadDataAndRender() {
  try {
    const [classesRes, skillsRes] = await Promise.all([
      fetch('./classes.json').catch(() => null),
      fetch('./skills.json').catch(() => null)
    ]);

    if (classesRes && classesRes.ok) loadedClasses = await classesRes.json();
    if (skillsRes && skillsRes.ok) loadedSkills = await skillsRes.json();
  } catch (err) {
    console.error('Error preloading JSON resources:', err);
  }

  renderRoster();
  setupModalListeners();
}

function renderRoster() {
  const container = document.getElementById('characterList');
  const characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');

  if (characters.length === 0) {
    container.innerHTML = '<p class="empty-state">No characters created yet. Tap "+ Create" to build one.</p>';
    return;
  }

  container.innerHTML = characters.map(char => `
    <div class="card" onclick="viewCharacter(${char.id})">
      <div class="card-info">
        <div class="card-title-row">
          <span class="card-name">${escapeHtml(char.name)}</span>
          ${char.class ? `<span class="class-badge">${escapeHtml(char.class.name)}</span>` : ''}
        </div>
        <div class="card-stats">
          Tokens: ${char.adversityTokens || 0} | Skills: ${(char.skills || []).length}
        </div>
      </div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="openEditModal(${char.id})">Edit</button>
        <button class="btn-icon btn-delete" onclick="deleteCharacter(${char.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function viewCharacter(id) {
  localStorage.setItem('selectedCharacterId', id);
  window.location.href = 'detail';
}

function deleteCharacter(id) {
  if (!confirm('Are you sure you want to delete this character?')) return;

  let characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
  characters = characters.filter(c => c.id !== id);
  localStorage.setItem('pwa_characters', JSON.stringify(characters));
  renderRoster();
}

function openEditModal(id) {
  const characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
  const char = characters.find(c => c.id === id);
  if (!char) return;

  document.getElementById('editCharId').value = char.id;
  document.getElementById('editName').value = char.name;
  document.getElementById('editTokens').value = char.adversityTokens || 0;

  // Populate Class Select Options
  const classSelect = document.getElementById('editClass');
  classSelect.innerHTML = '<option value="">-- None --</option>' +
    loadedClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  classSelect.value = char.class ? char.class.id : '';

  // Populate Stat Options (d4 to d20)
  const diceOptions = ['4', '6', '8', '10', '12', '20'];
  const statKeys = ['brain', 'brawn', 'fight', 'flight', 'grit', 'charm'];

  statKeys.forEach(key => {
    const selectEl = document.getElementById(`edit${key.charAt(0).toUpperCase() + key.slice(1)}`);
    selectEl.innerHTML = diceOptions.map(val => `<option value="${val}">d${val}</option>`).join('');
    selectEl.value = char.stats[key] || '6';
  });

  // Copy skills into editable array
  editingModalSkills = Array.isArray(char.skills) ? [...char.skills] : [];
  updateModalSkillsUI();

  document.getElementById('editModal').classList.remove('hidden');
}

function updateModalSkillsUI() {
  const skillSelect = document.getElementById('editSkillSelect');
  const addBtn = document.getElementById('editAddSkillBtn');
  const listContainer = document.getElementById('editSkillsList');

  // Filter unassigned skills
  const available = loadedSkills.filter(s => !editingModalSkills.some(es => es.id === s.id));

  if (available.length === 0) {
    skillSelect.innerHTML = '<option value="">-- All Skills Added --</option>';
    addBtn.disabled = true;
  } else {
    skillSelect.innerHTML = '<option value="">-- Select Skill --</option>' +
      available.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    addBtn.disabled = true;
  }

  listContainer.innerHTML = editingModalSkills.map(skill => `
    <div class="skill-tag-modal">
      <span>${escapeHtml(skill.name)}</span>
      <button type="button" class="btn-remove-sm" onclick="removeModalSkill('${skill.id}')">&times;</button>
    </div>
  `).join('');
}

function removeModalSkill(skillId) {
  editingModalSkills = editingModalSkills.filter(s => s.id !== skillId);
  updateModalSkillsUI();
}

function setupModalListeners() {
  const skillSelect = document.getElementById('editSkillSelect');
  const addBtn = document.getElementById('editAddSkillBtn');

  skillSelect.addEventListener('change', () => {
    addBtn.disabled = !skillSelect.value;
  });

  addBtn.addEventListener('click', () => {
    const chosen = loadedSkills.find(s => s.id === skillSelect.value);
    if (chosen && !editingModalSkills.some(s => s.id === chosen.id)) {
      editingModalSkills.push(chosen);
      updateModalSkillsUI();
    }
  });

  document.getElementById('editForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const id = Number(document.getElementById('editCharId').value);
    const characters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
    const index = characters.findIndex(c => c.id === id);

    if (index === -1) return;

    const selectedClassId = document.getElementById('editClass').value;
    const chosenClass = loadedClasses.find(c => c.id === selectedClassId) || null;

    characters[index] = {
      ...characters[index],
      name: document.getElementById('editName').value,
      class: chosenClass,
      adversityTokens: Number(document.getElementById('editTokens').value),
      stats: {
        brain: document.getElementById('editBrain').value,
        brawn: document.getElementById('editBrawn').value,
        fight: document.getElementById('editFight').value,
        flight: document.getElementById('editFlight').value,
        grit: document.getElementById('editGrit').value,
        charm: document.getElementById('editCharm').value
      },
      skills: [...editingModalSkills]
    };

    localStorage.setItem('pwa_characters', JSON.stringify(characters));
    closeEditModal();
    renderRoster();
  });
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
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
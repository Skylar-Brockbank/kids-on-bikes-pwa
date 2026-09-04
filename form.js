let selects = [];
let statusDiv = null;
let loadedClasses = [];
let loadedSkills = [];
let selectedSkills = [];

function updateDropdownOptions() {
  const selectedValues = selects
    .map(select => select.value)
    .filter(val => val !== '');

  selects.forEach(select => {
    const currentVal = select.value;

    Array.from(select.options).forEach(option => {
      if (!option.value) return;

      if (selectedValues.includes(option.value) && option.value !== currentVal) {
        option.disabled = true;
      } else {
        option.disabled = false;
      }
    });
  });
}

async function loadClassOptions() {
  const classSelect = document.getElementById('characterClass');
  try {
    const response = await fetch('./classes.json');
    loadedClasses = await response.json();

    classSelect.innerHTML = '<option value="">-- Select a Class --</option>' +
      loadedClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  } catch (err) {
    console.error('Failed to load classes:', err);
    classSelect.innerHTML = '<option value="">Failed to load classes</option>';
  }
}

function handleClassSelectionChange() {
  const classSelect = document.getElementById('characterClass');
  const descArea = document.getElementById('classDescription');
  const chosen = loadedClasses.find(c => c.id === classSelect.value);

  if (chosen) {
    const bonusText = Object.entries(chosen.bonuses || {})
      .map(([stat, val]) => `+${val} to ${stat.toUpperCase()}`)
      .join(', ');

    descArea.value = `${chosen.description}\nBonus: ${bonusText || 'None'}`;
  } else {
    descArea.value = '';
  }
}

async function loadSkillOptions() {
  const skillSelect = document.getElementById('characterSkill');
  try {
    const response = await fetch('./skills.json');
    loadedSkills = await response.json();

    populateSkillDropdown();
  } catch (err) {
    console.error('Failed to load skills:', err);
    skillSelect.innerHTML = '<option value="">Failed to load skills</option>';
  }
}

function populateSkillDropdown() {
  const skillSelect = document.getElementById('characterSkill');
  const availableSkills = loadedSkills.filter(
    skill => !selectedSkills.some(s => s.id === skill.id)
  );

  if (availableSkills.length === 0) {
    skillSelect.innerHTML = '<option value="">-- All Skills Added --</option>';
  } else {
    skillSelect.innerHTML = '<option value="">-- Select a Skill --</option>' +
      availableSkills.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  }

  handleSkillSelectionChange();
}

function handleSkillSelectionChange() {
  const skillSelect = document.getElementById('characterSkill');
  const addBtn = document.getElementById('addSkillBtn');
  const descArea = document.getElementById('skillDescription');
  
  const chosen = loadedSkills.find(s => s.id === skillSelect.value);

  if (chosen) {
    descArea.value = chosen.description;
    addBtn.disabled = false;
  } else {
    descArea.value = '';
    addBtn.disabled = true;
  }
}

function addSelectedSkill() {
  const skillSelect = document.getElementById('characterSkill');
  const chosen = loadedSkills.find(s => s.id === skillSelect.value);

  if (chosen && !selectedSkills.some(s => s.id === chosen.id)) {
    selectedSkills.push(chosen);
    renderSelectedSkills();
    populateSkillDropdown();
  }
}

function removeSkill(skillId) {
  selectedSkills = selectedSkills.filter(s => s.id !== skillId);
  renderSelectedSkills();
  populateSkillDropdown();
}

function renderSelectedSkills() {
  const container = document.getElementById('selectedSkillsList');
  if (selectedSkills.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = selectedSkills.map(skill => `
    <div class="skill-tag">
      <div class="skill-tag-info">
        <span class="skill-tag-name">${escapeHtml(skill.name)}</span>
        <span class="skill-tag-desc">${escapeHtml(skill.description)}</span>
      </div>
      <button type="button" class="btn-remove" onclick="removeSkill('${skill.id}')" title="Remove Skill">&times;</button>
    </div>
  `).join('');
}

function handleFormSubmit(event) {
  event.preventDefault();

  const classSelectId = document.getElementById('characterClass').value;
  const selectedClass = loadedClasses.find(c => c.id === classSelectId) || null;

  const newCharacter = {
    id: Date.now(),
    name: document.getElementById('username').value,
    class: selectedClass,
    stats: {
      brain: document.getElementById('rank1').value,
      brawn: document.getElementById('rank2').value,
      fight: document.getElementById('rank3').value,
      flight: document.getElementById('rank4').value,
      grit: document.getElementById('rank5').value,
      charm: document.getElementById('rank6').value
    },
    skills: [...selectedSkills],
    adversityTokens: 0,
    timestamp: new Date().toISOString()
  };

  const existingCharacters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
  existingCharacters.push(newCharacter);
  localStorage.setItem('pwa_characters', JSON.stringify(existingCharacters));

  statusDiv.textContent = 'Character saved locally!';
  window.location.href = 'index';
  document.getElementById('offlineForm').reset();
  selectedSkills = [];
  renderSelectedSkills();
  populateSkillDropdown();
  document.getElementById('classDescription').value = '';
  updateDropdownOptions();

  setTimeout(() => {
    statusDiv.textContent = '';
  }, 2000);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, match => {
    const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return escapeMap[match];
  });
}

window.addEventListener('DOMContentLoaded', () => {
  selects = Array.from(document.querySelectorAll('.rank-select'));
  statusDiv = document.getElementById('status');

  selects.forEach(select => {
    select.addEventListener('change', updateDropdownOptions);
  });

  document.getElementById('characterClass').addEventListener('change', handleClassSelectionChange);
  document.getElementById('characterSkill').addEventListener('change', handleSkillSelectionChange);
  document.getElementById('addSkillBtn').addEventListener('click', addSelectedSkill);

  const form = document.getElementById('offlineForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  updateDropdownOptions();
  loadClassOptions();
  loadSkillOptions();
});

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      console.log(data)
      if (!data.name || !data.stats) {
        alert('Invalid character JSON format.');
        return;
      }
      console.log("data contains name and stats")
      data.id=Date.now();
      const existingCharacters = JSON.parse(localStorage.getItem('pwa_characters') || '[]');
      existingCharacters.push(data);
      localStorage.setItem('pwa_characters', JSON.stringify(existingCharacters));
      window.location.href = 'index';
    } catch (err) {
      alert('Error parsing JSON file. Please ensure it is a valid character export.');
      console.error(err);
    }
  };

  reader.readAsText(file);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}
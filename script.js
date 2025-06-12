let players = JSON.parse(localStorage.getItem('players')) || {
  Ana: 0,
  Bruno: 0,
  Carlos: 0
};

let playersData = JSON.parse(localStorage.getItem('playersData')) || {};

// Histórico de pontuação (array de snapshots com timestamp e dados)
let history = JSON.parse(localStorage.getItem('history')) || [];

// Guarda a última posição para comparar
let lastPositions = JSON.parse(localStorage.getItem('lastPositions')) || {};

function saveToLocalStorage() {
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('playersData', JSON.stringify(playersData));
  localStorage.setItem('history', JSON.stringify(history));
  localStorage.setItem('lastPositions', JSON.stringify(lastPositions));
}

function saveHistorySnapshot() {
  // Salva o snapshot do estado atual dos jogadores com timestamp
  const timestamp = new Date().toISOString();
  const snapshot = {
    timestamp,
    players: {...players}
  };
  history.push(snapshot);

  // Limita o tamanho do histórico a 20 registros
  if (history.length > 20) {
    history.shift();
  }
  saveToLocalStorage();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');

  // Salva as posições anteriores para a animação FLIP
  const previousRects = Array.from(tbody.children).reduce((acc, row) => {
    const name = row.dataset.name;
    if (name) acc[name] = row.getBoundingClientRect();
    return acc;
  }, {});

  tbody.innerHTML = '';

  // Ordena jogadores por pontos decrescente
  const sorted = Object.entries(players).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([name, points], index) => {
    const data = playersData[name] || {};
    const prevPos = lastPositions[name] ?? (index + 1);
    const currentPos = index + 1;
    const diff = prevPos - currentPos;

    let variationText = '';
    let variationColor = 'inherit';
    if (diff > 0) {
      variationText = `+${diff}`;
      variationColor = '#28a745';
    } else if (diff < 0) {
      variationText = `${diff}`;
      variationColor = '#dc3545';
    } else {
      variationText = '0';
      variationColor = '#888';
    }

    const tr = document.createElement('tr');
    tr.dataset.name = name;
    tr.innerHTML = `
      <td>${currentPos}ª</td>
      <td class="player-cell">
        <img src="${data.image || `https://via.placeholder.com/40?text=${encodeURIComponent(name[0])}`}" alt="${name}" class="player-image-thumb" />
        ${name}
      </td>
      <td>${points}</td>
      <td style="color:${variationColor}; font-weight: 700;">${variationText}</td>
    `;
    tbody.appendChild(tr);
  });

  lastPositions = {};
  sorted.forEach(([name], index) => {
    lastPositions[name] = index + 1;
  });
  localStorage.setItem('lastPositions', JSON.stringify(lastPositions));

  const newRects = Array.from(tbody.children).reduce((acc, row) => {
    const name = row.dataset.name;
    if (name) acc[name] = row.getBoundingClientRect();
    return acc;
  }, {});

  Array.from(tbody.children).forEach(row => {
    const name = row.dataset.name;
    const prev = previousRects[name];
    const next = newRects[name];

    if (prev && next) {
      const deltaY = prev.top - next.top;

      if (deltaY !== 0) {
        row.style.transform = `translateY(${deltaY}px)`;
        row.style.transition = 'transform 0s';

        requestAnimationFrame(() => {
          row.style.transform = '';
          row.style.transition = 'transform 0.6s ease';
        });
      }
    }
  });
}

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  // Exibir histórico do mais recente para o mais antigo
  for (let i = history.length - 1; i >= 0; i--) {
    const snapshot = history[i];
    const date = new Date(snapshot.timestamp);
    const dateStr = date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    // Criar descrição das pontuações no snapshot
    const desc = generateDescription(snapshot.players);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${desc}</td>
    `;

    tbody.appendChild(tr);
  }
}

function generateDescription(playersSnapshot) {
  // Filtra jogadores com pontos > 0 e cria uma lista tipo "Ana: 10 pts, Bruno: 5 pts"
  const playersWithPoints = Object.entries(playersSnapshot)
    .filter(([_, points]) => points > 0)
    .map(([name, points]) => `${name}: ${points} pts`);

  if (playersWithPoints.length === 0) {
    return 'Pontuações zeradas ou nenhuma pontuação registrada.';
  }

  return playersWithPoints.join(', ');
}

function renderPlayerInputs() {
  const container = document.getElementById('playersInputs');
  container.innerHTML = '';

  Object.entries(players).forEach(([name]) => {
    const data = playersData[name] || {};
    const card = document.createElement('div');
    card.classList.add('player-card');
    card.innerHTML = `
      <button class="card-remove-btn" onclick="removePlayerByName('${name}')">&times;</button>
      <label for="points-${name}">${name}</label>
      <input type="number" id="points-${name}" name="${name}" value="0" min="0" />
      <input type="file" accept="image/*" onchange="handleImageUpload(event, '${name}')" />
      ${data.image ? `<img src="${data.image}" alt="${name}" class="player-image-thumb" />` : ''}
    `;
    container.appendChild(card);
  });
}

function removePlayerByName(name) {
  if (confirm(`Deseja remover o jogador "${name}"?`)) {
    delete players[name];
    delete playersData[name];
    saveToLocalStorage();
    renderPlayerInputs();
    renderTable();
    renderHistory();
    showAlert(`Jogador "${name}" removido.`);
  }
}

function addMultiplePoints(event) {
  event.preventDefault();
  const form = document.getElementById('multiPointForm');
  let updated = false;

  Object.keys(players).forEach(name => {
    const value = parseInt(form[name].value, 10);
    if (!isNaN(value) && value > 0) {
      players[name] += value;
      updated = true;
    }
    form[name].value = 0;
  });

  if (updated) {
    saveToLocalStorage();
    saveHistorySnapshot();
    renderTable();
    renderHistory();
    showAlert('Pontuações atualizadas!');
    showTab('scoreTable', document.querySelector('.tab'));
  } else {
    showAlert('Nenhum ponto adicionado.');
  }
}

function addNewPlayer() {
  const name = prompt('Nome do novo jogador:');
  if (!name) return;

  const trimmed = name.trim();
  if (!trimmed || players[trimmed]) {
    showAlert('Nome inválido ou já existente.');
    return;
  }

  players[trimmed] = 0;
  saveToLocalStorage();
  renderPlayerInputs();
  renderTable();
  renderHistory();
  showAlert(`Jogador "${trimmed}" adicionado!`);
}

function resetPoints() {
  if (!confirm('Deseja realmente zerar as pontuações?')) return;
  Object.keys(players).forEach(name => (players[name] = 0));
  saveToLocalStorage();
  saveHistorySnapshot();
  renderTable();
  renderPlayerInputs();
  renderHistory();
  showAlert('Pontuações zeradas!');
}

function showTab(tabId, tabEl) {
  document.querySelectorAll('.content > div').forEach(div => (div.style.display = 'none'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  tabEl.classList.add('active');

  if (tabId === 'scoreTable') {
    renderTable();
  } else if (tabId === 'updateForm') {
    renderPlayerInputs();
  } else if (tabId === 'historyTab') {
    renderHistory();
  }
}

function showAlert(message) {
  const alertBox = document.getElementById('alert');
  alertBox.textContent = message;
  alertBox.classList.add('show');
  setTimeout(() => alertBox.classList.remove('show'), 3000);
}

function handleImageUpload(event, playerName) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    playersData[playerName] = playersData[playerName] || {};
    playersData[playerName].image = reader.result;
    saveToLocalStorage();
    renderPlayerInputs();
    renderTable();
    showAlert(`Imagem do jogador "${playerName}" atualizada!`);
  };
  reader.readAsDataURL(file);
}
function exportHistoryToCSV() {
  if (history.length === 0) {
    showAlert('Histórico vazio.');
    return;
  }

  // Cabeçalho
  let csv = 'Data e Hora\tDescrição\n';

  history.forEach(snapshot => {
    const date = new Date(snapshot.timestamp);
    const dateStr = date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const desc = generateDescription(snapshot.players);
    // Escapar tabs e quebras de linha se necessário
    const safeDesc = desc.replace(/\t/g, ' ').replace(/\n/g, ' ');

    csv += `${dateStr}\t${safeDesc}\n`;
  });

  downloadFile(csv, 'historico.csv', 'text/csv;charset=utf-8;');
}

function exportHistoryToJSON() {
  if (history.length === 0) {
    showAlert('Histórico vazio.');
    return;
  }

  const jsonStr = JSON.stringify(history, null, 2);
  downloadFile(jsonStr, 'historico.json', 'application/json;charset=utf-8;');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.onload = () => {
  showTab('scoreTable', document.querySelector('.tab.active'));
  renderHistory();
};

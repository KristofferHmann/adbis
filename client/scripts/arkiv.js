let kvitteringer = [];
let currentIndex = 0;

document.getElementById('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const criteria = {
    type: document.getElementById('doc-type').value,
    year: document.getElementById('year').value,
    dateFrom: document.getElementById('date-interval-start').value,
    dateTo: document.getElementById('date-interval-end').value,
    timeFrom: document.getElementById('time-start').value,
    timeTo: document.getElementById('time-end').value,
    keyword: document.getElementById('keyword').value
  };

  const res = await fetch('/soeg-kvittering', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria)
  });

  const data = await res.json();
  const resultDiv = document.getElementById('search-result');
  const navButtons = document.getElementById('nav-buttons');
  const resultsCount = document.getElementById('results-count');
  const receiptContainer = document.getElementById('receipt-container');

  resultDiv.innerHTML = `
    <div class="result-view">
      <div class="result-list"></div>
      <div id="receipt-container"></div>
    </div>
    <div id="nav-buttons">
      <button id="prev-btn">Forrige</button>
      <button id="next-btn">Næste</button>
    </div>
  `;

  const resultListe = resultDiv.querySelector('.result-list');
  const receiptArea = resultDiv.querySelector('#receipt-container');

  if (!data.found || (criteria.type === 'kvittering' && (!data.kvitteringer || data.kvitteringer.length === 0)) ||
    (criteria.type === 'rapport' && (!data.rapporter || data.rapporter.length === 0))) {
    resultListe.innerHTML = '<p>Ingen resultater fundet.</p>';
    receiptArea.innerHTML = '';
    resultsCount.innerText = '0 resultater fundet';
    navButtons.style.display = 'none';
    return;
  }

  // === Rapport-visning ===
  if (criteria.type === 'rapport') {
    const rapporter = data.rapporter;
    receiptArea.innerHTML = ''; // ryd kvitteringsvisning
    resultListe.innerHTML = rapporter.map(r => `
      <div class="rapport">
        <h3>${r.titel}</h3>
        <p>Type: ${r.type}</p>
        <p>Dato: ${r.dato} kl: ${r.tidspunkt}</p>
        <div class="indhold">${r.indhold}</div>
      </div>
    `).join('');

    navButtons.style.display = 'none';
    resultsCount.innerText = `${rapporter.length} rapport${rapporter.length > 1 ? 'er' : ''} fundet`;
    return;
  }

  // === Kvitteringsliste med "Vis" knap ===
  kvitteringer = data.kvitteringer;
  currentIndex = 0;
  resultsCount.innerText = `${kvitteringer.length} kvittering${kvitteringer.length > 1 ? 'er' : ''} fundet`;

  kvitteringer.forEach((kvit, index) => {
    const entry = document.createElement('div');
    entry.className = 'result-entry';
      entry.innerHTML = `
    <div class="result-entry-content">
      <div>
        <strong>Kvittering #${kvit.nummer}</strong><br>
        ${kvit.dato} - ${kvit.varer.length} varer<br>
        Total: ${kvit.total.toFixed(2)} kr
      </div>
      <button class="view-btn">Vis</button>
    </div>
  `;
    entry.querySelector('.view-btn').addEventListener('click', () => {
      currentIndex = index;
      visKvittering(kvit, receiptArea);
      opdaterNavKnapper(receiptArea);
    });
    resultListe.appendChild(entry);
  });
  

  visKvittering(kvitteringer[currentIndex], receiptArea);
  opdaterNavKnapper(receiptArea);
  navButtons.style.display = kvitteringer.length > 1 ? 'block' : 'none';
});

// === Funktion til at vise én kvittering ===
function visKvittering(kvit, container) {
  container.innerHTML = `
    <div class="receipt">
      <h3>Kvittering #${kvit.nummer}</h3>
      <p>Dato: ${kvit.dato} kl: ${kvit.tidspunkt}</p>
      <div class="items">
        ${kvit.varer.map(item => `
          <div><span>${item.vare}</span><span>${item.pris.toFixed(2)} kr</span></div>
        `).join('')}
      </div>
      <div class="total">Total: ${kvit.total.toFixed(2)} kr</div>
    </div>
  `;
}

// === Navigationsknapper ===
function opdaterNavKnapper(container) {
  document.getElementById('prev-btn').disabled = currentIndex === 0;
  document.getElementById('next-btn').disabled = currentIndex === kvitteringer.length - 1;

  document.getElementById('prev-btn').onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      visKvittering(kvitteringer[currentIndex], container);
      opdaterNavKnapper(container);
    }
  };

  document.getElementById('next-btn').onclick = () => {
    if (currentIndex < kvitteringer.length - 1) {
      currentIndex++;
      visKvittering(kvitteringer[currentIndex], container);
      opdaterNavKnapper(container);
    }
  };
}

// === Nulstil ===
document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('doc-type').value = 'kvittering';
  document.getElementById('year').value = '';
  document.getElementById('date-interval-start').value = '';
  document.getElementById('date-interval-end').value = '';
  document.getElementById('time-start').value = '';
  document.getElementById('time-end').value = '';
  document.getElementById('keyword').value = '';
  document.getElementById('search-result').innerHTML = '';
  document.getElementById('results-count').innerText = '';
});

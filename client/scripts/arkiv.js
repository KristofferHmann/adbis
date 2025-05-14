
let kvitteringer = [];
let currentIndex = 0;
let allEntries = [];

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

  resultDiv.innerHTML = `
    <input type="text" id="live-filter" placeholder="Filtrér kvitteringer..." style="padding: 8px; margin-bottom: 10px;" />
    <select id="sort-select" style="padding: 5px; margin-bottom: 10px;">
      <option value="">Sortér efter…</option>
      <option value="dato-nyest">Dato (nyeste først)</option>
      <option value="dato-aeldst">Dato (ældste først)</option>
      <option value="pris-hoejst">Pris (højeste først)</option>
      <option value="pris-lavest">Pris (laveste først)</option>
    </select>
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
  const receiptArea = document.getElementById('receipt-container');

  if (!data.found || (criteria.type === 'kvittering' && (!data.kvitteringer || data.kvitteringer.length === 0)) ||
    (criteria.type === 'rapport' && (!data.rapporter || data.rapporter.length === 0))) {
    resultListe.innerHTML = '<p>Ingen resultater fundet.</p>';
    receiptArea.innerHTML = '';
    resultsCount.innerText = '0 resultater fundet';
    navButtons.style.display = 'none';
    return;
  }

  if (criteria.type === 'rapport') {
    const rapporter = data.rapporter;
    resultsCount.innerText = `${rapporter.length} rapport${rapporter.length > 1 ? 'er' : ''} fundet`;

    resultDiv.innerHTML = `
        <select id="rapport-type-filter" style="padding: 5px; margin-bottom: 10px;">
          <option value="">Filtrér rapporttype…</option>
          <option value="dagsrapport">Dagsrapport</option>
          <option value="månedsrapport">Månedsrapport</option>
        </select>
        <select id="rapport-sort" style="padding: 5px; margin-bottom: 10px;">
          <option value="">Sortér efter…</option>
          <option value="dato-nyest">Dato (nyeste først)</option>
          <option value="dato-aeldst">Dato (ældste først)</option>
        </select>
        <div class="result-view">
          <div class="result-list"></div>
        </div>
      `;

    const resultListe = resultDiv.querySelector('.result-list');

    const renderRapporter = (liste) => {
      resultListe.innerHTML = liste.map(r => `
        <div class="rapport">
          <h3>${r.titel}</h3>
          <p>Type: ${r.type}</p>
          <p>Dato: ${r.dato} kl: ${r.tidspunkt}</p>
          <div class="indhold">${r.indhold}</div>
          <button class="download-rapport-btn documentBtn" data-id="${r.id}">Download PDF</button>
        </div>
      `).join('');

      // 🎯 Sæt event listeners på knapperne
      resultListe.querySelectorAll('.download-rapport-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const rapportId = btn.getAttribute('data-id');

          const res = await fetch('/download-rapport-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: rapportId })
          });

          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `rapport_${rapportId}.pdf`;
          a.click();
        });
      });
    };


    // 👇 Kombineret render-funktion der bruger både filter og sort
    const renderRapporterFiltered = () => {
      const typeVal = document.getElementById('rapport-type-filter').value;
      const sortVal = document.getElementById('rapport-sort').value;

      let filtered = typeVal ? rapporter.filter(r => r.type === typeVal) : [...rapporter];

      if (sortVal === 'dato-nyest') filtered.sort((a, b) => new Date(b.dato) - new Date(a.dato));
      if (sortVal === 'dato-aeldst') filtered.sort((a, b) => new Date(a.dato) - new Date(b.dato));

      renderRapporter(filtered);
    };

    document.getElementById('rapport-type-filter').addEventListener('change', renderRapporterFiltered);
    document.getElementById('rapport-sort').addEventListener('change', renderRapporterFiltered);

    renderRapporterFiltered(); // initial visning
    return;
  }



  kvitteringer = data.kvitteringer;
  currentIndex = 0;
  resultsCount.innerText = `${kvitteringer.length} kvittering${kvitteringer.length > 1 ? 'er' : ''} fundet`;

  renderKvitteringer(kvitteringer);

  document.getElementById('sort-select').addEventListener('change', (e) => {
    const val = e.target.value;
    let sorted = [...kvitteringer];

    switch (val) {
      case 'dato-nyest':
        sorted.sort((a, b) => new Date(b.dato) - new Date(a.dato));
        break;
      case 'dato-aeldst':
        sorted.sort((a, b) => new Date(a.dato) - new Date(b.dato));
        break;
      case 'pris-hoejst':
        sorted.sort((a, b) => b.total - a.total);
        break;
      case 'pris-lavest':
        sorted.sort((a, b) => a.total - b.total);
        break;
    }

    renderKvitteringer(sorted);
  });

  const filterInput = document.getElementById('live-filter');
  filterInput.addEventListener('input', () => {
    const query = filterInput.value.toLowerCase();
    allEntries.forEach(({ kvit, element }) => {
      const match =
        kvit.nummer.toLowerCase().includes(query) ||
        kvit.dato.includes(query) ||
        kvit.total.toFixed(2).includes(query) ||
        kvit.varer.some(v => v.vare.toLowerCase().includes(query));
      element.style.display = match ? '' : 'none';
    });
  });
});

function renderKvitteringer(liste) {
  const resultListe = document.querySelector('.result-list');
  const receiptArea = document.getElementById('receipt-container');
  resultListe.innerHTML = '';
  allEntries = [];

  liste.forEach((kvit, index) => {
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
    allEntries.push({ kvit, element: entry });
  });

  if (liste.length > 0) {
    visKvittering(liste[0], receiptArea);
    opdaterNavKnapper(receiptArea);
  }
  document.getElementById('nav-buttons').style.display = liste.length > 1 ? 'block' : 'none';
}

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

function tilføjKvitteringsknapper(container, kvit) {
  const knapContainer = document.createElement('div');
  knapContainer.style.marginTop = '10px';

  const pdfBtn = document.createElement('button');
  pdfBtn.innerText = 'Download PDF';
  pdfBtn.style.marginRight = '10px';
  pdfBtn.className = 'documentBtn';
  pdfBtn.onclick = async () => {
    const res = await fetch('/generer-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kvittering: kvit })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kvittering_${kvit.nummer}.pdf`;
    a.click();
  };

  const mailBtn = document.createElement('button');
  mailBtn.innerText = 'Send på mail';
  mailBtn.className = 'documentBtn';
  mailBtn.onclick = async () => {
    const email = prompt('Indtast e-mailadresse:');
    if (!email) return;

    const res = await fetch('/send-kvittering-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kvittering: kvit, email })
    });

    if (res.ok) {
      alert('Kvittering sendt!');
    } else {
      alert('Fejl ved afsendelse');
    }
  };

  knapContainer.appendChild(pdfBtn);
  knapContainer.appendChild(mailBtn);
  container.appendChild(knapContainer);
}

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
  tilføjKvitteringsknapper(container, kvit);
}



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

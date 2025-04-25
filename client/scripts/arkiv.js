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

    console.log("Data modtaget:", data);
console.log("Type valgt:", criteria.type);
    const resultDiv = document.getElementById('search-result');
    const navButtons = document.getElementById('nav-buttons');
    const resultsCount = document.getElementById('results-count');
  
    if (!data.found || (criteria.type === 'kvittering' && (!data.kvitteringer || data.kvitteringer.length === 0)) || 
    (criteria.type === 'rapport' && (!data.rapporter || data.rapporter.length === 0))) {
  resultDiv.innerHTML = '<p>Ingen resultater fundet.</p>';
  resultsCount.innerText = '0 resultater fundet';
  navButtons.style.display = 'none';
  return;
}

      if (criteria.type === 'rapport') {
        const rapporter = data.rapporter;
      
        resultDiv.innerHTML = rapporter.map(r => `
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
  
    kvitteringer = data.kvitteringer;
    currentIndex = 0;

    resultsCount.innerText = `${kvitteringer.length} resultat${kvitteringer.length > 1 ? 'er' : ''} fundet`;

    visKvittering(kvitteringer[currentIndex]);

  // Vis navigation
  navButtons.style.display = 'block';
  opdaterNavKnapper();
});

// Funktion til at vise én kvittering
function visKvittering(kvit) {
    const receiptContainer = document.getElementById('receipt-container');
  receiptContainer.innerHTML = `
      <div class="receipt">
        <h3>Kvittering ${currentIndex + 1} af ${kvitteringer.length}</h3>
        <p>Dato: ${kvit.dato} kl: ${kvit.tidspunkt}</p>
        <div class="items">
          ${kvit.varer.map(item => `
            <div><span>${item.vare}</span><span>${item.pris.toFixed(2)} kr</span></div>
          `).join('')}
        </div>
        <div class="total">
          Total: ${kvit.total.toFixed(2)} kr
        </div>
        <p>Nr: ${kvit.nummer}</p>
      </div>
    `;
  }
  
  // Opdater knapper (disable hvis vi er forrest/bagerst)
  function opdaterNavKnapper() {
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    document.getElementById('next-btn').disabled = currentIndex === kvitteringer.length - 1;

  }
  
  // Event listeners til knapperne
  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      visKvittering(kvitteringer[currentIndex]);
      opdaterNavKnapper();
    }
  });
  
  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentIndex < kvitteringer.length - 1) {
      currentIndex++;
      visKvittering(kvitteringer[currentIndex]);
      opdaterNavKnapper();
    }
  });

  //nulstil filtrering
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('doc-type').value = 'kvittering';
    document.getElementById('year').value = '';
    document.getElementById('date-interval-start').value = '';
    document.getElementById('date-interval-end').value = '';
    document.getElementById('time-start').value = '';
    document.getElementById('time-end').value = '';
    document.getElementById('keyword').value = '';
    document.getElementById('receipt-container').innerHTML = '';
    document.getElementById('results-count').innerText = '';
    document.getElementById('nav-buttons').style.display = 'none';
  });
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
  
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
  
      const data = await res.json();
  
      if (data.success) {
        // Hvis login lykkes, send brugeren til dashboard
        window.location.href = '/pages/arkiv.html';
      } else {
        // Hvis login fejler, vis fejl
        document.getElementById('error-msg').innerText = 'Forkert brugernavn eller adgangskode';
      }
    });
  });

  

  
// Hent brugernavn fra server
async function fetchUser() {
    const res = await fetch('/me');
    const data = await res.json();
    if (data.username) {
      document.getElementById('username-display').innerText = `Hej, ${data.username}`;
    }
  }
  
  // Log ud
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/pages/login.html';
  });
  
  fetchUser();
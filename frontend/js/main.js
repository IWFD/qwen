// Função genérica para navegar entre telas
function goTo(page) {
  window.location.href = page;
}

function goBack() {
  window.history.back();
}

// Simular login e buscar dados do usuário na Clara
function login() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  if (!usernameInput || !passwordInput) {
    console.error("Campos de login não encontrados");
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert('Digite usuário e senha.');
    return;
  }

  try {
    localStorage.setItem('user', JSON.stringify({ username }));
    console.log("Usuário salvo no localStorage:", { username });

    // Redireciona para dashboard
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error("Erro ao salvar no localStorage", err);
    alert("Erro ao salvar credenciais.");
  }
}

// Carregar saldo do usuário
async function loadBalance() {
  const balanceEl = document.getElementById('balance');
  if (!balanceEl) return;

  try {
    const res = await fetch('http://localhost:3000/api/balance');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();

    if (data && data.balance !== undefined) {
      balanceEl.innerText = `R$ ${data.balance.toFixed(2)}`;
    } else {
      balanceEl.innerText = 'Saldo indisponível';
    }
  } catch (err) {
    console.error(err);
    balanceEl.innerText = 'Erro ao carregar saldo';
  }
}

// Carregar dados do usuário logado
async function loadUser() {
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');

  if (!nameEl && !emailEl) return;

  const claraUser = JSON.parse(localStorage.getItem('claraUser'));

  if (claraUser && claraUser.user) {
    if (nameEl) nameEl.innerText = claraUser.user.name || 'Nome não encontrado';
    if (emailEl) emailEl.innerText = claraUser.user.email || '';
  } else {
    if (nameEl) nameEl.innerText = 'Usuário não encontrado';
    if (emailEl) emailEl.innerText = '';
  }
}
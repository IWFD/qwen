// Navegar entre telas
function goTo(page) {
  window.location.href = page;
}

function goBack() {
  window.history.back();
}

// Carregar cartões do backend
async function loadCards() {
  try {
    const res = await fetch('https://qwen-tgud.onrender.com/api/cards ');
    const data = await res.json();

    const list = document.getElementById('cards-list');
    list.innerHTML = '';

    if (data && data.content && data.content.length > 0) {
      data.content.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
          <h3>${card.alias}</h3>
          <p><strong>Tipo:</strong> ${card.type}</p>
          <p><strong>Número:</strong> ${card.maskedPan}</p>
          <p><strong>Status:</strong> ${card.status}</p>
          <hr />
        `;
        list.appendChild(div);
      });
    } else {
      list.innerHTML = '<p>Nenhum cartão encontrado</p>';
    }

  } catch (err) {
    console.error('Erro ao carregar cartões:', err);
    document.getElementById('cards-list').innerHTML = '<p>Erro ao carregar cartões</p>';
  }
}
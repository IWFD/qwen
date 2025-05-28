require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const axios = require('axios');
const { Buffer } = require('buffer');

// Carregar configurações do .env
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH);

const tokenData = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  audience: process.env.AUDIENCE?.trim()
};

// Função para gerar assertion JWT
function generateAssertion() {
  const payload = {
    iss: tokenData.clientId,
    sub: tokenData.clientId,
    aud: tokenData.audience,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutos
    iat: Math.floor(Date.now() / 1000),
    jti: Math.random().toString(36).substring(2, 15)
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

// Função para codificar Basic Auth
function getBasicAuthHeader() {
  const auth = `${tokenData.clientId}:${tokenData.clientSecret}`;
  return `Basic ${Buffer.from(auth).toString('base64')}`;
}

// Função reutilizável pra pegar token da Clara
async function getClaraToken(assertion) {
  try {
    const response = await axios.post(
      'https://public-api.br.clara.com/oauth/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion || generateAssertion()
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': getBasicAuthHeader()
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Erro ao obter token:', error.message);
    if (error.response) {
      console.error('Detalhes:', error.response.data);
    }
    throw error;
  }
}

// Iniciar servidor
const app = express();

// Configurar CORS
const corsOptions = {
  origin: '*'
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

// ========== ROTAS DA API DEVEM VIR ANTES DE SERVIR O FRONTEND ==========

// Rota: Obter token da Clara
app.get('/api/auth/token', async (req, res) => {
  try {
    const assertion = generateAssertion();
    const accessToken = await getClaraToken(assertion);
    res.json({ access_token: accessToken });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter token da Clara' });
  }
});

// Rota: Buscar todos os cartões
app.get('/api/cards', async (req, res) => {
  try {
    const assertion = generateAssertion();
    const accessToken = await getClaraToken(assertion);

    const cardsRes = await axios.get(
      'https://public-api.br.clara.com/api/v3/cards',
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`
        }
      }
    );

    res.json(cardsRes.data);
  } catch (error) {
    console.error('❌ Erro ao buscar cartões:', error.message);
    res.status(500).json({ error: 'Erro ao buscar cartões' });
  }
});

// Rota: Buscar todos os usuários
app.get('/api/users', async (req, res) => {
  try {
    const assertion = generateAssertion();
    const accessToken = await getClaraToken(assertion);

    const usersRes = await axios.get(
      'https://public-api.br.clara.com/api/v2/users',
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`
        }
      }
    );

    res.json(usersRes.data);
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
    res.status(500).json({ error: 'Erro ao buscar colaboradores' });
  }
});

// ========== SERVIR FRONTEND POR ÚLTIMO ==========
app.use(express.static('../frontend'));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
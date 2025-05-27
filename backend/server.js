const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const axios = require('axios');

// Carregar configurações
const privateKey = fs.readFileSync('./private-key.key');
const tokenData = require('./token-data.json');

const app = express();

// Configurar CORS
const corsOptions = {
  origin: '*',
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

// Função auxiliar para gerar assertion JWT
function generateAssertion() {
  const payload = {
    iss: tokenData.clientId,
    sub: tokenData.clientId,
    aud: tokenData.audience.trim(),
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
    jti: Math.random().toString(36).substring(2, 15)
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

// Rota: Obter token da Clara
app.get('/api/auth/token', async (req, res) => {
  try {
    const assertion = generateAssertion();

    const response = await axios.post(
      'https://api.withclevy.com/oauth/token ',
      {
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao obter token da Clara' });
  }
});

// Rota: Buscar dados do usuário na Clara
app.get('/api/user', async (req, res) => {
  const { identifier } = req.query;

  if (!identifier) {
    return res.status(400).json({ error: 'Identificador não informado' });
  }

  try {
    const assertion = generateAssertion();

    const tokenRes = await axios.post(
      'https://api.withclevy.com/oauth/token ',
      {
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion
      }
    );

    // Exemplo de endpoint da Clara para buscar usuário
    const userRes = await axios.get(
      `https://api.withclevy.com/api/v3/users?filter= ${encodeURIComponent(identifier)}`,
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`
        }
      }
    );

    res.json(userRes.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// Rota: Buscar saldo real
app.get('/api/balance', async (req, res) => {
  try {
    const assertion = generateAssertion();

    const tokenRes = await axios.post(
      'https://api.withclevy.com/oauth/token ',
      {
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion
      }
    );

    const balanceRes = await axios.get(
      'https://api.withclevy.com/api/v3/balances ',
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`
        }
      }
    );

    res.json(balanceRes.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao buscar saldo' });
  }
});

// Servir arquivos estáticos do frontend
app.use(express.static('../frontend'));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
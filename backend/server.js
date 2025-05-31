require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const axios = require('axios');
const { Buffer } = require('buffer');

// Validar configurações iniciais
if (!process.env.PRIVATE_KEY_PATH) {
  throw new Error('PRIVATE_KEY_PATH não está definido no .env');
}

if (!fs.existsSync(process.env.PRIVATE_KEY_PATH)) {
  throw new Error(`Chave privada não encontrada em: ${process.env.PRIVATE_KEY_PATH}`);
}

const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH);

const tokenData = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  audience: process.env.AUDIENCE?.trim()
};

// Função para codificar Basic Auth
function getBasicAuthHeader() {
  const auth = `${tokenData.clientId}:${tokenData.clientSecret}`;
  return `Basic ${Buffer.from(auth).toString('base64')}`;
}

// Nova função pra obter token (sem assertion)
async function getClaraToken() {
  try {
    const res = await axios.post(
      'https://public-api.br.clara.com/oauth/token', 
      new URLSearchParams({
        grant_type: 'client_credentials',
        audience: tokenData.audience,
        scope: 'read:users read:cards'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': getBasicAuthHeader(),
          'Accept': 'application/json'
        }
      }
    );

    return res.data.access_token;
  } catch (error) {
    console.error('❌ Erro ao obter token:', error.message);
    if (error.response) {
      console.error('Detalhes:', error.response.status, error.response.data);
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
    const accessToken = await getClaraToken();
    res.json({ access_token: accessToken });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter token da Clara' });
  }
});

// Rota: Buscar todos os cartões
app.get('/api/cards', async (req, res) => {
  try {
    const accessToken = await getClaraToken();

    const cardsRes = await axios.get(
      'https://public-api.br.clara.com/api/v3/cards', 
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      }
    );

    res.json(cardsRes.data);
  } catch (error) {
    console.error('❌ Erro ao buscar cartões:', error.message);
    if (error.response) {
      console.error('Detalhes:', error.response.status, error.response.data);
    }

    res.status(500).json({ error: 'Erro ao buscar cartões' });
  }
});

// Rota: Buscar todos os usuários
app.get('/api/users', async (req, res) => {
  try {
    const accessToken = await getClaraToken();

    console.log('📡 Fazendo GET para:', 'https://public-api.br.clara.com/api/v2/users'); 
    console.log('🔑 Token usado:', accessToken);

    const usersRes = await axios.get(
      'https://public-api.br.clara.com/api/v2/users', 
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      }
    );

    res.json(usersRes.data);
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
    if (error.response) {
      console.error('📊 Detalhes:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('🌐 Nenhuma resposta da API:', error.code);
    } else {
      console.error('🚨 Erro geral:', error.message);
    }

    res.status(500).json({
      error: 'Erro ao buscar colaboradores',
      details: error.response?.data || null
    });
  }
});

// ========== SERVIR FRONTEND POR ÚLTIMO ==========
app.use(express.static('../frontend'));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});

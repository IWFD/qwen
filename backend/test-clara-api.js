require('dotenv').config();
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

// Função para obter token da Clara
async function getClaraToken(assertion) {
  try {
    const response = await axios.post(
      'https://public-api.br.clara.com/oauth/token ',
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
    console.error('❌ Erro ao obter token da Clara:', error.message);
    if (error.response) {
      console.error('Detalhes:', error.response.data);
    }
    return null;
  }
}

// Função para buscar cartões na API Clara
async function testCardsApi(token) {
  try {
    const res = await axios.get('https://public-api.br.clara.com/api/v3/cards', {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Cartões encontrados:', res.data);
  } catch (error) {
    console.error('❌ Erro ao buscar cartões:', error.message);
    if (error.response) {
      console.error('Detalhes:', error.response.data);
    }
  }
}

// Rodar o teste
(async () => {
  console.log('🔐 Gerando assertion JWT...');
  const assertion = generateAssertion();

  console.log('🔑 Obtendo token da Clara...');
  const accessToken = await getClaraToken(assertion);

  if (accessToken) {
    console.log('🟢 Token obtido com sucesso!');
    console.log('🔑 Access Token:', accessToken); // Mostra o token pra você usar no Postman

    console.log('💳 Buscando cartões...'); // Log adicional
    await testCardsApi(accessToken);
  } else {
    console.log('🔴 Falha ao obter token. Verifique suas credenciais.');
  }
})();
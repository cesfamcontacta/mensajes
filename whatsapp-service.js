const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATUS_FILE = path.join(PUBLIC_DIR, 'whatsapp-status.json');
const QR_FILE = path.join(PUBLIC_DIR, 'whatsapp-qr.png');

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

let client = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'loading' | 'qr' | 'connected'
let qrCodeText = '';

// Helper to save connection status to a public JSON file
function saveStatus(status, extra = {}) {
  connectionStatus = status;
  const data = {
    status: status,
    qr: status === 'qr' ? '/whatsapp-qr.png' : null,
    updatedAt: new Date().toISOString(),
    ...extra
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
  console.log(`[WhatsApp Service Status]: ${status.toUpperCase()}`);
}

// Clean up QR code file
function deleteQRFile() {
  if (fs.existsSync(QR_FILE)) {
    try {
      fs.unlinkSync(QR_FILE);
    } catch (err) {
      console.error('Error deleting QR file:', err.message);
    }
  }
}

// Initialize the WhatsApp Web Client
function initializeWhatsAppClient() {
  if (client) {
    console.log('Client already exists. Skipping initialization.');
    return;
  }

  saveStatus('loading');
  deleteQRFile();

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
      headless: true,
      protocolTimeout: 0, // Disable protocol timeout to prevent Runtime.callFunctionOn timeouts
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', (qr) => {
    qrCodeText = qr;
    // Generate QR code image inside public folder
    qrcode.toFile(QR_FILE, qr, { width: 300 }, (err) => {
      if (err) {
        console.error('Failed to save QR code file:', err);
        saveStatus('disconnected', { error: 'Failed to generate QR code image' });
      } else {
        saveStatus('qr');
      }
    });
  });

  client.on('ready', () => {
    deleteQRFile();
    qrCodeText = '';
    const number = client.info.wid.user;
    saveStatus('connected', { phone: number });
  });

  client.on('authenticated', () => {
    console.log('Authentication successful!');
  });

  client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
    saveStatus('disconnected', { error: msg });
  });

  client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    destroyClient();
  });

  // Handle incoming messages (replies from patients)
  client.on('message', async (msg) => {
    // Exclude group chats or self-messages
    if (msg.fromMe || msg.from.includes('@g.us')) return;

    // Resolve real phone number if it uses the new LID (@lid) format
    let cleanPhone = msg.from.replace('@c.us', '').replace('@lid', '');
    if (msg.from.endsWith('@lid')) {
      try {
        const contact = await msg.getContact();
        if (contact && contact.id && contact.id.user) {
          cleanPhone = contact.id.user;
          console.log(`[WhatsApp Service] Resolved LID ${msg.from} to phone number: ${cleanPhone}`);
        }
      } catch (err) {
        console.error('[WhatsApp Service] Failed to resolve LID contact:', err.message);
      }
    }
    
    // Map to Meta API format so we can reuse the existing webhook logic!
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: cleanPhone,
              id: msg.id.id,
              type: 'text',
              text: {
                body: msg.body
              }
            }]
          }
        }]
      }]
    };

    console.log(`[WhatsApp Service] Inbound message from ${cleanPhone}: "${msg.body}"`);
    
    try {
      // Forward to the Next.js API Webhook endpoint running on port 3000
      const response = await fetch('http://localhost:3000/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      console.log(`[WhatsApp Service] Forwarded to Next.js webhook. Response status: ${response.status}`);
    } catch (err) {
      console.error('[WhatsApp Service] Webhook forward error:', err.message);
    }
  });

  client.initialize().catch((err) => {
    console.error('Error during client initialization:', err);
    saveStatus('disconnected', { error: err.message });
  });
}

// Safely destroy the client session
async function destroyClient() {
  saveStatus('loading');
  deleteQRFile();
  qrCodeText = '';
  
  if (client) {
    try {
      await client.destroy();
    } catch (err) {
      console.error('Error destroying client:', err.message);
    }
    client = null;
  }

  saveStatus('disconnected');
}

// Start HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /status
  if (req.method === 'GET' && req.url === '/status') {
    let statusDetails = {};
    try {
      if (fs.existsSync(STATUS_FILE)) {
        statusDetails = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      }
    } catch (e) {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: connectionStatus, 
      qrText: qrCodeText,
      ...statusDetails 
    }));
    return;
  }

  // POST /init
  if (req.method === 'POST' && req.url === '/init') {
    if (connectionStatus === 'disconnected') {
      initializeWhatsAppClient();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Initialization started' }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: `Already in state: ${connectionStatus}` }));
    }
    return;
  }

  // POST /disconnect
  if (req.method === 'POST' && req.url === '/disconnect') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Disconnecting started' }));
    
    // Perform disconnect async
    (async () => {
      await destroyClient();
      // Remove auth session files to allow scanning a new QR
      const authDir = path.join(__dirname, '.wwebjs_auth');
      if (fs.existsSync(authDir)) {
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch (e) {
          console.error('Failed to remove auth directory on logout:', e.message);
        }
      }
    })();
    return;
  }

  // POST /send
  if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { to, message } = payload;

        if (!to || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Parameters "to" and "message" are required' }));
          return;
        }

        if (connectionStatus !== 'connected' || !client) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'WhatsApp client is not connected' }));
          return;
        }

        const cleanPhone = to.replace(/[\s\-\+]/g, '').trim();
        const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

        console.log(`[WhatsApp Service] Sending message to ${jid}...`);
        const sentMessage = await client.sendMessage(jid, message);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, messageId: sentMessage.id.id }));
      } catch (err) {
        console.error('Failed to send message:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// Write default status file at start
saveStatus('disconnected');

server.listen(PORT, () => {
  console.log(`[WhatsApp Web Service] Running on http://localhost:${PORT}`);
  // Auto start client if auth session exists
  const authDir = path.join(__dirname, '.wwebjs_auth');
  if (fs.existsSync(authDir)) {
    console.log('[WhatsApp Web Service] Auth session folder found. Auto-initializing client...');
    initializeWhatsAppClient();
  }
});

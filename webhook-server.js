const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-change-this';
const DEPLOY_SCRIPT = '/opt/journal/deploy.sh';

// Verify GitHub signature
function verifySignature(payload, signature) {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      console.log('Invalid signature - rejecting webhook');
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    try {
      const event = req.headers['x-github-event'];
      const payload = JSON.parse(body);

      console.log(`Received ${event} event from GitHub`);

      // Only deploy on push events to master/main branch
      if (event === 'push') {
        const branch = payload.ref.split('/').pop();
        console.log(`Push to branch: ${branch}`);

        if (branch === 'master' || branch === 'main') {
          console.log('Triggering deployment...');

          // Run deployment script in background
          execSync(`nohup ${DEPLOY_SCRIPT} ${branch} > /tmp/journal-deploy.log 2>&1 &`);

          res.writeHead(200);
          res.end('Deployment triggered');
          console.log('Deployment started');
        } else {
          res.writeHead(200);
          res.end('Ignored - not master/main branch');
          console.log('Ignored - not master/main branch');
        }
      } else {
        res.writeHead(200);
        res.end('Ignored - not a push event');
        console.log('Ignored - not a push event');
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.writeHead(500);
      res.end('Internal server error');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Webhook server listening on http://127.0.0.1:${PORT}`);
  console.log(`Endpoint: http://127.0.0.1:${PORT}/webhook`);
});

const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');

// Configuration
const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-change-this';
const DEPLOY_SCRIPT = '/opt/journal/deploy.sh';
const DEPLOY_LOG = '/tmp/journal-deploy.log';

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

// Monitor deployment completion
//
// The deploy writes straight to DEPLOY_LOG. exec() kept the whole npm install and build
// output in memory and killed the deploy once it passed maxBuffer (1 MB), and it left
// DEPLOY_LOG unwritten, so the failure branch below printed a stale log.
function monitorDeployment(branch) {
  const startTime = Date.now();

  console.log(`Starting deployment monitoring for branch: ${branch}`);

  let reported = false;
  const report = (error) => {
    if (reported) return;
    reported = true;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (error) {
      console.error(`\n${'='.repeat(50)}`);
      console.error(`DEPLOYMENT FAILED after ${duration}s`);
      console.error(`Branch: ${branch}`);
      console.error(`Time: ${new Date().toISOString()}`);
      console.error(`Error: ${error.message}`);
      console.error(`${'='.repeat(50)}\n`);

      // Log last few lines of deployment log for debugging
      try {
        const logContent = fs.readFileSync(DEPLOY_LOG, 'utf8');
        const lastLines = logContent.split('\n').slice(-10).join('\n');
        console.error('Last deployment log entries:');
        console.error(lastLines);
      } catch (logError) {
        console.error('Could not read deployment log:', logError.message);
      }
    } else {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`DEPLOYMENT COMPLETE - Changes live in production!`);
      console.log(`Branch: ${branch}`);
      console.log(`Duration: ${duration}s`);
      console.log(`Completed at: ${new Date().toISOString()}`);
      console.log(`Production URL: https://journal.azyr.io`);
      console.log(`${'='.repeat(50)}\n`);
    }
  };

  let child;
  try {
    const log = fs.openSync(DEPLOY_LOG, 'w');
    child = spawn(DEPLOY_SCRIPT, [branch], { stdio: ['ignore', log, log] });
    fs.closeSync(log); // the child holds its own copy of the descriptor
  } catch (err) {
    report(err);
    return;
  }

  child.on('error', report);
  child.on('close', (code, signal) => {
    report(code === 0 ? null : new Error(signal ? `killed by ${signal}` : `exit code ${code}`));
  });
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

          // Start deployment monitoring (runs in background)
          monitorDeployment(branch);

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

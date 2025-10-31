// server.js (Railway - Healthcheck Fixed & Graceful Shutdown)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const RULES_FILE = path.join(__dirname, 'managementRules.json');

// CORS
app.use(cors());

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb' }));

// CRITICAL: Simple health check that responds immediately
app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

app.get('/health', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

// API: Get rules
app.get('/api/rules', (req, res) => {
    try {
        if (fs.existsSync(RULES_FILE)) {
            const rulesData = fs.readFileSync(RULES_FILE, 'utf8');
            res.status(200).json(JSON.parse(rulesData));
        } else {
            res.status(200).json({});
        }
    } catch (error) {
        console.error('Error loading rules:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// API: Upload rules
app.post('/api/upload-rules', (req, res) => {
    try {
        const rulesContent = req.body;
        let managementRules = {};
        let count = 0;
        const lines = rulesContent.split(/\r?\n/);

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
                return;
            }

            let parts = trimmedLine.split(',');
            if (parts.length < 2) {
                parts = trimmedLine.split('\t');
            }

            if (parts.length >= 2) {
                let zip = parts[0].trim();
                let status = parts[1].trim();
                
                const cleanZip = zip.replace(/-/g, '');

                if (/^(\d{5}|\d{6})$/.test(cleanZip) && status.length > 0) {
                    managementRules[cleanZip] = status;
                    count++;
                }
            }
        });

        fs.writeFileSync(RULES_FILE, JSON.stringify(managementRules, null, 2), 'utf8');
        console.log('Rules saved: ' + count + ' entries');
                
        res.status(200).json({
            success: true,
            message: 'Rules saved',
            loadedCount: count
        });

    } catch (error) {
        console.error('Error saving rules:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('SERVER READY ON PORT ' + PORT);
    console.log('Health: GET /');
});

// Keep alive
// *** BUG FIX: Store interval in a variable ***
const keepAliveInterval = setInterval(() => {
    console.log('Server alive: ' + new Date().toISOString());
}, 30000);

// Graceful shutdown
function gracefulShutdown(signal) {
    console.log(`${signal} received`);
    
    // *** BUG FIX: Clear the interval ***
    clearInterval(keepAliveInterval);
    
    server.close(() => {
        console.log('Server closed gracefully');
        process.exit(0);
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


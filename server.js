// server.js (Railway Production Ready - Fixed)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Rules file path
const RULES_FILE = path.join(__dirname, 'managementRules.json');

// CORS: Allow all origins
app.use(cors());

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb' }));

// === CRITICAL: Health Check Endpoints (Must be FIRST) ===
app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// === API Endpoints ===
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

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start Server - CRITICAL: Must use callback
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('Server started on port ' + PORT);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// server.js (Railway Production Ready)
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

// === Health Check Endpoints ===
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Zipcode Classification Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime()
    });
});

// === 1. Get Rules API ===
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
        res.status(500).json({ 
            error: 'Server error while loading rules' 
        });
    }
});

// === 2. Upload Rules API ===
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

                // Remove hyphens
                const cleanZip = zip.replace(/-/g, '');

                // Validate 5 or 6 digit zipcode
                if (/^(\d{5}|\d{6})$/.test(cleanZip) && status.length > 0) {
                    managementRules[cleanZip] = status;
                    count++;
                }
            }
        });

        // Save to JSON file
        fs.writeFileSync(RULES_FILE, JSON.stringify(managementRules, null, 2), 'utf8');
        
        console.log(`Rules saved: ${count} entries`);
        
        res.status(200).json({
            success: true,
            message: 'Rules successfully saved to server',
            loadedCount: count
        });
    } catch (error) {
        console.error('Error saving rules:', error);
        res.status(500).json({ 
            error: 'Server error while saving rules',
            details: error.message
        });
    }
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.path
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Railway URL: https://zipcode-server-backend-production.up.railway.app`);
    console.log(`Health check: GET /`);
    console.log(`API endpoints:`);
    console.log(`  - GET  /api/rules`);
    console.log(`  - POST /api/upload-rules`);
});

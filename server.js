// server.js (Railway 헬스 체크 포함 최종본)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 규칙을 저장할 파일 경로
const RULES_FILE = path.join(__dirname, 'managementRules.json');

// CORS 설정: 모든 도메인 허용
app.use(cors());

// 미들웨어 설정
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb' }));

// === Railway 헬스 체크 엔드포인트 ===
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: '우편번호 분류 서버가 정상 작동 중입니다.',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime()
    });
});

// === 1. 규칙 조회 API ===
app.get('/api/rules', (req, res) => {
    try {
        if (fs.existsSync(RULES_FILE)) {
            const rulesData = fs.readFileSync(RULES_FILE, 'utf8');
            res.status(200).json(JSON.parse(rulesData));
        } else {
            res.status(200).json({});
        }
    } catch (error) {
        console.error('규칙 조회 오류:', error);
        res.status(500).json({ 
            error: '규칙을 불러오는 중 서버 오류가 발생했습니다.' 
        });
    }
});

// === 2. 규칙 저장 API ===
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

                // 하이픈(-) 제거
                const cleanZip = zip.replace(/-/g, '');

                // 5자리 또는 6자리 숫자 확인
                if (/^(\d{5}|\d{6})$/.test(cleanZip) && status.length > 0) {
                    managementRules[cleanZip] = status;
                    count++;
                }
            }
        });

        // JSON 파일로 저장
        fs.writeFileSync(RULES_FILE, JSON.stringify(managementRules, null, 2), 'utf8');
        
        console.log(`✅ 규칙 ${count}개 저장 완료`);
        
        res.status(200).json({
            success: true,
            message: '규칙이 성공적으로 서버에 저장되었습니다.',
            loadedCount: count
        });
    } catch (error) {
        console.error('❌ 규칙 저장 오류:', error);
        res.status(500).json({ 
            error: '규칙 저장 중 서버 오류가 발생했습니다.',
            details: error.message
        });
    }
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({ 
        error: '요청한 엔드포인트를 찾을 수 없습니다.',
        path: req.path
    });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`   Railway URL: https://zipcode-server-backend-production.up.railway.app`);
    console.log(`   헬스 체크: GET /`);
    console.log(`   API 엔드포인트:`);
    console.log(`     - GET  /api/rules`);
    console.log(`     - POST /api/upload-rules`);
});

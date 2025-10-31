// server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 규칙을 저장할 파일 경로 (서버가 영구적으로 보관할 파일입니다.)
const RULES_FILE = path.join(__dirname, 'managementRules.json');

// 미들웨어 설정
app.use(cors()); // 프론트엔드(HTML 파일)의 요청을 허용합니다.
app.use(bodyParser.json({ limit: '50mb' })); // JSON 형식 요청 본문 파싱
app.use(bodyParser.text({ limit: '50mb' })); // 텍스트 형식 요청 본문 파싱

// --- 1. 규칙 조회 API (게스트 및 관리자가 규칙을 불러올 때 사용) ---
app.get('/api/rules', (req, res) => {
    try {
        if (fs.existsSync(RULES_FILE)) {
            const rulesData = fs.readFileSync(RULES_FILE, 'utf8');
            res.status(200).json(JSON.parse(rulesData));
        } else {
            // 파일이 없으면 빈 객체를 반환 (규칙이 없는 상태)
            res.status(200).json({});
        }
    } catch (error) {
        console.error('규칙 조회 오류:', error);
        res.status(500).send('규칙을 불러오는 중 서버 오류가 발생했습니다.');
    }
});

// --- 2. 규칙 저장 API (관리자가 파일 업로드 시 사용) ---
app.post('/api/upload-rules', (req, res) => {
    // 프론트엔드에서 보낸 규칙 텍스트 전체를 받습니다.
    const rulesContent = req.body; 

    // 클라이언트에서 하던 파일 분석(parseRules) 로직을 서버에서 다시 합니다.
    let managementRules = {};
    let count = 0;
    
    // 줄바꿈 문자로 분리
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
            const zip = parts[0].trim();
            const status = parts[1].trim();
            
            // 5자리 또는 6자리 숫자 우편번호 확인
            if (/^(\d{5}|\d{6})$/.test(zip) && status.length > 0) {
                managementRules[zip] = status;
                count++;
            }
        }
    });

    try {
        // 규칙을 JSON 문자열로 변환하여 파일에 영구 저장합니다. (이 파일이 데이터베이스 역할)
        fs.writeFileSync(RULES_FILE, JSON.stringify(managementRules, null, 2), 'utf8');
        res.status(200).json({ 
            message: '규칙이 성공적으로 서버에 저장되었습니다.', 
            loadedCount: count 
        });
    } catch (error) {
        console.error('규칙 저장 오류:', error);
        res.status(500).send('규칙 저장 중 서버 오류가 발생했습니다.');
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`✅ 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
// server.js (CORS 수정 최종본)

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // CORS 라이브러리
const fs = require('fs');
const path = require('path');

const app = express();
// ✅ 1. Railway 자동 할당 포트 사용 (수정됨)
const PORT = process.env.PORT || 3000; 

// 규칙을 저장할 파일 경로
const RULES_FILE = path.join(__dirname, 'managementRules.json');

// ✅ --- 2. CORS 설정 수정 ---
// Netlify 사이트의 주소를 명시적으로 허용합니다.
// 이 코드가 'Failed to fetch' 오류를 해결합니다.
const corsOptions = {
  origin: 'https://exquisite-gaufre-230cc6.netlify.app',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// --- CORS 설정 끝 ---

// 미들웨어 설정
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.text({ limit: '50mb' })); 

// --- 1. 규칙 조회 API ---
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
        res.status(500).send('규칙을 불러오는 중 서버 오류가 발생했습니다.');
    }
});

// --- 2. 규칙 저장 API (비밀 키 인증 없음) ---
app.post('/api/upload-rules', (req, res) => {
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
            
            // ✅ 3. 하이픈(-) 제거 로직 (수정됨)
            const cleanZip = zip.replace(/-/g, ''); 
            
            // 5자리 또는 6자리 숫자 확인
            if (/^(\d{5}|\d{6})$/.test(cleanZip) && status.length > 0) {
                managementRules[cleanZip] = status;
                count++;
            }
        }
    });

    try {
        // 규칙을 JSON 문자열로 변환하여 파일에 영구 저장
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
// ✅ 1. Railway 접속을 위한 0.0.0.0 바인딩 (수정됨)
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`✅ 서버가 포트 ${PORT} 에서 실행 중입니다.`);
});


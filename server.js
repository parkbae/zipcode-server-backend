// --- 기본 모듈 (기존과 동일) ---
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// 💥 Render.com 기본 포트는 10000입니다. (기존 3000에서 변경)
const PORT = process.env.PORT || 10000;

// --- [새 로직 1] 규칙 파일 경로 및 메모리 변수 ---
// 💥 중요: 한글 파일명('관리지역.txt') -> 영어('rules.txt')로 변경
const TXT_RULES_FILE = path.join(__dirname, 'rules.txt');
let managementRules = {}; // 규칙을 메모리에 저장할 변수

// --- CORS 및 Middleware (기존과 동일) ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb' })); // 텍스트 업로드를 위해 필수

// --- [새 로직 2] 텍스트를 파싱하는 함수 (기존 POST에서 분리) ---
// (v22 로직과 동일)
function parseRules(content) {
    const rules = {};
    let count = 0;

    // BOM (Byte Order Mark) 제거
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.substring(1);
    }
    const lines = content.split(/\r?\n/);

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;

        // 콤마(,) 또는 탭(\t)으로 분리
        let parts = trimmedLine.split(',');
        if (parts.length < 2) {
            parts = trimmedLine.split('\t');
        }
        
        if (parts.length >= 2) {
            let zip = parts[0].trim();
            let status = parts[1].trim();
            
            // 따옴표 제거 (예: "01000")
            zip = zip.replace(/^"|"$/g, '');
            status = status.replace(/^"|"$/g, '');

            const cleanZip = zip.replace(/-/g, '');
            const zipRegex = /^\d{5}$|^\d{6}$/;

            if (zipRegex.test(cleanZip) && status) {
                rules[cleanZip] = status;
                count++;
            }
        }
    });
    console.log(`[규칙 파싱 완료] 총 ${count}개의 유효한 규칙을 로드했습니다.`);
    return rules;
}

// --- [새 로직 3] 서버 시작 시 'rules.txt' 파일을 읽어 메모리에 저장 ---
try {
    console.log(`[규칙 로드 시작] '${TXT_RULES_FILE}' 파일 읽기를 시도합니다...`);
    // 💥 중요: 'utf-8' -> 'euc-kr'로 인코딩 변경
    const fileContent = fs.readFileSync(TXT_RULES_FILE, 'euc-kr'); 
    managementRules = parseRules(fileContent);
} catch (err) {
    console.error(`[치명적 오류] '${TXT_RULES_FILE}' 파일 로드 실패!`, err.message);
    console.error("서버가 빈 규칙으로 시작합니다. 'rules.txt' 파일이 정확한 위치에 있는지, 인코딩은 'euc-kr'이 맞는지 확인하세요.");
    managementRules = {}; // 실패 시 빈 객체로 시작
}

// --- 상태 확인 (Health Check - 기존과 동일) ---
// CRITICAL: Simple health check that responds immediately
app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK (Health Check)');
});

app.get('/health', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK (Health Check)');
});


// --- [로직 수정] API: Get rules ---
// (index.html이 /api/getRules를 호출하든 /api/rules를 호출하든 둘 다 응답)
app.get('/api/rules', (req, res) => {
    // 💥 수정: 파일(X) -> 메모리(O)에서 즉시 반환
    res.status(200).json(managementRules);
});
app.get('/api/getRules', (req, res) => {
    // 💥 수정: 파일(X) -> 메모리(O)에서 즉시 반환
    res.status(200).json(managementRules);
});

// --- [로직 수정] API: Upload rules (관리자 임시 업로드) ---
app.post('/api/upload-rules', (req, res) => {
    try {
        const rulesContent = req.body; // text
        
        // 💥 수정: 텍스트를 파싱해서 '전역 변수'에 덮어쓰기
        managementRules = parseRules(rulesContent); 
        
        const count = Object.keys(managementRules).length;

        // 💥 수정: 파일 쓰기(fs.writeFileSync) 로직 "제거"
        
        console.log(`[임시 규칙 적용] ${count}개의 규칙이 메모리에 임시로 적용되었습니다.`);
        
        res.status(200).json({
            success: true,
            message: '규칙이 서버 메모리에 임시로 적용되었습니다. (서버 재시작 시 초기화됩니다)',
            loadedCount: count
        });

    } catch (error) {
        console.error('Error saving rules to memory:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// --- 404 (기존과 동일) ---
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// --- 서버 시작 (기존과 동일) ---
const server = app.listen(PORT, '0.0.0.0', () => {
    // 💥 Render.com 포트(10000)로 로그 수정
    console.log(`SERVER READY ON PORT ${PORT}`);
});

// --- Keep alive (기존과 동일) ---
const keepAliveInterval = setInterval(() => {
    console.log('Server alive: ' + new Date().toISOString());
}, 30000);

// --- Graceful Shutdown (기존과 동일) ---
function gracefulShutdown(signal) {
    console.log(`${signal} received. Stopping keep-alive.`);
    
    // 1. 인터벌을 즉시 중지합니다.
    clearInterval(keepAliveInterval);
    
    console.log('Closing server...');
    // 2. 서버를 닫습니다.
    server.close((err) => {
        if (err) {
            console.error('Error closing server:', err);
            process.exit(1); // 오류가 있으면 1번 코드로 종료
        }
        console.log('Server closed gracefully. Exiting process.');
        process.exit(0); // 성공하면 0번 코드로 종료
    });

    // 3. 만약 5초 안에 서버가 닫히지 않으면 강제 종료합니다.
    setTimeout(() => {
        console.error('Could not close connections in time, forcing shutdown');
        process.exit(1);
    }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


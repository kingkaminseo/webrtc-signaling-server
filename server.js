const http = require('http');
const express = require('express');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// 정적 파일 제공 설정
app.use(express.static('public'));

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('클라이언트가 연결되었습니다.');

    ws.on('message', (message) => {
        console.log('서버에서 받은 메시지:', message);
        try {
            const data = JSON.parse(message);
            console.log('전송할 데이터:', data);
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data)); // JSON 형식으로 메시지 전송
                }
            });
        } catch (e) {
            console.error('잘못된 JSON 메시지:', message);
        }
    });

    ws.on('close', () => {
        console.log('클라이언트 연결 종료');
    });
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

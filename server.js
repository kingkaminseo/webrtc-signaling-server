const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const url = require('url');

const app = express();
const server = http.createServer(app);

// 정적 파일 제공
app.use(express.static('public'));

const wss = new WebSocket.Server({ server });

// 방별 클라이언트를 저장하는 객체
const rooms = {};

wss.on('connection', (ws, request) => {
    const pathname = url.parse(request.url).pathname;
    const roomId = pathname.substring(1); // 방 ID는 URL 경로에서 추출

    if (!rooms[roomId]) {
        rooms[roomId] = [];
    }
    rooms[roomId].push(ws);

    console.log(`클라이언트가 방 ${roomId}에 연결되었습니다.`);

    ws.on('message', (message) => {
        console.log('서버에서 받은 메시지:', message);
        try {
            const data = JSON.parse(message);
            console.log('전송할 데이터:', data);

            // 해당 방에 연결된 모든 클라이언트에게 메시지 전송
            rooms[roomId].forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data)); // JSON 형식으로 메시지 전송
                }
            });
        } catch (e) {
            console.error('잘못된 JSON 메시지:', message);
        }
    });

    ws.on('close', () => {
        console.log(`클라이언트가 방 ${roomId}에서 연결 종료`);
        // 클라이언트가 연결 종료되면 방에서 제거
        rooms[roomId] = rooms[roomId].filter(client => client !== ws);
        if (rooms[roomId].length === 0) {
            delete rooms[roomId]; // 방에 클라이언트가 없으면 방 삭제
        }
    });
});

const PORT = 8081;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 http://0.0.0.0:${PORT} 에서 실행 중입니다.`);
});

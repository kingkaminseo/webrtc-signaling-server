const shareScreenBtn = document.getElementById('shareScreenBtn');
const screenVideo = document.getElementById('screenVideo');

let peerConnection;
const signalingServer = new WebSocket('ws://localhost:8080');

// WebSocket 이벤트 핸들러
signalingServer.onopen = () => {
    console.log('WebSocket 서버에 연결되었습니다.');
};

signalingServer.onerror = (error) => {
    console.error('WebSocket 오류 발생:', error);
};

signalingServer.onmessage = async (message) => {
    console.log('서버에서 메시지 수신:', message.data);
    try {
        const data = JSON.parse(message.data);

        if (data.type === 'offer') {
            if (!peerConnection) {
                setupPeerConnection();
            }
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            signalingServer.send(JSON.stringify({ type: 'answer', answer }));
        } else if (data.type === 'answer') {
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        } else if (data.type === 'ice-candidate') {
            if (peerConnection) {
                try {
                    console.log('ICE Candidate 수신:', data.candidate);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.error('ICE 후보 추가 오류:', e);
                }
            }
        }
    } catch (e) {
        console.error('잘못된 메시지 형식:', message.data);
    }
};

// 화면 공유 버튼 클릭 시 실행
shareScreenBtn.addEventListener('click', async () => {
    if (!peerConnection) {
        setupPeerConnection();
    }

    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        console.log('화면 스트림:', screenStream); // 스트림 확인
        screenVideo.srcObject = screenStream; // 화면 스트림을 직접 비디오 요소에 설정
        screenStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, screenStream);
        });

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        signalingServer.send(JSON.stringify({ type: 'offer', offer }));
    } catch (err) {
        console.error("오류 발생: " + err);
    }
});

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection();

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('ICE Candidate 전송:', event.candidate);
            signalingServer.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
        }
    };

    peerConnection.ontrack = (event) => {
        console.log('ontrack 이벤트 발생:', event.streams[0]);
        if (event.streams[0]) {
            screenVideo.srcObject = event.streams[0];
        } else {
            console.warn('수신한 스트림 없음');
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', peerConnection.iceConnectionState);
    };

    peerConnection.onsignalingstatechange = () => {
        console.log('Signaling State:', peerConnection.signalingState);
    };
}

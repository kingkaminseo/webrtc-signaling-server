const roomIdInput = document.getElementById('roomIdInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const shareScreenBtn = document.getElementById('shareScreenBtn');
const stopScreenBtn = document.getElementById('stopScreenBtn');
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
const toggleMicBtn = document.getElementById('toggleMicBtn');

let peerConnection;
let signalingServer;
let localStream = null;
let screenStream = null;

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
        // WebSocket 서버에 방 정보와 함께 연결
        signalingServer = new WebSocket(`ws://localhost:8081/${roomId}`);
        console.log(roomId)
        signalingServer.onopen = () => {
            console.log('WebSocket 서버에 연결되었습니다.');
            loginSection.style.display = 'none';
            mainSection.style.display = 'block';
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

        // 나머지 버튼 이벤트 핸들러
        setupButtonEvents();
    } else {
        alert('Room ID를 입력하세요.');
    }
});

function setupButtonEvents() {
    shareScreenBtn.addEventListener('click', async () => {
        if (!peerConnection) {
            setupPeerConnection();
        }

        try {
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenVideo.srcObject = screenStream;

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            cameraVideo.srcObject = localStream;

            const combinedStream = new MediaStream([...screenStream.getVideoTracks(), ...localStream.getTracks()]);
            combinedStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, combinedStream);
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            signalingServer.send(JSON.stringify({ type: 'offer', offer }));

            shareScreenBtn.style.display = 'none';
            stopScreenBtn.style.display = 'inline-block';
        } catch (err) {
            console.error("오류 발생: " + err);
        }
    });

    stopScreenBtn.addEventListener('click', async () => {
        if (peerConnection) {
            peerConnection.getSenders().forEach(sender => {
                if (sender.track) {
                    sender.track.stop();
                }
            });
            peerConnection.close();
            peerConnection = null;
            shareScreenBtn.style.display = 'inline-block';
            stopScreenBtn.style.display = 'none';
        }

        // Stop screen and camera streams
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            screenStream = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
    });

    toggleCameraBtn.addEventListener('click', () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            toggleCameraBtn.textContent = localStream.getVideoTracks()[0].enabled ? 'Disable Camera' : 'Enable Camera';
        }
    });

    toggleMicBtn.addEventListener('click', () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            toggleMicBtn.textContent = localStream.getAudioTracks()[0].enabled ? 'Mute Mic' : 'Unmute Mic';
        }
    });
}

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
        const stream = event.streams[0];
        const videoTrack = stream.getVideoTracks()[0];

        if (videoTrack.label.includes("screen")) {
            otherScreenVideo.srcObject = stream;
        } else {
            otherCameraVideo.srcObject = stream;
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', peerConnection.iceConnectionState);
    };

    peerConnection.onsignalingstatechange = () => {
        console.log('Signaling State:', peerConnection.signalingState);
    };
}

// State
let socket;
let localStream;
let peers = {}; // socketId -> RTCPeerConnection
let currentAvatar = null;
let currentRoom = null;
let currentName = null;
let currentPassword = null;
let micMuted = true;

// Configuration
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

// UI Elements
const landingSection = document.getElementById('landing-section');
const roomSection = document.getElementById('room-section');
const form = document.getElementById('form');
const avatarsContainer = document.getElementById('avatars');
const micBtn = document.getElementById('mic-btn');
const leaveBtn = document.getElementById('leave-btn');
const shareBtn = document.getElementById('share-btn');
const membersContainer = document.getElementById('members-container');
const roomNameDisplay = document.getElementById('room-name-display');
const userCountDisplay = document.getElementById('user-count-display');

// Chat UI Elements
const chatPanel = document.getElementById('chat-panel');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');

// Emoji list
const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '👋', '🤙', '💪', '🖕', '✍️', '🙏', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '⛸️', '🥌', '🛷', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩'];

// Avatar selection
avatarsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('avatar-selection')) {
    document.querySelectorAll('.avatar-selection').forEach(av => av.classList.remove('selected'));
    e.target.classList.add('selected');
    currentAvatar = e.target.dataset.id;
  }
});

// Check URL for shared room
function checkSharedRoom() {
  const params = new URLSearchParams(window.location.search);
  const roomName = params.get('room');
  const roomPassword = params.get('password');

  if (roomName) {
    form.roomname.value = roomName;
    if (roomPassword) {
      form.roompassword.value = roomPassword;
    }
  }
}

checkSharedRoom();

// Join room
async function joinRoom(e) {
  e.preventDefault();

  if (!currentAvatar) {
    showNotification('Please select an operative', 'error');
    return;
  }

  currentName = form.displayname.value;
  currentRoom = form.roomname.value;
  currentPassword = form.roompassword.value || '';

  // Show Intro Video
  const introOverlay = document.getElementById('intro-overlay');
  const introVideo = document.getElementById('intro-video');
  const skipBtn = document.getElementById('skip-intro-btn');

  introOverlay.classList.remove('hidden');

  try {
    await introVideo.play();
  } catch (err) {
    console.log("Auto-play prevented", err);
  }

  const proceedToJoin = async () => {
    introVideo.pause();
    introOverlay.classList.add('hidden');
    await executeJoinLogic();
  };

  introVideo.onended = proceedToJoin;
  skipBtn.onclick = proceedToJoin;
}

async function executeJoinLogic() {
  try {
    // Initialize Socket.io
    socket = io();

    // Get Local Stream
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.getAudioTracks()[0].enabled = false; // Start muted
      micMuted = true;
      updateMicButton();
    } catch (err) {
      console.error('Microphone access error:', err);
      showNotification('Could not access microphone. Joining as listener.', 'error');
    }

    // Join Socket Room
    socket.emit('join-room', {
      room: currentRoom,
      password: currentPassword,
      userName: currentName,
      avatar: currentAvatar
    });

    // Handle Socket Events
    socket.on('join-success', ({ users, userCount }) => {
      console.log('Joined room successfully', users);

      landingSection.classList.remove('active-section');
      roomSection.classList.add('active-section');
      roomNameDisplay.textContent = currentRoom;
      userCountDisplay.textContent = `${userCount} Operative${userCount !== 1 ? 's' : ''}`;

      // Add self
      addMemberCard(socket.id, currentName, currentAvatar, true);

      // Add existing users and initiate connections
      users.forEach(user => {
        if (user.id !== socket.id) {
          addMemberCard(user.id, user.userName, user.avatar);
          // We are the new joiner, so we initiate offers to existing users
          initiateConnection(user.id);
        }
      });

      chatPanel.classList.add('visible');
      setupChatListeners();
    });

    socket.on('join-error', ({ message }) => {
      showNotification(message, 'error');
      leaveRoom();
    });

    socket.on('user-joined', ({ id, userName, avatar }) => {
      console.log('User joined:', userName);
      addMemberCard(id, userName, avatar);
      showNotification(`${userName} joined the room`, 'success');
      // Wait for offer from them (or we can wait for them to initiate)
      // Usually new joiner initiates, so existing users wait for offer.
    });

    socket.on('user-left', (id) => {
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) {
        const name = card.querySelector('.member-name').textContent;
        removeMemberCard(id);
        showNotification(`${name} left the sector`, 'info');
      }
      if (peers[id]) {
        peers[id].close();
        delete peers[id];
      }
    });

    socket.on('user-count', (count) => {
      userCountDisplay.textContent = `${count} Operative${count !== 1 ? 's' : ''}`;
    });

    // WebRTC Signaling
    socket.on('offer', async ({ caller, offer }) => {
      await handleOffer(caller, offer);
    });

    socket.on('answer', async ({ caller, answer }) => {
      await handleAnswer(caller, answer);
    });

    socket.on('ice-candidate', async ({ caller, candidate }) => {
      await handleCandidate(caller, candidate);
    });

  } catch (error) {
    console.error('Join error:', error);
    showNotification('Failed to join room: ' + error.message, 'error');
  }
}

// WebRTC Functions

function createPeerConnection(targetId) {
  const pc = new RTCPeerConnection(rtcConfig);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        target: targetId,
        candidate: event.candidate
      });
    }
  };

  pc.ontrack = (event) => {
    const remoteAudio = document.createElement('audio');
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.autoplay = true;
    remoteAudio.id = `audio-${targetId}`;
    document.body.appendChild(remoteAudio);

    // Simple volume detection for visual feedback
    setupAudioAnalysis(event.streams[0], targetId);
  };

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  peers[targetId] = pc;
  return pc;
}

async function initiateConnection(targetId) {
  const pc = createPeerConnection(targetId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit('offer', {
    target: targetId,
    offer: offer
  });
}

async function handleOffer(senderId, offer) {
  const pc = createPeerConnection(senderId);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit('answer', {
    target: senderId,
    answer: answer
  });
}

async function handleAnswer(senderId, answer) {
  const pc = peers[senderId];
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

async function handleCandidate(senderId, candidate) {
  const pc = peers[senderId];
  if (pc) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

function setupAudioAnalysis(stream, userId) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const checkVolume = () => {
    if (!peers[userId]) {
      audioContext.close();
      return;
    }
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    if (average > 10) { // Threshold
      highlightSpeaker(userId);
    }
    requestAnimationFrame(checkVolume);
  };
  checkVolume();
}

function highlightSpeaker(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    const wrapper = card.querySelector('.avatar-wrapper');
    if (wrapper) {
      wrapper.classList.add('speaking');
      setTimeout(() => wrapper.classList.remove('speaking'), 200);
    }
  }
}

// UI Functions
function addMemberCard(id, userName, avatarId, isSelf = false) {
  if (document.querySelector(`[data-id="${id}"]`)) return;

  const card = document.createElement('div');
  card.className = 'member-card';
  card.dataset.id = id;

  card.innerHTML = `
    <div class="avatar-wrapper">
      <img src="/avatars/cs-${avatarId}.png" alt="${userName}" class="member-avatar" />
    </div>
    <div class="member-info">
      <span class="member-name">${userName}${isSelf ? ' (You)' : ''}</span>
    </div>
  `;

  membersContainer.appendChild(card);
}

function removeMemberCard(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => card.remove(), 300);
  }
  const audio = document.getElementById(`audio-${id}`);
  if (audio) audio.remove();
}

function toggleMic() {
  if (localStream) {
    micMuted = !micMuted;
    localStream.getAudioTracks()[0].enabled = !micMuted;
    updateMicButton();

    // Update self card visual
    const selfCard = document.querySelector(`[data-id="${socket.id}"]`);
    if (selfCard) {
      const wrapper = selfCard.querySelector('.avatar-wrapper');
      if (micMuted) {
        wrapper.style.borderColor = 'var(--danger)';
      } else {
        wrapper.style.borderColor = 'var(--accent-color)';
      }
    }
  }
}

function updateMicButton() {
  const micIcon = document.getElementById('mic-icon');
  if (micMuted) {
    micIcon.src = '/icons/mic-off.svg';
    micBtn.classList.remove('active');
  } else {
    micIcon.src = '/icons/mic.svg';
    micBtn.classList.add('active');
  }
}

function leaveRoom() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  Object.values(peers).forEach(pc => pc.close());
  peers = {};

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Clear UI
  membersContainer.innerHTML = '';
  chatMessages.innerHTML = '';
  chatPanel.classList.remove('visible');

  roomSection.classList.remove('active-section');
  landingSection.classList.add('active-section');

  form.reset();
  currentAvatar = null;
  document.querySelectorAll('.avatar-selection').forEach(av => av.classList.remove('selected'));

  // Remove all remote audio elements
  document.querySelectorAll('audio').forEach(el => el.remove());
}

function shareRoom() {
  const url = `${window.location.origin}?room=${encodeURIComponent(currentRoom)}${currentPassword ? `&password=${encodeURIComponent(currentPassword)}` : ''}`;
  navigator.clipboard.writeText(url).then(() => {
    showNotification('Room link copied to clipboard!', 'success');
  }).catch(() => {
    showNotification('Failed to copy link', 'error');
  });
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  const notificationArea = document.getElementById('notification-area');
  notificationArea.appendChild(notification);

  playNotificationSound(type);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Sound Effects System
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playNotificationSound(type = 'info') {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'error') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'chat') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }
}

// ===== CHAT FUNCTIONALITY =====

function setupEmojiPicker() {
  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.className = 'emoji-btn';
    btn.onclick = () => {
      chatInput.value += emoji;
      emojiPicker.classList.add('hidden');
      chatInput.focus();
    };
    emojiPicker.appendChild(btn);
  });
}

emojiBtn.addEventListener('click', () => {
  emojiPicker.classList.toggle('hidden');
});

function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || !socket || !currentRoom) return;

  socket.emit('chat-message', {
    room: currentRoom,
    message,
    userName: currentName,
    timestamp: Date.now()
  });

  chatInput.value = '';
  emojiPicker.classList.add('hidden');
}

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

function setupChatListeners() {
  socket.on('chat-message', ({ id, userName, message, timestamp }) => {
    addChatMessage(userName, message, timestamp, id === socket.id);
  });
}

function addChatMessage(userName, message, timestamp, isOwn) {
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${isOwn ? 'own' : ''}`;

  const time = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  messageEl.innerHTML = `
    <div class="chat-meta">
      <span class="chat-user">${escapeHtml(userName)}</span>
      <span class="chat-time">${time}</div>
    <div class="chat-text">${escapeHtml(message)}</div>
  `;

  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (!isOwn) {
    playNotificationSound('chat');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

setupEmojiPicker();

// Event Listeners
form.addEventListener('submit', joinRoom);
micBtn.addEventListener('click', toggleMic);
leaveBtn.addEventListener('click', leaveRoom);
if (shareBtn) shareBtn.addEventListener('click', shareRoom);

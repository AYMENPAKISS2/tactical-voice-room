// Imports removed to use CDN globals (AgoraRTC)
// State
let socket; // Socket.io client
let localStream;
let peers = {}; // socketId -> RTCPeerConnection
let micMuted = true;
let currentAvatar = null;
let currentRoom = null;
let currentName = null;
let currentPassword = null;

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

// WebRTC Config
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

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

  try {
    // Connect Socket.io
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

    // Join room with password
    socket.emit('join-room', {
      room: currentRoom,
      password: currentPassword,
      userName: currentName,
      avatar: currentAvatar
    });

    // Handle join response
    socket.on('join-success', async ({ users, userCount }) => {
      console.log('Joined room successfully', users);

      // Update UI
      landingSection.classList.remove('active-section');
      roomSection.classList.add('active-section');
      roomNameDisplay.textContent = currentRoom;
      userCountDisplay.textContent = `${userCount} Operative${userCount !== 1 ? 's' : ''}`;

      // Add self
      addMemberCard(socket.id, currentName, currentAvatar, true);

      // Show chat panel
      chatPanel.classList.add('visible');

      // Setup chat listeners
      setupChatListeners();

      // Connect to existing users (We are the initiator)
      users.forEach(user => {
        createPeerConnection(user.id, user.userName, user.avatar, true);
      });
    });

    socket.on('join-error', ({ message }) => {
      showNotification(message, 'error');
    });

    socket.on('user-joined', ({ id, userName, avatar }) => {
      console.log('User joined:', userName);
      addMemberCard(id, userName, avatar);
      showNotification(`${userName} joined the room`, 'success');
      // Wait for offer from new user (They are initiator)
    });

    // WebRTC Signaling Handlers
    socket.on('offer', async (payload) => {
      const pc = createPeerConnection(payload.caller, payload.userName, payload.avatar, false);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        target: payload.caller,
        caller: socket.id,
        sdp: pc.localDescription
      });
    });

    socket.on('answer', async (payload) => {
      const pc = peers[payload.caller];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });

    socket.on('ice-candidate', async (payload) => {
      const pc = peers[payload.caller];
      if (pc && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    socket.on('user-left', (socketId) => {
      // Get name before removing
      const card = document.querySelector(`[data-socket-id="${socketId}"]`);
      const name = card ? card.querySelector('.member-name').innerText.replace(' (You)', '') : 'Operative';

      removeMemberCard(socketId);
      if (peers[socketId]) {
        peers[socketId].close();
        delete peers[socketId];
      }
      // Remove audio element
      const audioEl = document.getElementById(`audio-${socketId}`);
      if (audioEl) audioEl.remove();

      showNotification(`${name} left the sector`, 'info');
    });

    socket.on('user-count', (count) => {
      userCountDisplay.textContent = `${count} Operative${count !== 1 ? 's' : ''}`;
    });

  } catch (error) {
    console.error('Join error:', error);
    showNotification('Failed to join room', 'error');
  }
}

function createPeerConnection(targetSocketId, userName, avatar, isInitiator) {
  const pc = new RTCPeerConnection(rtcConfig);
  peers[targetSocketId] = pc;

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        target: targetSocketId,
        caller: socket.id,
        candidate: event.candidate
      });
    }
  };

  pc.ontrack = (event) => {
    const stream = event.streams[0];
    let audioEl = document.getElementById(`audio-${targetSocketId}`);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `audio-${targetSocketId}`;
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
    }
    audioEl.srcObject = stream;

    // Simple volume indicator using AudioContext
    setupVolumeIndicator(stream, targetSocketId);
  };

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  if (isInitiator) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit('offer', {
        target: targetSocketId,
        caller: socket.id,
        userName: currentName,
        avatar: currentAvatar,
        sdp: offer
      });
    });
  }

  // If we are not the initiator, we wait for an offer (handled in socket.on('offer'))
  // But we still need to add the member card if it doesn't exist (e.g. we are the receiver)
  if (!document.querySelector(`[data-socket-id="${targetSocketId}"]`)) {
    addMemberCard(targetSocketId, userName, avatar);
  }

  return pc;
}

function setupVolumeIndicator(stream, socketId) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const checkVolume = () => {
    if (!peers[socketId]) {
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
      const card = document.querySelector(`[data-socket-id="${socketId}"]`);
      if (card) {
        const wrapper = card.querySelector('.avatar-wrapper');
        if (wrapper) {
          wrapper.classList.add('speaking');
          setTimeout(() => wrapper.classList.remove('speaking'), 100);
        }
      }
    }
    requestAnimationFrame(checkVolume);
  };
  checkVolume();
}

// UI Functions
function addMemberCard(socketId, userName, avatarId, isSelf = false) {
  if (document.querySelector(`[data-socket-id="${socketId}"]`)) return;

  const card = document.createElement('div');
  card.className = 'member-card';
  card.dataset.socketId = socketId;

  card.innerHTML = `
    <div class="avatar-wrapper">
      <img src="/avatars/cs-${avatarId}.png" alt="${userName}" class="member-avatar" />
    </div>
    <div class="member-info">
      <span class="member-name">${userName}${isSelf ? ' (You)' : ''}</span>
      ${!isSelf ? `
        <button class="mute-remote-btn" data-socket-id="${socketId}" title="Mute locally">
          🔇
        </button>
      ` : ''}
    </div>
  `;

  membersContainer.appendChild(card);

  // Local mute functionality
  if (!isSelf) {
    const muteBtn = card.querySelector('.mute-remote-btn');
    muteBtn.addEventListener('click', () => {
      const audioEl = document.getElementById(`audio-${socketId}`);
      if (audioEl) {
        audioEl.muted = !audioEl.muted;
        muteBtn.textContent = audioEl.muted ? '🔈' : '🔇';
        muteBtn.style.opacity = audioEl.muted ? '0.5' : '1';
      }
    });
  }
}

function removeMemberCard(socketId) {
  const card = document.querySelector(`[data-socket-id="${socketId}"]`);
  if (card) {
    card.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => card.remove(), 300);
  }
}

function toggleMic() {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    micMuted = !audioTrack.enabled;
    updateMicButton();

    // Update self card visual
    const selfCard = document.querySelector(`[data-socket-id="${socket.id}"]`);
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

async function leaveRoom() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  Object.values(peers).forEach(pc => pc.close());
  peers = {};

  if (socket) {
    socket.disconnect();
  }

  // Clear UI
  membersContainer.innerHTML = '';
  chatMessages.innerHTML = '';
  chatPanel.classList.remove('visible');

  roomSection.classList.remove('active-section');
  landingSection.classList.add('active-section');

  // Remove all audio elements
  document.querySelectorAll('audio').forEach(el => el.remove());

  form.reset();
  currentAvatar = null;
  document.querySelectorAll('.avatar-selection').forEach(av => av.classList.remove('selected'));
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
    // Soft low thud instead of harsh buzz
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'chat') {
    // Gentle pop
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else {
    // Smooth success chime
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

// Initialize emoji picker
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

// Toggle emoji picker
emojiBtn.addEventListener('click', () => {
  emojiPicker.classList.toggle('hidden');
});

// Send message
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

// Setup chat listeners
function setupChatListeners() {
  socket.on('chat-message', ({ id, userName, message, timestamp }) => {
    addChatMessage(userName, message, timestamp, id === socket.id);
  });
}

// Add message to chat
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

// HTML escape for security
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
setupEmojiPicker();

// Event Listeners
form.addEventListener('submit', joinRoom);
micBtn.addEventListener('click', toggleMic);
leaveBtn.addEventListener('click', leaveRoom);
if (shareBtn) shareBtn.addEventListener('click', shareRoom);

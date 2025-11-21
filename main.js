// Imports removed to use CDN globals (AgoraRTC)
// import AgoraRTC from "agora-rtc-sdk-ng"
// import AgoraRTM from "agora-rtm-sdk"

const appid = "ea7f8444db754db0b406c2374270ad88" // Still needed for client init, but tokens come from server

// State
let rtcClient;
let socket; // Socket.io client
let localTracks = {
  audioTrack: null
};
let remoteUsers = {};
let micMuted = true;
let currentAvatar = null;
let currentRoom = null;
let currentName = null;
let currentPassword = null;
let myRtcUid = null;

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

  try {
    // Connect Socket.io
    socket = io();

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

      // Get RTC token from server
      const response = await fetch(`/api/token/rtc?channel=${currentRoom}&uid=0`);
      const { token, uid } = await response.json();
      myRtcUid = uid;

      // Initialize RTC
      rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      await rtcClient.join(appid, currentRoom, token, myRtcUid);
      console.log('Joined RTC channel with UID:', myRtcUid);

      // Create and publish audio track
      try {
        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await rtcClient.publish([localTracks.audioTrack]);
        localTracks.audioTrack.setMuted(true); // Start muted
        micMuted = true;
        updateMicButton();
      } catch (err) {
        console.error('Microphone access error:', err);
        showNotification('Could not access microphone. Joining as listener.', 'error');
      }

      // Setup RTC event listeners
      rtcClient.on('user-published', handleUserPublished);
      rtcClient.on('user-unpublished', handleUserUnpublished);
      rtcClient.on('user-left', handleUserLeft);
      rtcClient.on('volume-indicator', handleVolumeIndicator);

      // Enable volume indicator
      rtcClient.enableAudioVolumeIndicator();

      // Update UI
      landingSection.classList.remove('active-section');
      roomSection.style.display = 'block';
      roomNameDisplay.textContent = currentRoom;
      userCountDisplay.textContent = `${userCount} Operative${userCount !== 1 ? 's' : ''}`;

      // Display existing users
      users.forEach(user => {
        if (user.id !== socket.id) {
          addMemberCard(user.id, user.userName, user.avatar);
        }
      });

      // Add self
      addMemberCard(socket.id, currentName, currentAvatar, true);

      // Show chat panel
      chatPanel.classList.add('visible');

      // Setup chat listeners
      setupChatListeners();
    });

    socket.on('join-error', ({ message }) => {
      showNotification(message, 'error');
    });

    socket.on('user-joined', ({ id, userName, avatar }) => {
      console.log('User joined:', userName);
      addMemberCard(id, userName, avatar);
      showNotification(`${userName} joined the room`, 'success');
    });

    socket.on('user-left', (socketId) => {
      removeMemberCard(socketId);
    });

    socket.on('user-count', (count) => {
      userCountDisplay.textContent = `${count} Operative${count !== 1 ? 's' : ''}`;
    });

  } catch (error) {
    console.error('Join error:', error);
    showNotification('Failed to join room', 'error');
  }
}

// RTC Handlers
async function handleUserPublished(user, mediaType) {
  await rtcClient.subscribe(user, mediaType);

  if (mediaType === 'audio') {
    remoteUsers[user.uid] = user;
    if (user.audioTrack) {
      user.audioTrack.play();
    }
  }
}

function handleUserUnpublished(user, mediaType) {
  if (mediaType === 'audio') {
    delete remoteUsers[user.uid];
  }
}

function handleUserLeft(user) {
  delete remoteUsers[user.uid];
}

function handleVolumeIndicator(volumes) {
  volumes.forEach(volume => {
    if (volume.level > 10) {
      const card = document.querySelector(`[data-socket-id="${volume.uid}"]`);
      if (card) {
        card.querySelector('.avatar-wrapper').classList.add('speaking');
        setTimeout(() => {
          card.querySelector('.avatar-wrapper').classList.remove('speaking');
        }, 200);
      }
    }
  });
}

// UI Functions
function addMemberCard(socketId, userName, avatarId, isSelf = false) {
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
      const user = Object.values(remoteUsers).find(u => u.uid.toString() === socketId);
      if (user && user.audioTrack) {
        const isMuted = user.audioTrack.isPlaying;
        if (isMuted) {
          user.audioTrack.stop();
          muteBtn.textContent = '🔊';
          muteBtn.title = 'Unmute locally';
        } else {
          user.audioTrack.play();
          muteBtn.textContent = '🔇';
          muteBtn.title = 'Mute locally';
        }
      }
    });
  }
}

function removeMemberCard(socketId) {
  const card = document.querySelector(`[data-socket-id="${socketId}"]`);
  if (card) {
    card.remove();
  }
}

function toggleMic() {
  if (!localTracks.audioTrack) return;

  micMuted = !micMuted;
  localTracks.audioTrack.setMuted(micMuted);
  updateMicButton();
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
  if (localTracks.audioTrack) {
    localTracks.audioTrack.close();
    localTracks.audioTrack = null;
  }

  if (rtcClient) {
    await rtcClient.leave();
    rtcClient = null;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  membersContainer.innerHTML = '';
  chatMessages.innerHTML = '';
  chatPanel.classList.remove('visible');
  roomSection.style.display = 'none';
  landingSection.classList.add('active-section');
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

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ===== CHAT FUNCTIONALITY =====

// Initialize emoji picker
function initEmojiPicker() {
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
      <span class="chat-time">${time}</span>
    </div>
    <div class="chat-text">${escapeHtml(message)}</div>
  `;

  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// HTML escape for security
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
initEmojiPicker();

// Event Listeners
form.addEventListener('submit', joinRoom);
micBtn.addEventListener('click', toggleMic);
leaveBtn.addEventListener('click', leaveRoom);
if (shareBtn) shareBtn.addEventListener('click', shareRoom);

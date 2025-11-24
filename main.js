import { rtcAppId } from './agoraConfig.js';

// State
let socket; // Socket.io client for Chat & Metadata
let agoraClient; // Agora RTC Client
let localAudioTrack;
let micMuted = true;
let currentAvatar = null;
let currentRoom = null;
let currentName = null;
let currentPassword = null;
let remoteUsers = {}; // Agora UID -> User Info (from socket)

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
    // 1. Initialize Agora Client
    agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // 2. Connect Socket.io (for Chat & User Metadata)
    socket = io();

    // 3. Join Agora Channel
    // Use room name as channel name. 
    // UID will be auto-assigned by Agora or we can pass null to let Agora assign it.
    // We'll use the socket ID as the UID if possible, but Agora UIDs must be numbers (or strings in string mode).
    // Simplest: Let Agora assign a numeric UID, and we map it to Socket ID via socket events.
    // ACTUALLY: To sync names/avatars, we need a common ID.
    // Strategy: 
    // - Join Socket.io first -> get socket.id
    // - Use a hash of socket.id or just let Agora assign UID and broadcast the mapping over Socket.io.
    // - EASIER: Let Agora assign UID, then send that UID to Socket.io "join-room".

    const uid = await agoraClient.join(rtcAppId, currentRoom, null, null);

    // 4. Create and Publish Local Audio Track
    try {
      localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      // Start muted
      localAudioTrack.setEnabled(false);
      micMuted = true;
      updateMicButton();

      await agoraClient.publish([localAudioTrack]);

      // Volume indicator for self
      setInterval(() => {
        if (localAudioTrack && !micMuted) {
          const level = localAudioTrack.getVolumeLevel();
          if (level > 0.1) {
            highlightSpeaker(uid); // Self highlight
          }
        }
      }, 200);

    } catch (err) {
      console.error('Microphone access error:', err);
      showNotification('Could not access microphone. Joining as listener.', 'error');
    }

    // 5. Join Socket Room with Metadata + Agora UID
    socket.emit('join-room', {
      room: currentRoom,
      password: currentPassword,
      userName: currentName,
      avatar: currentAvatar,
      agoraUid: uid // Send Agora UID to server so others know who we are
    });

    // Handle Agora Events
    agoraClient.on("user-published", handleUserPublished);
    agoraClient.on("user-unpublished", handleUserUnpublished);
    agoraClient.on("volume-indicator", handleVolumeIndicator);

    // Enable volume indicator
    agoraClient.enableAudioVolumeIndicator();

    // Handle Socket Events
    socket.on('join-success', ({ users, userCount }) => {
      console.log('Joined room successfully', users);

      landingSection.classList.remove('active-section');
      roomSection.classList.add('active-section');
      roomNameDisplay.textContent = currentRoom;
      userCountDisplay.textContent = `${userCount} Operative${userCount !== 1 ? 's' : ''}`;

      // Add self
      addMemberCard(uid, currentName, currentAvatar, true);

      // Add existing users
      users.forEach(user => {
        if (user.agoraUid && user.agoraUid !== uid) {
          remoteUsers[user.agoraUid] = user;
          addMemberCard(user.agoraUid, user.userName, user.avatar);
        }
      });

      chatPanel.classList.add('visible');
      setupChatListeners();
    });

    socket.on('join-error', ({ message }) => {
      showNotification(message, 'error');
      leaveRoom();
    });

    socket.on('user-joined', ({ id, userName, avatar, agoraUid }) => {
      console.log('User joined:', userName);
      if (agoraUid) {
        remoteUsers[agoraUid] = { id, userName, avatar, agoraUid };
        addMemberCard(agoraUid, userName, avatar);
        showNotification(`${userName} joined the room`, 'success');
      }
    });

    socket.on('user-left', (socketId) => {
      // Find Agora UID for this socket ID
      const uid = Object.keys(remoteUsers).find(key => remoteUsers[key].id === socketId);
      if (uid) {
        const name = remoteUsers[uid].userName;
        removeMemberCard(uid);
        delete remoteUsers[uid];
        showNotification(`${name} left the sector`, 'info');
      } else {
        // Fallback if we can't find by UID (shouldn't happen if synced)
        // Try to remove by socket ID if we stored it differently, but here we use UID as key for cards
      }
    });

    socket.on('user-count', (count) => {
      userCountDisplay.textContent = `${count} Operative${count !== 1 ? 's' : ''}`;
    });

  } catch (error) {
    console.error('Join error:', error);
    showNotification('Failed to join room: ' + error.message, 'error');
  }
}

async function handleUserPublished(user, mediaType) {
  await agoraClient.subscribe(user, mediaType);
  if (mediaType === "audio") {
    user.audioTrack.play();
  }
}

function handleUserUnpublished(user) {
  // Agora handles stopping playback automatically usually, but good to know
}

function handleVolumeIndicator(volumes) {
  volumes.forEach((volume) => {
    const { uid, level } = volume;
    if (level > 5) { // Threshold
      highlightSpeaker(uid);
    }
  });
}

function highlightSpeaker(uid) {
  // If uid is 0, it's local user (but we handle self separately usually, or Agora returns 0)
  // Actually Agora returns the real UID for remote, and 0 for local if not specified.
  // But since we joined with a UID, it might return that.
  // Let's check both.

  let targetUid = uid;
  if (uid === 0 && agoraClient) targetUid = agoraClient.uid;

  const card = document.querySelector(`[data-uid="${targetUid}"]`);
  if (card) {
    const wrapper = card.querySelector('.avatar-wrapper');
    if (wrapper) {
      wrapper.classList.add('speaking');
      setTimeout(() => wrapper.classList.remove('speaking'), 200);
    }
  }
}

// UI Functions
function addMemberCard(uid, userName, avatarId, isSelf = false) {
  if (document.querySelector(`[data-uid="${uid}"]`)) return;

  const card = document.createElement('div');
  card.className = 'member-card';
  card.dataset.uid = uid;

  card.innerHTML = `
    <div class="avatar-wrapper">
      <img src="/avatars/cs-${avatarId}.png" alt="${userName}" class="member-avatar" />
    </div>
    <div class="member-info">
      <span class="member-name">${userName}${isSelf ? ' (You)' : ''}</span>
    </div>
  `;
  // Removed local mute button for simplicity in this version, can add back if needed using user.audioTrack.setVolume(0)

  membersContainer.appendChild(card);
}

function removeMemberCard(uid) {
  const card = document.querySelector(`[data-uid="${uid}"]`);
  if (card) {
    card.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => card.remove(), 300);
  }
}

async function toggleMic() {
  if (localAudioTrack) {
    micMuted = !micMuted;
    await localAudioTrack.setEnabled(!micMuted);
    updateMicButton();

    // Update self card visual
    const selfCard = document.querySelector(`[data-uid="${agoraClient.uid}"]`);
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
  if (localAudioTrack) {
    localAudioTrack.close();
    localAudioTrack = null;
  }

  if (agoraClient) {
    await agoraClient.leave();
    agoraClient = null;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  remoteUsers = {};

  // Clear UI
  membersContainer.innerHTML = '';
  chatMessages.innerHTML = '';
  chatPanel.classList.remove('visible');

  roomSection.classList.remove('active-section');
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

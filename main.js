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
const micIcon = document.getElementById('mic-icon');

// --- Helper Functions ---

const showNotification = (message, type = 'info') => {
  const container = document.getElementById('notification-area');
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.innerText = message;
  container.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
};

const switchSection = (toSection) => {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active-section'));
  toSection.classList.add('active-section');
};

// --- Token Fetching ---

const fetchRtcToken = async (uid, channelName) => {
  const response = await fetch(`/api/token/rtc?uid=${uid}&channelName=${channelName}&role=publisher`);
  const data = await response.json();
  return data.rtcToken;
};

// --- Avatar Selection ---

avatarsContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('avatar-selection')) {
    document.querySelectorAll('.avatar-selection').forEach(img => img.classList.remove('selected'));
    e.target.classList.add('selected');
    currentAvatar = e.target.src;
  }
});

// --- Main Logic ---

const initSocket = (name, room, rtcUid, password) => {
  socket = io();

  socket.on('connect', () => {
    console.log('Connected to Socket.io server');
    // Join the room
    socket.emit('join-room', {
      room,
      name,
      avatar: currentAvatar,
      rtcUid,
      password
    });
  });

  socket.on('error-msg', (msg) => {
    showNotification(msg, 'error');
    leaveRoom(); // Force leave if error (like invalid password)
  });

  socket.on('existing-users', (users) => {
    users.forEach(user => {
      addMemberToDom(user.id, user.name, user.avatar, user.rtcUid);
    });
  });

  socket.on('user-joined', (user) => {
    addMemberToDom(user.id, user.name, user.avatar, user.rtcUid);
    showNotification(`${user.name} joined!`);
  });

  socket.on('user-left', (socketId) => {
    removeMemberFromDom(socketId);
  });

  socket.on('user-count', (count) => {
    if (userCountDisplay) {
      userCountDisplay.innerText = `${count} User${count !== 1 ? 's' : ''}`;
    }
  });
};

const initRtc = async (uid, room) => {
  rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  rtcClient.on("user-published", handleUserPublished);
  rtcClient.on("user-left", handleUserLeft);

  // Volume Indicator
  AgoraRTC.setParameter('AUDIO_VOLUME_INDICATION_INTERVAL', 200);
  rtcClient.enableAudioVolumeIndicator();
  rtcClient.on("volume-indicator", handleVolumeIndicator);

  const token = await fetchRtcToken(uid, room);
  await rtcClient.join(appid, room, token, uid);

  try {
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localTracks.audioTrack.setMuted(micMuted);
    await rtcClient.publish(localTracks.audioTrack);
    updateMicUI();
  } catch (error) {
    console.error("Microphone access failed:", error);
    showNotification("Microphone not found. Joining as listener only.", "warning");
    // Disable mic button since we have no mic
    micBtn.disabled = true;
    micBtn.style.opacity = "0.5";
  }
};

const joinRoom = async (e) => {
  e.preventDefault();

  if (!currentAvatar) {
    showNotification("Please select an avatar!", "error");
    return;
  }

  const displayName = e.target.displayname.value;
  const roomName = e.target.roomname.value.toLowerCase();
  const password = e.target.roompassword ? e.target.roompassword.value : '';

  currentName = displayName;
  currentRoom = roomName;
  currentPassword = password;

  // Generate a numeric UID for RTC
  const uid = Math.floor(Math.random() * 10000) + 1;
  myRtcUid = uid;

  console.log(`Joining room: ${roomName} as ${displayName} (RTC UID: ${uid})`);

  try {
    // 1. Init Socket.io for signaling (Members list)
    initSocket(displayName, roomName, uid, password);

    // 2. Init RTC for Audio
    showNotification("Connecting to audio...", "info");
    await initRtc(uid, roomName);

    // 3. Update UI
    roomNameDisplay.innerText = roomName;
    switchSection(roomSection);

    // Add self to UI (using 'local' as ID)
    addMemberToDom('local', displayName, currentAvatar, uid);

    showNotification(`Joined room: ${roomName}`);
  } catch (error) {
    console.error(error);
    showNotification("Failed to join audio. Check console.", "error");
  }
};

const leaveRoom = async () => {
  // Leave RTC
  if (localTracks.audioTrack) {
    localTracks.audioTrack.stop();
    localTracks.audioTrack.close();
  }
  if (rtcClient) {
    await rtcClient.unpublish();
    await rtcClient.leave();
  }

  // Leave Socket
  if (socket) {
    socket.disconnect();
  }

  membersContainer.innerHTML = '';
  switchSection(landingSection);
  showNotification("Left the room");
};

const shareRoom = () => {
  const url = new URL(window.location.href);
  url.searchParams.set('room', currentRoom);
  if (currentPassword) {
    url.searchParams.set('pass', currentPassword);
  }

  navigator.clipboard.writeText(url.toString()).then(() => {
    showNotification("Room link copied to clipboard!", "success");
  }).catch(err => {
    console.error('Could not copy text: ', err);
    showNotification("Failed to copy link", "error");
  });
};

// --- Event Handlers ---

const handleUserPublished = async (user, mediaType) => {
  await rtcClient.subscribe(user, mediaType);
  if (mediaType === "audio") {
    if (user.audioTrack) {
      user.audioTrack.play();
    } else {
      console.warn("Audio track not found for user", user.uid);
    }
  }
};

const handleUserLeft = (user) => {
  // Socket.io handles UI removal via 'user-left' event
  // But we can also use this to double check if needed
};

const handleVolumeIndicator = (volumes) => {
  volumes.forEach((volume) => {
    // volume.uid is the RTC UID
    // We need to find the DOM element with this RTC UID

    // Local user check
    let targetUid = volume.uid;
    if (targetUid === 0 && myRtcUid) {
      targetUid = myRtcUid;
    }

    const avatarWrapper = document.querySelector(`.avatar-wrapper[data-rtc-uid="${targetUid}"]`);

    if (avatarWrapper) {
      if (volume.level > 5) {
        avatarWrapper.classList.add('speaking');
      } else {
        avatarWrapper.classList.remove('speaking');
      }
    }
  });
};

const addMemberToDom = (socketId, name, avatarUrl, rtcUid) => {
  // Avoid duplicates
  if (document.getElementById(`member-${socketId}`)) return;

  const memberCard = document.createElement('div');
  memberCard.className = 'member-card';
  memberCard.id = `member-${socketId}`;

  // Add mute button for remote users
  let muteBtnHtml = '';
  if (socketId !== 'local') {
    muteBtnHtml = `
        <button class="mute-remote-btn" onclick="toggleRemoteMute('${rtcUid}', this)" title="Mute this user">
            <img src="icons/mic.svg" alt="Mute" width="16" />
        </button>
      `;
  }

  memberCard.innerHTML = `
        <div class="avatar-wrapper" data-rtc-uid="${rtcUid}">
            <img class="member-avatar" src="${avatarUrl || 'avatars/male-1.png'}" alt="${name}" />
        </div>
        <div class="member-info">
            <div class="member-name">${name}</div>
            ${muteBtnHtml}
        </div>
    `;

  membersContainer.appendChild(memberCard);
};

const removeMemberFromDom = (socketId) => {
  const memberEl = document.getElementById(`member-${socketId}`);
  if (memberEl) {
    memberEl.style.opacity = '0';
    memberEl.style.transform = 'scale(0.5)';
    setTimeout(() => memberEl.remove(), 300);
  }
};

const toggleMic = () => {
  micMuted = !micMuted;
  if (localTracks.audioTrack) {
    localTracks.audioTrack.setMuted(micMuted);
  }
  updateMicUI();
};

const updateMicUI = () => {
  if (micMuted) {
    micBtn.classList.remove('active');
    micIcon.src = 'icons/mic-off.svg';
    micBtn.style.background = 'rgba(239, 68, 68, 0.2)';
  } else {
    micBtn.classList.add('active');
    micIcon.src = 'icons/mic.svg';
    micBtn.style.background = 'var(--success)';
  }
};

// --- Global Functions (for onclick) ---

window.toggleRemoteMute = (rtcUid, btn) => {
  const uid = parseInt(rtcUid);
  const remoteUser = rtcClient.remoteUsers.find(user => user.uid === uid);

  if (remoteUser && remoteUser.audioTrack) {
    if (remoteUser.audioTrack.isPlaying) {
      remoteUser.audioTrack.stop(); // "Mute" locally by stopping playback
      btn.classList.add('muted');
      btn.querySelector('img').src = 'icons/mic-off.svg';
      btn.style.background = 'rgba(239, 68, 68, 0.2)';
    } else {
      remoteUser.audioTrack.play(); // "Unmute" locally
      btn.classList.remove('muted');
      btn.querySelector('img').src = 'icons/mic.svg';
      btn.style.background = 'rgba(255, 255, 255, 0.1)';
    }
  } else {
    showNotification("User is not speaking or not connected", "warning");
  }
};

// --- URL Params Handling ---
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const passParam = urlParams.get('pass');

  if (roomParam) {
    form.roomname.value = roomParam;
  }
  if (passParam && form.roompassword) {
    form.roompassword.value = passParam;
  }
});

// --- Listeners ---

form.addEventListener('submit', joinRoom);
micBtn.addEventListener('click', toggleMic);
leaveBtn.addEventListener('click', leaveRoom);
if (shareBtn) shareBtn.addEventListener('click', shareRoom);

# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
Tactical Voice Room (VATO's Room) is a Counter-Strike themed real-time voice chat application with room management, password protection, and PWA support. It uses WebRTC for peer-to-peer audio communication and Socket.io for signaling.

## Development Commands

### Starting the Server
```powershell
npm start
```
Starts the Express server on port 3001 (or PORT from .env). The server handles Socket.io signaling and serves static files.

### Installing Dependencies
```powershell
npm install
```

## Environment Setup
Create a `.env` file in the root directory:
```
APP_ID=your_agora_app_id
APP_CERTIFICATE=your_agora_certificate
PORT=3001
```

**Note**: While Agora configuration files exist (`agoraConfig.js`, `tokenConfig.js`), the current implementation uses pure WebRTC without Agora SDK. These files are legacy from a previous architecture iteration.

## Architecture

### Communication Stack
This application uses **WebRTC for audio** and **Socket.io for signaling**, NOT the Agora SDK despite config files present.

#### WebRTC Peer-to-Peer Audio
- **Client-side**: `main.js` manages RTCPeerConnection objects
- **ICE servers**: Google STUN servers (stun.l.google.com:19302-19305)
- **Media**: Audio-only streams, starts muted by default
- **Audio analysis**: Web Audio API for volume detection and visual feedback

#### Socket.io Signaling (server.js)
The server acts as a signaling server for WebRTC connection establishment:

**Core Events**:
- `join-room`: User joins a room with username, avatar, and optional password
- `signal`: Generic signaling event containing `type` (offer/answer/candidate) and `data`
- `offer`: WebRTC offer from new joiner to existing users
- `answer`: WebRTC answer response
- `ice-candidate`: ICE candidate exchange
- `chat-message`: Text chat broadcasting
- `disconnect`: User leaves room, triggers cleanup

**Server-to-Client Events**:
- `join-success`: Sent to new joiner with list of existing users
- `user-joined`: Broadcast when someone joins
- `user-left`: Broadcast when someone leaves
- `user-count`: Updated room member count
- `error-msg`: Password validation errors

#### Connection Flow
1. New user joins room via Socket.io (`join-room`)
2. Server validates password (if set) and adds user to room
3. Server sends `join-success` with existing users to new joiner
4. Server broadcasts `user-joined` to existing users
5. **New joiner initiates WebRTC offers** to all existing users
6. Existing users respond with WebRTC answers
7. ICE candidates are exchanged via Socket.io
8. Peer-to-peer audio streams established

**Important**: The new joiner always initiates WebRTC connections. Existing users wait for offers.

### Frontend Architecture (main.js)

**State Management**:
- `socket`: Socket.io connection
- `localStream`: Local MediaStream (audio only)
- `peers`: Object mapping socketId → RTCPeerConnection
- `currentRoom`, `currentName`, `currentAvatar`, `currentPassword`: Session state
- `micMuted`: Microphone mute state (starts true)

**Key Functions**:
- `joinRoom()`: Form submission handler, shows intro video
- `executeJoinLogic()`: Gets mic permissions, connects Socket.io, emits join-room
- `createPeerConnection(targetId)`: Creates RTCPeerConnection with ICE/track handlers
- `initiateConnection(targetId)`: New joiner creates offer to existing user
- `handleOffer()`: Existing user receives offer, creates answer
- `handleAnswer()`: Offer sender receives answer
- `handleCandidate()`: ICE candidate exchange
- `setupAudioAnalysis()`: Web Audio API for volume-based visual feedback
- `leaveRoom()`: Cleanup all connections, streams, and UI

### Room & Password Management
- **Password setting**: First user joining a room with a password sets the room password
- **Password validation**: Subsequent joiners must provide matching password
- **Password cleanup**: Room password deleted when last user leaves
- **Data structures** (server.js):
  - `users`: socketId → {room, userName, avatar}
  - `socketToRoom`: socketId → room
  - `roomPasswords`: roomName → password

### UI Structure
- **Landing section**: Avatar selection, room name, display name, password input
- **Room section**: HUD overlay, room header with controls, members grid
- **Chat panel**: Fixed bottom panel with emoji picker, message input
- **Intro video**: Plays on room join (can be skipped)

**Files**:
- `index.html`: Main HTML structure
- `style.css`: Landing page and general styles
- `room-ui.css`: Room view and HUD styling
- `chat.css`: Chat panel styling

### PWA Configuration
- `manifest.json`: PWA manifest with icons and theme
- `sw.js`: Minimal service worker (currently disabled, only claims clients)
- Icons stored in `/icons/` directory
- Installable on mobile and desktop

## Important Technical Details

### WebRTC vs Agora
Despite the presence of `agoraConfig.js`, `tokenConfig.js`, and related documentation (AGORA_FIX_GUIDE.md, TROUBLESHOOTING.md, etc.), **this app does NOT use Agora SDK**. The implementation is pure WebRTC with custom signaling via Socket.io. The Agora files are legacy and should be ignored or removed.

### Server Configuration
- **ES Modules**: Uses `"type": "module"` in package.json
- **Port**: Defaults to 3001, configurable via PORT environment variable
- **CORS**: Enabled for all origins
- **Static files**: Served from root directory
- **Catch-all route**: All routes serve index.html for SPA routing

### Audio Handling
- Microphone starts **muted** by default
- Audio tracks enabled/disabled (not removed) for mute/unmute
- Remote audio elements dynamically created and appended to document body
- Audio analysis uses Web Audio API (AudioContext, AnalyserNode)
- Visual feedback: Avatar border highlights when user speaks

### Chat System
- Messages broadcast to entire room including sender
- Emoji picker with 150+ emojis
- 200 character message limit
- Messages include timestamp

## File Structure Notes

**Server**:
- `server.js`: Express + Socket.io server with signaling logic

**Client**:
- `main.js`: All client-side logic (WebRTC, Socket.io, UI)
- `index.html`: Single page structure
- CSS files split by concern (style, chat, room-ui)

**Assets**:
- `/avatars/`: User avatars (cs-1.png to cs-4.png), logo, intro video
- `/icons/`: PWA icons, UI icons (mic, share, leave SVGs)

**Configuration** (Legacy/Unused):
- `agoraConfig.js`, `tokenConfig.js`, `appId.js`: Not used in current WebRTC implementation
- `debug_token.js`, `vite.config.js`: Legacy files

**Documentation**:
- `README.md`: Project overview and deployment instructions
- `AGORA_FIX_GUIDE.md`, `TROUBLESHOOTING.md`, etc.: Legacy Agora troubleshooting (not relevant)

## Deployment

### Railway Deployment
1. Push code to GitHub
2. Connect Railway to repository
3. Add environment variables (APP_ID, APP_CERTIFICATE if needed, PORT optional)
4. Railway auto-detects Node.js and runs `npm start`

### Requirements
- Node.js >= 18.0.0
- HTTPS required for WebRTC getUserMedia in production
- Firewall must allow WebRTC ports (STUN on 19302-19305, UDP/TCP for media)

## Common Gotchas

### Microphone Permissions
If `getUserMedia` fails, user joins as listener (no local stream). Check browser permissions and HTTPS requirement.

### Connection Issues
- Ensure Socket.io connects successfully before attempting WebRTC
- New joiners must initiate connections to existing users
- ICE candidate exchange must complete for audio to flow

### Password Edge Cases
- Password stored in-memory on server, lost on restart
- Empty rooms clear password
- Case-sensitive password matching

### Audio Playback
Remote audio elements are created dynamically with `autoplay=true`. Some browsers may block autoplay - user interaction required.

## Testing Notes
There are no automated tests in this repository. Manual testing requires:
- Multiple browser tabs/windows (or devices)
- Microphone permissions granted
- HTTPS or localhost environment
- Testing room password validation
- Testing WebRTC connection across different network conditions

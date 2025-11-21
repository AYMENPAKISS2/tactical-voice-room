import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import nocache from 'nocache';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const require = createRequire(import.meta.url);
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflict

// Force no cache for API
app.use(nocache());
app.use(cors());

// Serve static files from current directory
app.use(express.static(path.join(__dirname, '.')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const APP_ID = process.env.APP_ID ? process.env.APP_ID.trim() : '';
const APP_CERTIFICATE = process.env.APP_CERTIFICATE ? process.env.APP_CERTIFICATE.trim() : '';

if (!APP_ID || !APP_CERTIFICATE) {
    console.warn("⚠️  WARNING: APP_ID and APP_CERTIFICATE not set. Voice features will not work.");
    console.warn("⚠️  Please set these environment variables in Railway dashboard.");
} else {
    console.log(`✅ Agora Config: APP_ID=${APP_ID.substring(0, 5)}..., CERT=${APP_CERTIFICATE.substring(0, 5)}...`);
}

// --- Socket.io Signaling ---
const users = {}; // socketId -> { room, name, avatar, rtcUid }
const socketToRoom = {}; // socketId -> room
const roomPasswords = {}; // roomName -> password

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ room, userName, avatar, rtcUid, password }) => {
        // Password Validation
        if (roomPasswords[room]) {
            if (roomPasswords[room] !== password) {
                socket.emit('error-msg', 'Invalid Password');
                return;
            }
        } else if (password) {
            // Set password for the room if it's the first user and they provided one
            const clientsInRoom = io.sockets.adapter.rooms.get(room);
            if (!clientsInRoom || clientsInRoom.size === 0) {
                roomPasswords[room] = password;
                console.log(`Password set for room ${room}`);
            }
        }

        socket.join(room);
        users[socket.id] = { room, userName, avatar, rtcUid };
        socketToRoom[socket.id] = room;

        console.log(`User ${userName} joined room ${room}`);

        // Broadcast to others in the room
        socket.to(room).emit('user-joined', {
            id: socket.id,
            userName,
            avatar,
            rtcUid
        });

        // Send list of existing users to the new user
        const usersInRoom = [];
        const clients = io.sockets.adapter.rooms.get(room);
        if (clients) {
            for (const clientId of clients) {
                if (clientId !== socket.id && users[clientId]) {
                    usersInRoom.push({
                        id: clientId,
                        ...users[clientId]
                    });
                }
            }
        }
        socket.emit('join-success', {
            users: usersInRoom,
            userCount: clients ? clients.size : 0
        });
    });

    // Chat message broadcasting
    socket.on('chat-message', ({ room, message, userName, timestamp }) => {
        // Broadcast to all users in the room including sender
        io.to(room).emit('chat-message', {
            id: socket.id,
            userName,
            message,
            timestamp
        });
    });

    socket.on('disconnect', () => {
        const room = socketToRoom[socket.id];
        if (room) {
            socket.to(room).emit('user-left', socket.id);
            console.log(`User ${socket.id} left room ${room}`);

            // Update user count
            const clients = io.sockets.adapter.rooms.get(room);
            io.to(room).emit('user-count', clients ? clients.size : 0);

            // Clean up password if room is empty
            if (!clients || clients.size === 0) {
                delete roomPasswords[room];
                console.log(`Room ${room} empty, password cleared`);
            }
        }
        delete users[socket.id];
        delete socketToRoom[socket.id];
    });
});

// --- Agora RTC Token ---
const generateRtcToken = (req, resp) => {
    resp.header('Access-Control-Allow-Origin', '*');

    const channelName = req.query.channelName;
    if (!channelName) {
        return resp.status(500).json({ 'error': 'channel is required' });
    }

    let uid = req.query.uid;
    if (!uid || uid === '') {
        uid = 0;
    } else {
        uid = parseInt(uid, 10);
    }
    let role = RtcRole.SUBSCRIBER;
    if (req.query.role === 'publisher') {
        role = RtcRole.PUBLISHER;
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use env vars or fallback to provided keys for local testing
    const appId = process.env.APP_ID || 'abfbe50f6a26478e8edd01dd05cf2b65';
    const appCertificate = process.env.APP_CERTIFICATE || '31fb5977f0bb4f799be0edc88e814afe';

    if (!appId || !appCertificate) {
        return resp.status(500).json({ 'error': 'APP_ID and APP_CERTIFICATE are required' });
    }

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
        return resp.json({ 'rtcToken': token, 'uid': uid });
    } catch (err) {
        console.error('Error generating token:', err);
        return resp.status(500).json({ 'error': 'Failed to generate token' });
    }
};

app.get('/api/token/rtc', generateRtcToken);
app.get('/rtc-token', generateRtcToken); // Legacy support for cached clients

// Catch-all for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

httpServer.listen(PORT, () => {
    console.log(`✅ VATO SERVER RUNNING on port ${PORT}`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const require = createRequire(import.meta.url);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

console.log(`✅ VATO SERVER (WebRTC) RUNNING on port ${PORT}`);

// --- Socket.io Signaling ---
const users = {}; // socketId -> { room, name, avatar }
const socketToRoom = {}; // socketId -> room
const roomPasswords = {}; // roomName -> password

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ room, userName, avatar, password }) => {
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
        users[socket.id] = { room, userName, avatar };
        socketToRoom[socket.id] = room;

        console.log(`User ${userName} joined room ${room}`);

        // Broadcast to others in the room
        socket.to(room).emit('user-joined', {
            id: socket.id,
            userName,
            avatar
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

    // WebRTC Signaling Events
    socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
        io.to(payload.target).emit('ice-candidate', payload);
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

// Catch-all for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Socket.io`);
});

// ============================================
// PIXEL INFINITY - Multiplayer Server
// Express + Socket.IO + Leaderboard
// ============================================

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    pingInterval: 10000,
    pingTimeout: 5000
});

// Serve static game files
app.use(express.static(join(__dirname, "HTML")));
app.use(express.json());

// ============================================
// GAME ROOMS
// ============================================
const rooms = new Map();      // roomId -> { players: Map<socketId, playerData>, createdAt }
const playerRooms = new Map(); // socketId -> roomId
let nextRoomId = 1;

function findOrCreateRoom(socket) {
    // Find room with 1 player waiting
    for (const [roomId, room] of rooms) {
        if (room.players.size < 4 && room.state === "playing") {
            return roomId;
        }
    }
    // Create new room
    const roomId = "room_" + nextRoomId++;
    rooms.set(roomId, { players: new Map(), state: "playing", createdAt: Date.now() });
    return roomId;
}

// ============================================
// LEADERBOARD (in-memory, persists until server restart)
// ============================================
const leaderboard = {
    daily: [],    // [{ name, score, kills, level, time, date }]
    weekly: [],
    monthly: [],
    allTime: []
};

function addScore(entry) {
    const now = new Date();
    const record = {
        name: entry.name || "Anonymous",
        score: entry.kills || 0,
        kills: entry.kills || 0,
        level: entry.level || 1,
        time: entry.time || 0,
        heroId: entry.heroId || "archer",
        date: now.toISOString()
    };

    // Add to all periods
    leaderboard.allTime.push(record);
    leaderboard.daily.push(record);
    leaderboard.weekly.push(record);
    leaderboard.monthly.push(record);

    // Sort each (descending by score)
    const sortFn = (a, b) => b.score - a.score;
    leaderboard.allTime.sort(sortFn);
    leaderboard.daily.sort(sortFn);
    leaderboard.weekly.sort(sortFn);
    leaderboard.monthly.sort(sortFn);

    // Keep top 100
    if (leaderboard.allTime.length > 100) leaderboard.allTime.length = 100;
    if (leaderboard.daily.length > 100) leaderboard.daily.length = 100;
    if (leaderboard.weekly.length > 100) leaderboard.weekly.length = 100;
    if (leaderboard.monthly.length > 100) leaderboard.monthly.length = 100;
}

// Cleanup old leaderboard entries periodically
setInterval(() => {
    const now = Date.now();
    const dayMs = 86400000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    leaderboard.daily = leaderboard.daily.filter(e => now - new Date(e.date).getTime() < dayMs);
    leaderboard.weekly = leaderboard.weekly.filter(e => now - new Date(e.date).getTime() < weekMs);
    leaderboard.monthly = leaderboard.monthly.filter(e => now - new Date(e.date).getTime() < monthMs);
}, 60000); // Every minute

// ============================================
// REST API - Leaderboard
// ============================================
app.get("/api/leaderboard/:period", (req, res) => {
    const period = req.params.period;
    const data = leaderboard[period] || leaderboard.allTime;
    res.json({ period, entries: data.slice(0, 50) });
});

app.post("/api/leaderboard", (req, res) => {
    addScore(req.body);
    res.json({ success: true });
});

app.get("/api/online", (req, res) => {
    let totalPlayers = 0;
    for (const room of rooms.values()) totalPlayers += room.players.size;
    res.json({ online: totalPlayers, rooms: rooms.size });
});

// ============================================
// SOCKET.IO - Multiplayer
// ============================================
io.on("connection", (socket) => {
    console.log("[Server] Player connected:", socket.id);

    // Player joins game
    socket.on("join_game", (data) => {
        const roomId = findOrCreateRoom(socket);
        const room = rooms.get(roomId);

        const playerData = {
            id: socket.id,
            name: data.name || "Player_" + socket.id.substr(0, 4),
            heroId: data.heroId || "archer",
            x: data.x || 0,
            y: data.y || 0,
            health: data.health || 100,
            maxHealth: data.maxHealth || 100,
            level: 1,
            kills: 0,
            isAlive: true
        };

        room.players.set(socket.id, playerData);
        playerRooms.set(socket.id, roomId);
        socket.join(roomId);

        // Tell player their room info
        socket.emit("joined_room", {
            roomId,
            playerId: socket.id,
            players: Array.from(room.players.values())
        });

        // Tell others about new player
        socket.to(roomId).emit("player_joined", playerData);

        console.log(`[Server] ${playerData.name} joined ${roomId} (${room.players.size} players)`);
    });

    // Player position/state update (sent every frame)
    socket.on("update", (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        // Update stored state
        player.x = data.x;
        player.y = data.y;
        player.health = data.health;
        player.maxHealth = data.maxHealth;
        player.level = data.level || player.level;
        player.kills = data.kills || player.kills;
        player.isAlive = data.isAlive !== false;
        player.weaponId = data.weaponId;
        player.direction = data.direction;

        // Broadcast to others in room
        socket.to(roomId).volatile.emit("player_update", {
            id: socket.id,
            x: data.x,
            y: data.y,
            health: data.health,
            maxHealth: data.maxHealth,
            level: data.level,
            isAlive: data.isAlive,
            direction: data.direction,
            heroId: player.heroId
        });
    });

    // Player attacks another player
    socket.on("attack_player", (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        // Send damage to target
        io.to(data.targetId).emit("take_damage", {
            fromId: socket.id,
            damage: data.damage
        });
    });

    // Player died
    socket.on("player_died", (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        socket.to(roomId).emit("player_died", {
            id: socket.id,
            killedBy: data.killedBy || "enemies"
        });
    });

    // Player submits score
    socket.on("submit_score", (data) => {
        addScore(data);
        // Broadcast updated leaderboard to all
        io.emit("leaderboard_update", {
            daily: leaderboard.daily.slice(0, 10),
            weekly: leaderboard.weekly.slice(0, 10)
        });
    });

    // Chat/emote
    socket.on("emote", (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;
        socket.to(roomId).emit("player_emote", { id: socket.id, emote: data.emote });
    });

    // Disconnect
    socket.on("disconnect", () => {
        const roomId = playerRooms.get(socket.id);
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.players.delete(socket.id);
                socket.to(roomId).emit("player_left", { id: socket.id });

                // Clean empty rooms
                if (room.players.size === 0) {
                    rooms.delete(roomId);
                }
            }
            playerRooms.delete(socket.id);
        }
        console.log("[Server] Player disconnected:", socket.id);
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Server] Pixel Infinity running on port ${PORT}`);
    console.log(`[Server] Game: http://localhost:${PORT}`);
});

// ============================================
// PIXEL INFINITY - Multiplayer Server
// Express + Socket.IO + Leaderboard
// ============================================

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash, randomBytes } from "crypto";

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

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), users: users.size });
});

// ============================================
// AUTH SYSTEM (in-memory, persists until restart)
// ============================================
const users = new Map(); // username -> { username, passwordHash, salt, createdAt, stats }
const sessions = new Map(); // token -> { username, createdAt }

function hashPassword(password, salt) {
    return createHash("sha256").update(password + salt).digest("hex");
}

// Register
app.post("/api/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 2 || username.length > 16) return res.status(400).json({ error: "Username must be 2-16 characters" });
    if (password.length < 4) return res.status(400).json({ error: "Password must be 4+ characters" });
    if (users.has(username.toLowerCase())) return res.status(409).json({ error: "Username already taken" });

    const salt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    users.set(username.toLowerCase(), {
        username,
        passwordHash, salt,
        createdAt: Date.now(),
        stats: { totalKills: 0, totalGames: 0, bestKills: 0, bestLevel: 0, pvpKills: 0, totalPlayTime: 0 }
    });

    const token = randomBytes(32).toString("hex");
    sessions.set(token, { username, createdAt: Date.now() });

    console.log("[Auth] Registered:", username);
    res.json({ success: true, token, username });
});

// Login
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const user = users.get(username.toLowerCase());
    if (!user) return res.status(401).json({ error: "Account not found" });

    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return res.status(401).json({ error: "Wrong password" });

    const token = randomBytes(32).toString("hex");
    sessions.set(token, { username: user.username, createdAt: Date.now() });

    console.log("[Auth] Login:", user.username);
    res.json({ success: true, token, username: user.username });
});

// Get profile
app.get("/api/profile", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const session = sessions.get(token);
    if (!session) return res.status(401).json({ error: "Login required" });

    const user = users.get(session.username.toLowerCase());
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
        username: user.username,
        stats: user.stats,
        createdAt: user.createdAt
    });
});

// ============================================
// CHAT SYSTEM
// ============================================
const chatHistory = []; // [{ username, message, timestamp }]
const MAX_CHAT_HISTORY = 200;

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

// Get user stats by username
app.get("/api/stats/:username", (req, res) => {
    const user = users.get(req.params.username.toLowerCase());
    if (!user) return res.json({ stats: { totalKills: 0, totalGames: 0, bestKills: 0, bestLevel: 0, pvpKills: 0, totalPlayTime: 0 } });
    res.json({ username: user.username, stats: user.stats });
});

// Get rankings (all users sorted by totalKills)
app.get("/api/rankings", (req, res) => {
    const rankings = Array.from(users.values())
        .map(u => ({ username: u.username, ...u.stats }))
        .sort((a, b) => b.totalKills - a.totalKills)
        .slice(0, 50);
    res.json({ rankings });
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
        // Update user stats if logged in
        if (data.username) {
            const user = users.get(data.username.toLowerCase());
            if (user) {
                user.stats.totalKills += data.kills || 0;
                user.stats.totalGames++;
                user.stats.bestKills = Math.max(user.stats.bestKills, data.kills || 0);
                user.stats.bestLevel = Math.max(user.stats.bestLevel, data.level || 0);
                user.stats.pvpKills += data.pvpKills || 0;
                user.stats.totalPlayTime += data.time || 0;
            }
        }
        io.emit("leaderboard_update", {
            daily: leaderboard.daily.slice(0, 10),
            weekly: leaderboard.weekly.slice(0, 10)
        });
    });

    // Chat message (global lobby chat)
    socket.on("chat_message", (data) => {
        if (!data.message || !data.username) return;
        const msg = {
            username: data.username.substring(0, 16),
            message: data.message.substring(0, 200),
            timestamp: Date.now()
        };
        chatHistory.push(msg);
        if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();
        io.emit("chat_message", msg);
    });

    // Request chat history
    socket.on("chat_history", () => {
        socket.emit("chat_history", chatHistory.slice(-50));
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

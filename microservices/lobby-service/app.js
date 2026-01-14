const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lobby-db';

function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token' });

    const token = header.split(' ')[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
}

const app = express();
app.use(express.json());

/* ==============================
   MongoDB Connection
============================== */
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

/* ==============================
   Lobby Model
============================== */
const LobbySchema = new mongoose.Schema({
    sport: { type: String, required: true },
    location: { type: String, required: true },
    time: { type: Date, required: true },
    maxPlayers: { type: Number, required: true },
    players: [{ type: String }],
    status: { type: String, default: 'OPEN' }
});

const Lobby = mongoose.model('Lobby', LobbySchema);

/* ==============================
   Health Check
============================== */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'lobby-service',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

/* ==============================
   Routes - Lobby Service
============================== */

/**
 * POST /lobbies
 * Create a new lobby
 */
app.post('/lobbies', auth, async (req, res) => {
    try {
        const lobby = new Lobby({
            sport: req.body.sport,
            location: req.body.location,
            time: req.body.time,
            maxPlayers: req.body.maxPlayers,
            players: []
        });

        await lobby.save();
        res.status(201).json(lobby);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * GET /lobbies
 * List all open lobbies
 */
app.get('/lobbies', async (req, res) => {
    const lobbies = await Lobby.find({ status: 'OPEN' });
    res.json(lobbies);
});

/**
 * GET /lobbies/search
 * Search lobbies by sport or location
 */
app.get('/lobbies/search', async (req, res) => {
    const { sport, location } = req.query;

    const filter = {};
    if (sport) filter.sport = sport;
    if (location) filter.location = location;

    const lobbies = await Lobby.find(filter);
    res.json(lobbies);
});

/**
 * POST /lobbies/:id/join
 * Join a lobby
 */
app.post('/lobbies/:id/join', auth, async (req, res) => {
    try {
        const lobby = await Lobby.findById(req.params.id);

        if (!lobby)
            return res.status(404).json({ message: 'Lobby not found' });

        if (lobby.status === 'CLOSED')
            return res.status(400).json({ message: 'Lobby is closed' });

        if (lobby.players.length >= lobby.maxPlayers)
            return res.status(400).json({ message: 'Lobby is full' });

        lobby.players.push(req.body.player);

        if (lobby.players.length === lobby.maxPlayers)
            lobby.status = 'CLOSED';

        await lobby.save();
        res.json(lobby);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /lobbies/:id/leave
 * Leave a lobby
 */
app.post('/lobbies/:id/leave', auth, async (req, res) => {
    try {
        const lobby = await Lobby.findById(req.params.id);

        if (!lobby)
            return res.status(404).json({ message: 'Lobby not found' });

        lobby.players = lobby.players.filter(
            p => p !== req.body.player
        );

        lobby.status = 'OPEN';
        await lobby.save();

        res.json(lobby);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /lobbies/:id/close
 * Close a lobby manually
 */
app.post('/lobbies/:id/close', auth, async (req, res) => {
    const lobby = await Lobby.findById(req.params.id);
    lobby.status = 'CLOSED';
    await lobby.save();
    res.json(lobby);
});

/* ==============================
   Swagger
============================== */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

/* ==============================
   Server
============================== */
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lobby Service running on port ${PORT}`);
});
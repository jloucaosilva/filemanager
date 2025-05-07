console.log("version: 1.3.2");

const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const PORT = process.env.UPLOAD_PORT;
const UPLOAD_DIR = process.env.UPLOAD_DIR;
const BASE_PATH = '/filemanager';
const UPLOAD_LISTEN_ON = process.env.UPLOAD_LISTEN_ON;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend and static files
app.get(`${BASE_PATH}/`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));
app.use(BASE_PATH, express.static(UPLOAD_DIR));

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = req.body.destination || '';
        const safeDest = path.join(
            UPLOAD_DIR,
            path.normalize(dest).replace(/^(\.\.(\/|\\|$))+/, '')
        );
        fs.mkdirSync(safeDest, { recursive: true });
        cb(null, safeDest);
    },
    filename: (req, file, cb) => {
        const dest = req.body.destination || '';
        const safeDest = path.join(
            UPLOAD_DIR,
            path.normalize(dest).replace(/^(\.\.(\/|\\|$))+/, '')
        );

        const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
        let filename = original;
        let counter = 1;

        while (fs.existsSync(path.join(safeDest, filename))) {
            const ext = path.extname(original);
            const base = path.basename(original, ext);
            filename = `${base} (${counter})${ext}`;
            counter++;
        }

        cb(null, filename);
    }
});
const upload = multer({ storage });

// Upload endpoint
app.post(`${BASE_PATH}/upload`, upload.array('files'), (req, res) => {
    console.log('[upload] Received:', req.files.map(f => f.originalname));
    res.send('Files uploaded successfully');
});

// Download endpoint
app.get(`${BASE_PATH}/download`, (req, res) => {
    const relPath = req.query.path;
    if (!relPath) return res.status(400).send('Missing path');

    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(UPLOAD_DIR, safePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        res.download(fullPath);
    } else {
        res.status(404).send('File not found');
    }
});

// Tree view endpoint (files before folders)
app.get(`${BASE_PATH}/tree`, (_, res) => {
    function buildTree(dir, base = '') {
        const items = fs.readdirSync(dir).filter(f => !f.startsWith('.'));

        const files = [];
        const folders = [];

        for (const name of items) {
            const fullPath = path.join(dir, name);
            const relPath = path.join(base, name);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                folders.push({
                    name,
                    type: 'folder',
                    children: buildTree(fullPath, relPath)
                });
            } else {
                files.push({
                    name,
                    path: relPath.replace(/\\/g, '/'),
                    type: 'file',
                    size: Math.round(stats.size / 1024),
                    modified: stats.mtime
                });
            }
        }

        return [...files, ...folders]; // Show files first
    }

    res.json({
        name: 'root',
        type: 'folder',
        children: buildTree(UPLOAD_DIR)
    });
});

// WebSocket server
const wss = new WebSocketServer({ server });
const sockets = new Set();

wss.on('connection', (ws) => {
    sockets.add(ws);
    ws.on('close', () => sockets.delete(ws));
});

function broadcastRefresh() {
    for (const ws of sockets) {
        if (ws.readyState === ws.OPEN) {
            ws.send('refresh');
        }
    }
}

// Watch for changes in UPLOAD_DIR
chokidar.watch(UPLOAD_DIR, { ignoreInitial: true, depth: 5 })
    .on('add', broadcastRefresh)
    .on('unlink', broadcastRefresh)
    .on('addDir', broadcastRefresh)
    .on('unlinkDir', broadcastRefresh)
    .on('change', broadcastRefresh);

// Start server with WS support
server.listen(PORT, UPLOAD_LISTEN_ON, () => {
    console.log(`Server running on http://localhost:${PORT}${BASE_PATH}/`);
});

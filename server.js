// Simple chat server
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const multer = require("multer")
const cloudinary = require("cloudinary").v2

// Configure Cloudinary
cloudinary.config({
    cloud_name: "YOUR_CLOUD_NAME",
    api_key: "YOUR_API_KEY",
    api_secret: "YOUR_API_SECRET"
})

const upload = multer({ dest: "uploads/" })
const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Serve frontend files
app.use(express.static("public"))

// Keep track of rooms and connected users
let rooms = {}

// Handle media uploads to Cloudinary
app.post("/upload", upload.single("file"), async (req, res) => {
    const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "auto" })
    res.json({ url: result.secure_url })
})

// Handle WebSocket connections
io.on("connection", socket => {
    
    // Join a room
    socket.on("join", room => {
        if (!rooms[room]) rooms[room] = []
        
        // Limit room to 2 users
        if (rooms[room].length >= 2) {
            socket.emit("roomFull")
            return
        }
        
        rooms[room].push(socket.id)
        socket.join(room)
        
        // Notify room about online users
        io.to(room).emit("online", rooms[room].length)
    })
    
    // Relay chat messages
    socket.on("message", data => {
        socket.to(data.room).emit("message", data)
    })
    
    // Relay typing indicator
    socket.on("typing", room => {
        socket.to(room).emit("typing")
    })
    
    // Handle disconnections
    socket.on("disconnect", () => {
        for (let room in rooms) {
            rooms[room] = rooms[room].filter(id => id !== socket.id)
            if (rooms[room].length === 0) delete rooms[room]
            io.to(room).emit("online", rooms[room] ? rooms[room].length : 0)
        }
    })
})

server.listen(3000, () => console.log("Chat server running on port 3000"))

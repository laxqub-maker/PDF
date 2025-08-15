 // server.js

// Import necessary libraries
const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Initialize the Express app
const app = express();
const port = 3000;

// Enable CORS to allow requests from your frontend
app.use(cors());

// Set up storage for uploaded files using multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create an 'uploads' directory if it doesn't exist
        const uploadPath = path.join(__dirname, 'uploads');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Use a unique filename to avoid conflicts
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Define the compression endpoint
app.post('/compress', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, 'uploads', `compressed-${req.file.filename}`);
    const compressionLevel = req.body.level || 'recommended';

    // GhostScript settings based on the selected level
    let gsSettings = '';
    switch (compressionLevel) {
        case 'extreme':
            gsSettings = '-dPDFSETTINGS=/screen'; // Lowest quality, highest compression
            break;
        case 'less':
            gsSettings = '-dPDFSETTINGS=/prepress'; // Highest quality, less compression
            break;
        case 'recommended':
        default:
            gsSettings = '-dPDFSETTINGS=/ebook'; // Good balance
            break;
    }

    // The GhostScript command
    // IMPORTANT: 'gs' must be in your system's PATH or you must provide the full path to the executable.
    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 ${gsSettings} -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

    exec(command, (error, stdout, stderr) => {
        // Clean up the original uploaded file
        fs.unlinkSync(inputPath);

        if (error) {
            console.error(`GhostScript Error: ${stderr}`);
            return res.status(500).send('Error during PDF compression.');
        }

        // Send the compressed file back for download
        res.download(outputPath, (err) => {
            if (err) {
                console.error('Download Error:', err);
            }
            // Clean up the compressed file after it's sent
            fs.unlinkSync(outputPath);
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`PDF Compression server listening at http://localhost:${port}`);
});
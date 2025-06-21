const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); 
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });

const upload = multer({ dest: 'uploads/' });

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Gemini API server is running at http://localhost:${PORT}`);
});

app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: 'Error generating text', details: error.message });
    }
});

// Fungsi bantu untuk ubah gambar jadi format yang bisa diproses Gemini
function imageToGenerativePart(imagePath, mimeType = 'image/png') {
    const imageData = fs.readFileSync(imagePath).toString('base64');
    return {
        inlineData: {
            data: imageData,
            mimeType,
        },
    };
}

// Endpoint upload image
app.post('/upload-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Describe the image';
    const image = imageToGenerativePart(req.file.path);

    try {
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: 'Error generating text from image', details: error.message });
    } finally {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Gagal hapus file:', err);
        });
    }
});
       
// Endpoint 3 : /generate-from-document
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    try {
        let content = '';

        if (fileExt === '.txt') {
            content = fs.readFileSync(filePath, 'utf8');
        } else if (fileExt === '.pdf') {
            // Gunakan library pdf-parse untuk baca PDF
            const pdfParse = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            content = pdfData.text;
        } else {
            return res.status(400).json({ error: 'Unsupported file format. Use .txt or .pdf' });
        }

        const result = await model.generateContent(content);
        const response = await result.response;
        res.json({ output: response.text() });

    } catch (error) {
        res.status(500).json({ error: 'Error generating from document', details: error.message });
    } finally {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Gagal hapus file:', err);
        });
    }
});

// Endpoint 4 : /generate-from-audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: {
            data: base64Audio,
            mimeType: req.file.mimetype
        }
    };

    try {
        const result = await model.generateContent([
            'Transcribe or analyze the following audio:', audioPart
        ]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

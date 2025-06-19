// /reb-backend/src/index.js

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({
  origin: 'https://oblic.onrender.com'
}));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

// Підключення до MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Схеми MongoDB
const DocumentSchema = new mongoose.Schema({
  number: String,
  date: String,
  docFile: String,
  scanFile: String
}, { _id: false });

const AssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  serial: String,
  nomenclature: String,
  unit: String,
  location: String,
  photo: String,
  documents: [DocumentSchema]
}, { timestamps: true });

const Asset = mongoose.model('Asset', AssetSchema);

// Роути
app.post('/assets', upload.single('photo'), async (req, res) => {
  try {
    const { name, serial, nomenclature, unit, location } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    const asset = new Asset({ name, serial, nomenclature, unit, location, photo, documents: [] });
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create asset', details: err.message });
  }
});

app.post('/assets/:id/documents', upload.fields([
  { name: 'docFile' }, { name: 'scanFile' }
]), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const { number, date } = req.body;
    const doc = {
      number,
      date,
      docFile: req.files['docFile'] ? `/uploads/${req.files['docFile'][0].filename}` : null,
      scanFile: req.files['scanFile'] ? `/uploads/${req.files['scanFile'][0].filename}` : null
    };

    asset.documents.push(doc);
    await asset.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add document', details: err.message });
  }
});

app.get('/assets', async (req, res) => {
  try {
    const assets = await Asset.find();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

app.get('/assets/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset', details: err.message });
  }
});

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

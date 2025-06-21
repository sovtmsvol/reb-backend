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

console.log("🔍 Починаємо запуск...");

const app = express();

// Дозвіл CORS для фронтенду на Render
app.use(cors({
  origin: 'https://oblic.onrender.com'
}));

app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

console.log("🔍 Значення PORT:", PORT);

// Підключення до MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

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
app.post('/assets', upload.none(), async (req, res) => {
  try {
    console.log("📥 POST /assets", req.body);
    const { name, serial, nomenclature, unit, location } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Поле "name" є обов’язковим' });
    }

    const asset = new Asset({ name, serial, nomenclature, unit, location, photo: null, documents: [] });
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    console.error("❌ Error creating asset:", err.name, err.message, err.errors);
    res.status(500).json({ error: 'Failed to create asset', details: err.message });
  }
});

app.post('/assets/:id/documents', upload.fields([
  { name: 'docFile' }, { name: 'scanFile' }
]), async (req, res) => {
  try {
    console.log("📥 POST /assets/:id/documents", req.body);
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
    console.error("❌ Error adding document:", err);
    res.status(500).json({ error: 'Failed to add document', details: err.message });
  }
});

app.get('/assets', async (req, res) => {
  try {
    console.log("📥 GET /assets");
    const assets = await Asset.find();
    res.json(assets);
  } catch (err) {
    console.error("❌ Error fetching assets:", err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

app.get('/assets/:id', async (req, res) => {
  try {
    console.log(`📥 GET /assets/${req.params.id}`);
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    console.error("❌ Error fetching asset:", err);
    res.status(500).json({ error: 'Failed to fetch asset', details: err.message });
  }
});

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on port ${PORT}`));

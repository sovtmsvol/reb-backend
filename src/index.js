// /reb-backend/src/index.js

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

let assets = [];

app.post('/assets', upload.single('photo'), (req, res) => {
  const { name, serial, nomenclature, unit, location } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;
  const asset = { id: Date.now(), name, serial, nomenclature, unit, location, photo, documents: [] };
  assets.push(asset);
  res.json(asset);
});

app.post('/assets/:id/documents', upload.fields([
  { name: 'docFile' }, { name: 'scanFile' }
]), (req, res) => {
  const asset = assets.find(a => a.id === +req.params.id);
  if (!asset) return res.sendStatus(404);

  const { number, date } = req.body;
  const doc = {
    number, date,
    docFile: req.files['docFile'] ? `/uploads/${req.files['docFile'][0].filename}` : null,
    scanFile: req.files['scanFile'] ? `/uploads/${req.files['scanFile'][0].filename}` : null
  };
  asset.documents.push(doc);
  res.json(doc);
});

app.get('/assets', (req, res) => res.json(assets));
app.get('/assets/:id', (req, res) => {
  const asset = assets.find(a => a.id === +req.params.id);
  if (!asset) return res.sendStatus(404);
  res.json(asset);
});

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
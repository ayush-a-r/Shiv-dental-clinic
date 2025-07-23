const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Patient } = require('./models');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- MongoDB connection ---
mongoose.connect(
  process.env.MONGODB_URI
);

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});
mongoose.connection.once('open', () => {
  console.log('MongoDB connected!');
});

// --- Helper: Calculate age from dob ---
function calculateAge(dob) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

// --- All your API endpoints below (NO CHANGES NEEDED) ---

app.post('/api/patient/new', async (req, res) => {
  try {
    const { name, phone, dob, address, gender, medicalHistory } = req.body;
    const age = calculateAge(dob);
    const patient = new Patient({
      name, phone, dob, age, address, gender, medicalHistory, prescriptions: []
    });
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get('/api/patients/by-phone', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone required.' });
  const patients = await Patient.find({ phone: { $regex: `^${phone}`, $options: 'i' } });
  if (!patients.length) return res.status(404).json({ error: 'No patients found.' });
  res.json(patients);
});
app.post('/api/patient/:id/prescribe', async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, treatment, medicines, notes } = req.body;
    const patient = await Patient.findById(id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const prescription = { diagnosis, treatment, medicines, notes, date: new Date(), pdfPath: null };
    patient.prescriptions.push(prescription);
    await patient.save();
    res.json(patient.prescriptions[patient.prescriptions.length - 1]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get('/api/patient/:id/prescriptions', async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient.prescriptions.map((p, idx) => ({
    idx,
    date: p.date,
    diagnosis: p.diagnosis,
    treatment: p.treatment,
    medicines: p.medicines,
    notes: p.notes,
    pdfPath: p.pdfPath
  })));
});
app.get('/api/patient/:id/prescription/:pid', async (req, res) => {
  const { id, pid } = req.params;
  const patient = await Patient.findById(id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const prescription = patient.prescriptions[parseInt(pid)];
  if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
  res.json({ 
    date: prescription.date,
    diagnosis: prescription.diagnosis,
    treatment: prescription.treatment,
    medicines: prescription.medicines,
    notes: prescription.notes,
    pdfPath: prescription.pdfPath,
    patient: {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      address: patient.address
    }
  });
});
app.post('/api/patient/:id/prescription/:pid/generate-pdf', async (req, res) => {
  const { id, pid } = req.params;
  const patient = await Patient.findById(id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const prescription = patient.prescriptions[parseInt(pid)];
  if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

  // Only generate if not already existing
  if (prescription.pdfPath) {
    return res.json({ pdfPath: prescription.pdfPath });
  }

  // Create PDF
  const doc = new PDFDocument();
  const pdfName = `prescription_${Date.now()}.pdf`;
  const pdfPath = path.join(__dirname, '../uploads/', pdfName);
  const writeStream = fs.createWriteStream(pdfPath);

  doc.pipe(writeStream);
  doc.fontSize(18).text('SHIV DENTAL CLINIC', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Patient: ${patient.name}`);
  doc.text(`Age: ${patient.age}`);
  doc.text(`Gender: ${patient.gender || ''}`);
  doc.text(`Address: ${patient.address || ''}`);
  doc.text(`Date: ${(new Date(prescription.date)).toLocaleDateString()}`);
  doc.moveDown();
  doc.fontSize(12).text(`Diagnosis: ${prescription.diagnosis}`);
  doc.text(`Treatment: ${prescription.treatment}`);
  doc.moveDown();
  doc.font('Helvetica-Bold').text('Medicines List:');
  (prescription.medicines || []).forEach((m, i) => {
    doc.font('Helvetica').text(`${i+1}. ${m.name} - ${m.dose || ''} - ${m.frequency || ''} - ${m.duration || ''} - ${m.instructions || ''}`);
  });
  doc.moveDown();
  doc.text(`Notes: ${prescription.notes || ''}`);
  doc.end();

  writeStream.on('finish', async () => {
    prescription.pdfPath = `/uploads/${pdfName}`;
    await patient.save();
    res.json({ pdfPath: prescription.pdfPath });
  });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});

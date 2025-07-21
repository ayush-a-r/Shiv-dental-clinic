const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: String,
  dose: String,
  frequency: String,
  duration: String,
  instructions: String,
}, { _id: false });

const PrescriptionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  diagnosis: String,
  treatment: String,
  medicines: [MedicineSchema],
  notes: String,
  pdfPath: String, // can be null until generated
});

const PatientSchema = new mongoose.Schema({
  name: String,
  phone: String,
  dob: Date,
  age: Number, // calculated from dob
  address: String,
  gender: String,
  medicalHistory: String,
  prescriptions: [PrescriptionSchema],
});

const Patient = mongoose.model('Patient', PatientSchema);

module.exports = { Patient };

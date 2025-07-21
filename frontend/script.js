// Utility
const API = 'http://localhost:5000';

// ======= Doctor Portal Logic =======
if (location.pathname.endsWith('doctor.html')) {
  // Add New Patient
  document.getElementById('new-patient-form').onsubmit = async function(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(this));
    if (!values.dob) { alert("DOB required"); return; }
    const res = await fetch(`${API}/api/patient/new`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(values)
    });
    alert(res.ok ? 'Patient added!' : 'Error');
    this.reset();
  };

  // Dynamic Medicines List for Prescription
  const medicineListDiv = document.getElementById('medicine-list');
  const addMedicineBtn = document.getElementById('add-medicine-btn');
  let medicineFields = [];

  function renderMedicineFields() {
    medicineListDiv.innerHTML = '<label>Medicines:</label><br>';
    medicineFields.forEach((_, i) => {
      medicineListDiv.innerHTML += `
        <div class="medicine-item">
          <input name="med_name_${i}" placeholder="Medicine Name" required>
          <input name="med_dose_${i}" placeholder="Dose">
          <input name="med_freq_${i}" placeholder="Frequency">
          <input name="med_duration_${i}" placeholder="Duration">
          <input name="med_inst_${i}" placeholder="Instructions">
          <button type="button" onclick="removeMedicine(${i})">Remove</button>
        </div>
      `;
    });
  }
  // start with one field
  medicineFields = [{}];
  renderMedicineFields();
  window.removeMedicine = (i) => {
    medicineFields.splice(i,1);
    renderMedicineFields();
  };
  addMedicineBtn.onclick = function() {
    medicineFields.push({});
    renderMedicineFields();
  };

  // Search Existing Patients by Phone and Select
  const searchForm = document.getElementById('search-patient-form');
  const searchResultsDiv = document.getElementById('patient-search-results');
  const prescriptionForm = document.getElementById('add-prescription-form');
  const prescriptionResultDiv = document.getElementById('prescription-result');
  let selectedPatientId = '';
  searchForm.onsubmit = async function(e) {
    e.preventDefault();
    searchResultsDiv.textContent = 'Searching...';
    prescriptionForm.style.display = 'none';
    prescriptionResultDiv.textContent = '';
    const phone = this.phone.value;
    const res = await fetch(`${API}/api/patients/by-phone?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) { searchResultsDiv.textContent = 'No patients found for this phone number.'; return; }
    const patients = await res.json();
    let html = '<ul>';
    patients.forEach(p=>{
      html += `<li>
        <button type="button" onclick="selectPatient('${p._id}','${p.name}','${p.age||''}','${p.address||''}','${p.gender||''}','${p.medicalHistory||''}')">Select</button>
        Name: ${p.name}, Age: ${p.age||""}, Gender: ${p.gender||""}, Address: ${p.address||""}
      </li>`;
    });
    html += '</ul>';
    searchResultsDiv.innerHTML = html;
    window.selectPatient = function(id, name, age, address, gender, medhist) {
      selectedPatientId = id;
      prescriptionForm.patientId.value = id;
      prescriptionForm.reset();
      medicineFields = [{}]; renderMedicineFields();
      prescriptionForm.style.display = '';
      searchResultsDiv.innerHTML = `<b>Selected Patient:</b> ${name}, Age: ${age}, Gender: ${gender}, Address: ${address}`;
      prescriptionResultDiv.textContent = '';
    };
  };

  // Add Prescription with Medicines
  prescriptionForm.onsubmit = async function(e) {
    e.preventDefault();
    const patientId = this.patientId.value;
    const diagnosis = this.diagnosis.value;
    const treatment = this.treatment.value;
    const notes = this.notes.value;
    // Collect medicines
    let medicines = [];
    prescriptionForm.querySelectorAll('.medicine-item').forEach((div,i)=>{
      const med = {
        name: div.querySelector(`[name=med_name_${i}]`).value,
        dose: div.querySelector(`[name=med_dose_${i}]`).value,
        frequency: div.querySelector(`[name=med_freq_${i}]`).value,
        duration: div.querySelector(`[name=med_duration_${i}]`).value,
        instructions: div.querySelector(`[name=med_inst_${i}]`).value,
      };
      medicines.push(med);
    });
    const body = { diagnosis, treatment, medicines, notes };
    const res = await fetch(`${API}/api/patient/${patientId}/prescribe`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body),
    });
    if (res.ok) {
      prescriptionResultDiv.innerHTML = `Prescription added!`;
    } else {
      prescriptionResultDiv.textContent = 'Error adding prescription.';
    }
    prescriptionForm.reset();
    prescriptionForm.style.display = 'none';
    searchResultsDiv.innerHTML = '';
  };
}

// ======= Patient Portal Logic =======
if (location.pathname.endsWith('patient.html')) {
  const patientsListDiv = document.getElementById('patients-list');
  const prescriptionsListDiv = document.getElementById('prescriptions-list');
  const prescriptionDetailsDiv = document.getElementById('prescription-details');
  let foundPatients = [], selectedPatientId = null, prescriptions = [];

  document.getElementById('patient-search-form').onsubmit = async function(e) {
    e.preventDefault();
    const phone = this.phone.value;
    prescriptionsListDiv.innerHTML = '';
    prescriptionDetailsDiv.innerHTML = '';
    patientsListDiv.textContent = 'Searching...';
    const res = await fetch(`${API}/api/patients/by-phone?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) { patientsListDiv.textContent = 'No patients found for this phone.'; return; }
    foundPatients = await res.json();
    let html = '<b>Select Your Name:</b><ul>';
    foundPatients.forEach((p,i)=>{
      html += `<li><button type="button" onclick="selectSelf(${i})">Select</button> ${p.name}, Age: ${p.age||""}, Gender: ${p.gender||""}</li>`;
    });
    html += '</ul>';
    patientsListDiv.innerHTML = html;
    window.selectSelf = function(i) {
      selectedPatientId = foundPatients[i]._id;
      loadPrescriptions(selectedPatientId);
      patientsListDiv.innerHTML = `<b>Selected: ${foundPatients[i].name}</b>`;
    };
  };

  async function loadPrescriptions(pid) {
    prescriptionsListDiv.textContent = 'Loading prescriptions...';
    const res = await fetch(`${API}/api/patient/${pid}/prescriptions`);
    if (!res.ok) { prescriptionsListDiv.textContent = 'No prescriptions found.'; return; }
    prescriptions = await res.json();
    if (prescriptions.length === 0) {
      prescriptionsListDiv.textContent = 'No prescriptions found.';
      return;
    }
    let html = '<b>Select Prescription by Date:</b><table><tr><th>Date</th><th>View</th></tr>';
    prescriptions.forEach((p, i) => {
      html += `<tr>
        <td>${new Date(p.date).toLocaleDateString()}</td>
        <td><button type="button" onclick="viewPrescription(${i})">View</button></td>
      </tr>`;
    });
    html += '</table>';
    prescriptionsListDiv.innerHTML = html;
    prescriptionDetailsDiv.innerHTML = '';
    window.viewPrescription = function(i) { showPrescriptionDetail(i); };
  }

  async function showPrescriptionDetail(idx) {
    const res = await fetch(`${API}/api/patient/${selectedPatientId}/prescription/${idx}`);
    if (!res.ok) { prescriptionDetailsDiv.textContent = 'Error loading prescription.'; return; }
    const p = await res.json();
    let html = `<div>
      <b>Date:</b> ${new Date(p.date).toLocaleDateString()}<br>
      <b>Diagnosis:</b> ${p.diagnosis}<br>
      <b>Treatment:</b> ${p.treatment}<br>
      <b>Medicines:</b><ul>`;
    p.medicines.forEach(m => {
      html += `<li>${m.name || '-'} ${m.dose ? '('+m.dose+')' : ''} ${m.frequency || ''} ${m.duration || ''} ${m.instructions || ''}</li>`;
    });
    html += `</ul><b>Notes:</b> ${p.notes||""}<br>`;
    if (p.pdfPath) {
      html += `<a href="${API}${p.pdfPath}" target="_blank">Download PDF</a>`;
    } else {
      html += `<button type="button" onclick="genPDF(${idx})">Generate PDF</button>`;
    }
    html += `</div>`;
    prescriptionDetailsDiv.innerHTML = html;
    window.genPDF = async function(idx2) {
      const resp = await fetch(`${API}/api/patient/${selectedPatientId}/prescription/${idx2}/generate-pdf`, { method: "POST"});
      if (resp.ok) {
        const dat = await resp.json();
        prescriptionDetailsDiv.innerHTML += `<br><a href="${API}${dat.pdfPath}" target="_blank">Download PDF</a>`;
      } else {
        prescriptionDetailsDiv.innerHTML += "<br>Failed to generate PDF.";
      }
    };
  }
}

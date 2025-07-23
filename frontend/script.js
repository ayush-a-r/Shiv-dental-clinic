const API = "https://shiv-dental-clinic-backend.onrender.com"; // Your deployed backend URL

let medicineFields = [];

document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;

  if (path === "/doctor.html") {
    const form = document.querySelector("form");
    const addMedicineBtn = document.getElementById("addMedicineBtn");
    const medicineListDiv = document.getElementById("medicineList");

    addMedicineBtn.addEventListener("click", () => {
      medicineFields.push({ name: "", timing: "morning", duration: "" });
      renderMedicineFields();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const values = {
        name: form.name.value.trim(),
        dob: form.dob.value,
        phone: form.phone.value.trim(),
        medicines: medicineFields
      };

      if (!values.name || !values.dob || !values.phone) {
        alert("Please fill all required fields!");
        return;
      }

      try {
        const res = await fetch(`${API}/api/prescriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        });

        if (!res.ok) throw new Error("Failed to save prescription");
        alert("Prescription saved successfully");
        location.reload();
      } catch (err) {
        alert("Error: " + err.message);
      }
    });

    function renderMedicineFields() {
      medicineListDiv.innerHTML = "";

      medicineFields.forEach((field, i) => {
        const div = document.createElement("div");
        div.innerHTML = `
          <input type="text" placeholder="Medicine Name" value="${field.name}" class="name" />
          <select class="timing">
            <option value="morning" ${field.timing === "morning" ? "selected" : ""}>Morning</option>
            <option value="afternoon" ${field.timing === "afternoon" ? "selected" : ""}>Afternoon</option>
            <option value="night" ${field.timing === "night" ? "selected" : ""}>Night</option>
          </select>
          <input type="text" placeholder="Duration (e.g. 5 days)" value="${field.duration}" class="duration" />
          <button type="button" class="remove-btn">Remove</button>
        `;
        medicineListDiv.appendChild(div);
      });

      // Attach event handlers after DOM update
      medicineListDiv.querySelectorAll(".remove-btn").forEach((btn, i) => {
        btn.onclick = () => {
          medicineFields.splice(i, 1);
          renderMedicineFields();
        };
      });

      medicineListDiv.querySelectorAll(".name").forEach((input, i) => {
        input.oninput = (e) => {
          medicineFields[i].name = e.target.value;
        };
      });

      medicineListDiv.querySelectorAll(".timing").forEach((select, i) => {
        select.onchange = (e) => {
          medicineFields[i].timing = e.target.value;
        };
      });

      medicineListDiv.querySelectorAll(".duration").forEach((input, i) => {
        input.oninput = (e) => {
          medicineFields[i].duration = e.target.value;
        };
      });
    }

  } else if (path === "/patient.html") {
    const phoneInput = document.getElementById("phone");
    const searchBtn = document.getElementById("searchBtn");
    const searchResultsDiv = document.getElementById("searchResults");
    const prescriptionDetailsDiv = document.getElementById("prescriptionDetails");

    searchBtn.addEventListener("click", async () => {
      const phone = phoneInput.value.trim();
      if (!phone) return alert("Enter a phone number");

      searchResultsDiv.textContent = "Searching...";

      try {
        const patients = await apiFetch(`/api/patients/by-phone?phone=${phone}`);
        renderPatientList(patients);
      } catch (e) {
        searchResultsDiv.textContent = "Error fetching patients.";
      }
    });

    function renderPatientList(patients) {
      searchResultsDiv.innerHTML = "";
      prescriptionDetailsDiv.innerHTML = "";

      if (patients.length === 0) {
        searchResultsDiv.textContent = "No patients found.";
        return;
      }

      patients.forEach((p) => {
        const div = document.createElement("div");
        div.innerHTML = `
          <p><strong>${p.name}</strong> (DOB: ${new Date(p.dob).toLocaleDateString()})</p>
          <button onclick="selectPatient('${p._id}')">View Prescriptions</button>
        `;
        searchResultsDiv.appendChild(div);
      });
    }

    window.selectPatient = async (patientId) => {
      try {
        const prescriptions = await apiFetch(`/api/prescriptions/by-patient/${patientId}`);
        renderPrescriptions(prescriptions);
      } catch (e) {
        prescriptionDetailsDiv.textContent = "Failed to load prescriptions.";
      }
    };

    function renderPrescriptions(prescriptions) {
      prescriptionDetailsDiv.innerHTML = "";

      if (prescriptions.length === 0) {
        prescriptionDetailsDiv.textContent = "No prescriptions found.";
        return;
      }

      prescriptions.forEach((prescription, index) => {
        const div = document.createElement("div");
        div.className = "prescription";
        div.innerHTML = `
          <h3>Prescription ${index + 1}</h3>
          <p>Date: ${new Date(prescription.createdAt).toLocaleString()}</p>
          <ul>
            ${prescription.medicines.map(med => `<li>${med.name} - ${med.timing} - ${med.duration}</li>`).join("")}
          </ul>
          <button onclick="viewPrescription(${index})">Download PDF</button>
        `;
        prescriptionDetailsDiv.appendChild(div);
      });

      prescriptionDetailsDiv.scrollIntoView({ behavior: "smooth" });
    }

    window.viewPrescription = (index) => {
      const prescriptionDivs = document.querySelectorAll(".prescription");
      const targetDiv = prescriptionDivs[index];

      const doc = new window.jspdf.jsPDF();
      doc.text("Shiv Dental Clinic", 20, 20);
      doc.text("Prescription", 20, 30);

      let y = 40;
      const lines = targetDiv.querySelectorAll("li");
      lines.forEach((li) => {
        doc.text(li.textContent, 20, y);
        y += 10;
      });

      doc.save("prescription.pdf");
    };
  }
});

// Centralized fetch function
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

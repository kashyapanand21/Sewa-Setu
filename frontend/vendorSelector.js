import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function loadVendorsToDropdown(dropdownId) {
  const dd = document.getElementById(dropdownId);
  if (!dd) throw new Error("Dropdown element missing ❌");

  const q = query(collection(window.firestoreDB, "vendors"), orderBy("createdAt","desc"));
  onSnapshot(q, (snap) => {
    dd.innerHTML = `<option value="">Select Vendor</option>`;
    snap.forEach(d => {
      const v = d.data();
      dd.innerHTML += `<option value="${d.id}">${v.name} (${v.category})</option>`;
    });
  });
}

export function listenVendors(renderCallback) {
  const q = query(collection(window.firestoreDB, "vendors"), orderBy("createdAt","desc"));
  onSnapshot(q, (snap) => {
    const vendors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCallback(vendors);
  });
}

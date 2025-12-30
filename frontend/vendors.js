import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Add vendor to Firestore
export async function addVendor(name, category, location, phone, shopTimings) {
  if (!window.auth || !window.firestoreDB) {
    alert("Firebase not initialized ❌");
    throw new Error("Firebase services missing");
  }

  const vendorData = {
    name,
    category,
    location, // address or "lat,lng"
    phone,
    shopTimings,
    createdBy: window.currentUser?.uid || null,
    createdAt: new Date()
  };

  const ref = await addDoc(collection(window.firestoreDB, "vendors"), vendorData);
  console.log("Vendor added ✔ ID:", ref.id);
  alert("Vendor added ✔");
  return ref.id;
}

// Listen vendors in real-time and render via callback
export function listenVendors(renderCallback) {
  const q = query(collection(window.firestoreDB, "vendors"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const vendors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCallback(vendors);
  });
}

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Create a laundry slot at a vendor
export async function createLaundrySlot(vendorId, timeSlot) {
  const user = window.currentUser;
  if (!user) {
    alert("Login required ❌");
    throw new Error("Not authenticated");
  }
  if (!vendorId || !timeSlot) {
    alert("Invalid slot input ❌");
    throw new Error("Vendor or timeSlot missing");
  }

  const slotData = {
    vendorId,
    timeSlot,             // e.g., "2025-12-28 10:00–12:00"
    booked: false,
    createdBy: user.uid,
    createdAt: new Date(),
    participants: [user.uid]
  };

  const ref = await addDoc(collection(window.firestoreDB, "laundrySlots"), slotData);
  console.log("Laundry slot created ✔ ID:", ref.id);
  alert("Laundry slot created ✔");
  return ref.id;
}

// Book a laundry slot (atomic, prevents double booking)
export async function bookLaundrySlot(slotId) {
  const user = window.currentUser;
  if (!user) {
    alert("Login required ❌");
    throw new Error("Not authenticated");
  }
  if (!slotId) {
    alert("Slot ID missing ❌");
    throw new Error("slotId missing");
  }

  const slotRef = doc(window.firestoreDB, "laundrySlots", slotId);
  const snap = await getDoc(slotRef);
  if (!snap.exists()) {
    alert("Slot not found ❌");
    throw new Error("Slot does not exist");
  }

  const data = snap.data();
  if (data.booked === true || data.status === "completed") {
    alert("Already booked ❌");
    throw new Error("Slot already booked");
  }

  await updateDoc(slotRef, {
    booked: true,
    participants: arrayUnion(user.uid),
    participantsCount: increment(1)
  });

  console.log("Laundry slot booked ✔", slotId);
  alert("Laundry slot booked ✔");
}

// Stream laundry slots live to UI
export function listenLaundrySlots(renderCallback) {
  const q = query(
    collection(window.firestoreDB, "laundrySlots"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    const slots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCallback(slots);
  });
}

// Expose join/slot actions globally for UI or console testing
window.createLaundrySlot = async (vendorId, timeSlot) => {
  try { await createLaundrySlot(vendorId, timeSlot); }
  catch(e) { console.error(e); }
};

window.bookLaundrySlot = async (slotId) => {
  try { await bookLaundrySlot(slotId); }
  catch(e) { console.error(e); }
};

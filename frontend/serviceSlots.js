import { db, increment, arrayUnion, onSnapshot, collection, addDoc, updateDoc, getDoc, doc, query, orderBy, runTransaction } from "./firebase.js";

const SLOT_COL = "serviceSlots";

export async function createSlot(vendorId, serviceType, timeSlot, minParticipants, deadline) {
  try {
    const slot = {
      vendorId,
      serviceType,
      timeSlot,
      minParticipants,
      participants: 0,
      studentUIDs: [],
      status: "open",
      createdAt: new Date(),
      deadline
    };
    const ref = await addDoc(collection(db, SLOT_COL), slot);
    console.log("Slot created ✔ ID:", ref.id);
    return ref.id;
  } catch (e) {
    console.error("Slot creation failed ❌", e);
    return null;
  }
}

export async function bookSlot(slotId, studentUID) {
  try {
    const slotRef = doc(db, SLOT_COL, slotId);
    
    // Use transaction for atomic booking
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(slotRef);
      
      if (!snap.exists()) {
        throw new Error("Slot not found");
      }
      
      const data = snap.data();
      
      // Check if slot is available
      if (data.status === "expired" || data.status === "completed") {
        throw new Error(`Slot is ${data.status}`);
      }
      
      // Check for duplicate booking
      if (data.studentUIDs.includes(studentUID)) {
        throw new Error("Duplicate booking blocked");
      }
      
      // Calculate new participant count atomically
      const newParticipantCount = data.participants + 1;
      const newStatus = newParticipantCount >= data.minParticipants ? "threshold_reached" : "open";
      
      // Atomic update
      transaction.update(slotRef, {
        participants: newParticipantCount,
        studentUIDs: arrayUnion(studentUID),
        status: newStatus
      });
    });
    
    console.log("Slot booked ✔ ID:", slotId, "by UID:", studentUID);
    return true;
  } catch (e) {
    if (e.message === "Slot not found") {
      console.error("Slot not found ❌", slotId);
    } else if (e.message.includes("Duplicate")) {
      console.warn("Duplicate booking blocked ✔ UID:", studentUID);
    } else if (e.message.includes("expired") || e.message.includes("completed")) {
      console.warn("Slot unavailable ❌", e.message);
    } else {
      console.error("Slot booking failed ❌", e);
    }
    return false;
  }
}

// Set up a single real-time listener for expiring slots
let unsubscribeExpireListener = null;

function setupExpireListener() {
  // Clean up any existing listener first
  if (unsubscribeExpireListener) {
    unsubscribeExpireListener();
  }

  const q = query(collection(db, SLOT_COL), orderBy("deadline", "asc"));
  unsubscribeExpireListener = onSnapshot(q, snap => {
    snap.forEach(d => {
      const s = d.data();
      const id = d.id;
      const dl = s.deadline?.toDate ? s.deadline.toDate() : null;
      // Check if slot is expired and not already marked as expired or completed
      if (s.status !== "completed" && s.status !== "expired" && dl && dl < new Date()) {
        updateDoc(doc(db, SLOT_COL, id), { status: "expired" });
        console.log("Slot expired ✔ ID:", id);
      }
    });
  }, error => {
    console.error("Error in expire listener:", error);
  });
}

// Initialize the listener once
setupExpireListener();

export { createSlot, bookSlot };

import { db } from "./firebase.js";
import { onSnapshot, collection, addDoc, updateDoc, doc, query, orderBy, runTransaction, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SLOT_COL = "serviceSlots";

export async function createSlot(vendorId, serviceType, timeSlot, minParticipants, deadline) {
  try {
    const slot = {
      vendorId,
      serviceType,
      timeSlot,
      minParticipants,
      participants: 0,
      studentUIDs: [],            // keep array defined
      status: "open",
      createdAt: new Date(),
      endTime: deadline,          // expiry comparison field
      deadline: deadline          // must be timestamp (ms)
    };
    const ref = await addDoc(collection(db, SLOT_COL), slot);
    console.log({ slotId: ref.id, vendorId, serviceType, state: "slot_created", createdAt: new Date().toISOString() });
    return ref.id;
  } catch (e) {
    console.error("Slot creation failed ❌", e);
    return null;
  }
}

export async function bookSlot(slotId, studentUID) {
  try {
    const slotRef = doc(db, SLOT_COL, slotId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(slotRef);
      if (!snap.exists()) throw new Error("Slot not found");

      const { status, participants, minParticipants, studentUIDs, deadline } = snap.data();

      // Check if slot has expired by deadline
      const now = Date.now();
      const deadlineMs = deadline?.toMillis ? deadline.toMillis() : (typeof deadline === 'number' ? deadline : new Date(deadline).getTime());
      if (deadlineMs && deadlineMs < now) {
        throw new Error("Slot deadline has passed");
      }

      if (status === "expired" || status === "completed") {
        throw new Error(`Slot is ${status}`);
      }

      if (studentUIDs.includes(studentUID)) {
        throw new Error("Duplicate booking blocked");
      }

      const newCount = participants + 1;
      const newStatus = newCount >= minParticipants ? "threshold_reached" : "open";

      transaction.update(slotRef, {
        participants: newCount,
        studentUIDs: [...studentUIDs, studentUID], // atomic safe local update
        status: newStatus
      });
    });

    console.log({ slotId, bookedBy: studentUID, state: "slot_booked", checkedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.warn({ slotId, error: e.message, state: "booking_failed", time: new Date().toISOString() });
    return false;
  }
}

// Expire flip (backup safety loop)
export async function flipExpiredSlots() {
  const now = Date.now();
  const q = query(collection(db, SLOT_COL), where("status", "==", "open"), where("deadline", "<", now));
  const snap = await getDocs(q);

  snap.forEach(s => updateDoc(doc(db, SLOT_COL, s.id), { status: "expired" }));

  console.log({ flipped: snap.size, state: "expired_flip_done", checkedAt: new Date().toISOString() });
  return snap.size;
}

// Demo-safe cleanup loop every 60 sec
setInterval(() => flipExpiredSlots(), 60 * 1000);

// One realtime expiry listener for UI (no crashes)
let unsubscribe = null;
function setupExpireListener() {
  if (unsubscribe) unsubscribe();
  const q = query(collection(db, SLOT_COL), orderBy("deadline", "asc"));
  unsubscribe = onSnapshot(q, snap => {
    const now = Date.now();
    snap.forEach(d => {
      const s = d.data();
      const id = d.id;
      if (s.status === "open" && s.deadline) {
        // Handle both Firestore Timestamp and number formats
        const deadlineMs = s.deadline?.toMillis ? s.deadline.toMillis() : (typeof s.deadline === 'number' ? s.deadline : new Date(s.deadline).getTime());
        if (deadlineMs && deadlineMs < now) {
          updateDoc(doc(db, SLOT_COL, id), { status: "expired" });
          console.log({ slotId: id, state: "slot_expired", flippedAt: new Date().toISOString() });
        }
      }
    });
  }, e => console.error("Expire listener crashed ❌", e));
}
setupExpireListener();

// Helper function to check if a slot is expired
function isSlotExpired(slot) {
  if (slot.status === "expired" || slot.status === "completed") return true;
  if (!slot.deadline) return false;
  
  const now = Date.now();
  const deadlineMs = slot.deadline?.toMillis ? slot.deadline.toMillis() : 
                     (typeof slot.deadline === 'number' ? slot.deadline : 
                      new Date(slot.deadline).getTime());
  return deadlineMs && deadlineMs < now;
}

// Listen to service slots with client-side expiration filtering
export function listenServiceSlots(renderCallback, filterExpired = true) {
  const q = query(collection(db, SLOT_COL), orderBy("deadline", "asc"));
  
  onSnapshot(q, (snap) => {
    const now = Date.now();
    const slots = snap.docs
      .map(d => {
        const data = d.data();
        return { id: d.id, ...data };
      })
      .filter(slot => {
        // Client-side filter: never show expired slots as bookable
        if (filterExpired && isSlotExpired(slot)) {
          return false;
        }
        return true;
      });
    
    renderCallback(slots);
  }, e => console.error("Service slots listener error ❌", e));
}

// expose for manual console testing
window.createSlot = createSlot;
window.bookSlot = bookSlot;
window.flipExpiredSlots = flipExpiredSlots;
window.listenServiceSlots = listenServiceSlots;

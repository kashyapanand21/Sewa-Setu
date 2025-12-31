import { auth, db, onSnapshot, collection, doc, updateDoc } from "./firebase.js";
import { query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// Hardcoded admin identification (frontend only, no Firestore roles)
const ADMIN_UIDS = [
  "QMEjKoukcTNxQBhWLEkce0cfX8D2"
];

auth.onAuthStateChanged(user => {
  if (!user || !ADMIN_UIDS.includes(user.uid)) {
    document.body.innerHTML = "Access Denied ❌";
    console.error("Unauthorized access attempt:", user?.uid);
    return;
  }
  console.log("Admin authenticated ✔ UID:", user.uid);
  loadAllOrders();
});

function loadAllOrders() {
  const q = query(collection(db, "groupOrders"), orderBy("deadline", "asc"));
  onSnapshot(collection(db, "groupOrders"), (snap) => {
    renderOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

async function updateStatus(orderId, newStatus) {
  const ref = doc(db, "groupOrders", orderId);
  try {
    await updateDoc(ref, {
      status: newStatus,
      confirmedAt: new Date()
    });
    console.log(`Status updated ✔ (${newStatus}) for order:`, orderId);
  } catch (e) {
    console.error("Firestore update failed:", e);
  }
}

function renderOrders(orders) {
  const list = document.getElementById("adminOrdersList");
  list.innerHTML = "";

  if (!orders.length) {
    list.innerText = "No orders yet.";
    return;
  }

  orders.forEach(o => {
    const deadline = o.deadline?.toDate
      ? o.deadline.toDate().toLocaleString()
      : "No deadline set";

    const status = o.status || "pending";

    list.innerHTML += `
      <div class="order-item">
        <b>${o.bookName || "Unnamed Order"}</b><br/>
        Buyers: ${o.currentQuantity || 0}/${o.targetQuantity || 0}<br/>
        Status: ${status}<br/>
        Deadline: ${deadline}<br/>
        <button onclick="window.confirmVendor('${o.id}')">Confirm Vendor</button>
        <button onclick="window.markCompleted('${o.id}')">Mark Completed</button>
      </div><hr/>
    `;
  });
}

// Attach actions to window for button onclick
window.confirmVendor = id => updateStatus(id, "vendor_confirmed");
window.markCompleted = id => updateStatus(id, "completed");

import { collection, addDoc, updateDoc, doc, onSnapshot, increment, arrayUnion, getDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let user = null;

// Auth listener
onAuthStateChanged(window.auth, (u) => {
  user = u;
});

// Create group book order
window.createBookBulkOrder = async function(bookTitle, bookAuthor, pricePerBook, targetQty, deadline) {
  if (!user) return alert("Login required ❌");

  const orderData = {
    bookTitle,
    bookAuthor,
    pricePerBook,
    targetQuantity: targetQty,
    currentQuantity: 1,
    status: "open",
    createdBy: user.uid,
    creatorEmail: user.email,
    deadline: new Date(deadline),
    participants: [user.uid],
    createdAt: new Date()
  };

  try {
    const ref = await addDoc(collection(window.firestoreDB, "groupOrders"), orderData);
    console.log("Order created ✔ ID:", ref.id);
    alert("Order placed ✔");
    return ref.id;
  } catch (e) {
    console.error(e);
    alert("Order failed ❌");
  }
};

// Join group order
window.joinBookBulkOrder = async function(orderId) {
  if (!user) return alert("Login required ❌");

  const ref = doc(window.firestoreDB, "groupOrders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Order not found ❌");

  const data = snap.data();
  if (data.status !== "open") return alert("Order closed ❌");

  try {
    await updateDoc(ref, {
      currentQuantity: increment(1),
      participants: arrayUnion(user.uid)
    });
    console.log("Joined ✔", orderId);
    alert("Joined order ✔");
  } catch (e) {
    console.error(e);
    alert("Join failed ❌");
  }
};

// Auto threshold watcher
onSnapshot(
  query(collection(window.firestoreDB, "groupOrders"), orderBy("createdAt","desc")),
  async (snap) => {
    for (const d of snap.docs) {
      const o = d.data();
      if (o.status === "open" && o.currentQuantity >= o.targetQuantity) {
        await updateDoc(doc(window.firestoreDB, "groupOrders", d.id), {
          status: "threshold reached"
        });
        console.log("Threshold reached ✔ closing:", d.id);
      }
    }
  }
);

console.log("Bulk order module loaded ✔");

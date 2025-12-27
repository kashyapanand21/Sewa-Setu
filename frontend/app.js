import { collection, addDoc, doc, updateDoc, onSnapshot, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function createGroupOrder(bookName, targetQuantity, createdByUID, deadline) {
  const ref = await addDoc(collection(window.firestoreDB, "groupOrders"), {
    bookName,
    targetQuantity,
    currentQuantity: 1,
    status: "open",
    createdBy: createdByUID,
    deadline
  });
  return ref.id;
}

export async function joinGroupOrder(orderId) {
  const orderRef = doc(window.firestoreDB, "groupOrders", orderId);
  await updateDoc(orderRef, {
    currentQuantity: increment(1)
  });
}

export function listenGroupOrders(renderCallback) {
  onSnapshot(collection(window.firestoreDB, "groupOrders"), (snap) => {
    const orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    renderCallback(orders);
  });
}

export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(window.firestoreDB, "groupOrders", orderId);
  await updateDoc(orderRef, { status: newStatus });
}

export function exposeJoinFunction() {
  window.joinGroup = async (id) => {
    try {
      await joinGroupOrder(id);
      console.log("Join OK ✔", id);
    } catch (e) {
      console.error("Join failed:", e);
    }
  };
}

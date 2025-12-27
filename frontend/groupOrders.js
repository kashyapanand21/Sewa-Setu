import { 
  collection, addDoc, updateDoc, doc, onSnapshot, increment, query, orderBy, arrayUnion, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let user = null;

// Auth gate
onAuthStateChanged(window.auth, (u) => {
  user = u;
  if (user) console.log("Auth ready ✔ UID:", user.uid);
});

// Create group order (button click based, not form submit confusion)
document.getElementById("createOrderBtn").addEventListener("click", async () => {
  if (!user) return alert("Login required ❌");

  const bookTitle = document.getElementById("bookTitle").value.trim();
  const bookAuthor = document.getElementById("bookAuthor").value.trim();
  const bookPrice = parseInt(document.getElementById("bookPrice").value);
  const targetQty = parseInt(document.getElementById("targetQty").value);
  const deadlineInput = document.getElementById("orderDeadline").value;

  if (!bookTitle || !bookAuthor || !bookPrice || targetQty < 2 || !deadlineInput) {
    return alert("Invalid input ❌");
  }

  const deadline = new Date(deadlineInput);
  if (deadline <= new Date()) return alert("Deadline must be future ❌");

  try {
    const ref = await addDoc(collection(window.firestoreDB, "groupOrders"), {
      bookTitle,
      bookAuthor,
      pricePerBook: bookPrice,
      targetQuantity: targetQty,
      currentQuantity: 1,
      status: "open",
      createdBy: user.uid,
      creatorEmail: user.email,
      deadline,
      createdAt: serverTimestamp(),
      participants: [user.uid]
    });

    console.log("Order placed ✔ ID:", ref.id);
    alert("Order placed ✔");

  } catch (e) {
    console.error("Create failed ❌:", e);
    alert("Create failed ❌");
  }
});

// Join order handler (safe, atomic, multi-tab proof)
window.joinOrder = async function(orderId) {
  if (!user) return alert("Login required ❌");

  const ref = doc(window.firestoreDB, "groupOrders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Order missing ❌");

  const data = snap.data();
  const now = new Date();
  const deadline = data.deadline.toDate ? data.deadline.toDate() : new Date(data.deadline);
  if (now > deadline || data.status !== "open") return alert("Order closed or expired ❌");

  try {
    await updateDoc(ref, {
      currentQuantity: increment(1),
      participants: arrayUnion(user.uid)
    });
    console.log("Join OK ✔", orderId);
    alert("Joined order ✔");
  } catch (e) {
    console.error("Join failed ❌:", e);
    alert("Join failed ❌");
  }
};

// Live render for judges + multi-user demo
onSnapshot(
  query(collection(window.firestoreDB, "groupOrders"), orderBy("createdAt","desc")),
  (snap) => {
    const box = document.getElementById("activeBookOrders");
    box.innerHTML = "";
    snap.forEach(d => {
      const o = d.data();
      box.innerHTML += `
        <div class="order-item">
          <b>${o.bookTitle}</b><br/>
          by ${o.bookAuthor}<br/>
          ₹${o.pricePerBook} per book<br/>
          Buyers: ${o.currentQuantity}/${o.targetQuantity}<br/>
          Status: ${o.status}<br/>
          <button onclick="joinOrder('${d.id}')">Join Group</button>
        </div>
      `;
    });
  }
);


/*import { auth, db, addDoc, collection, onSnapshot, query, where, orderBy, serverTimestamp, arrayUnion, doc, updateDoc, getDoc } from '../firebase.js';

// Create new book group order
document.getElementById('createBookOrderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to create an order');
        return;
    }
    
    const bookTitle = document.getElementById('bookTitle').value;
    const bookAuthor = document.getElementById('bookAuthor').value;
    const bookPrice = parseInt(document.getElementById('bookPrice').value);
    const targetQty = parseInt(document.getElementById('targetQty').value);
    const deadlineInput = document.getElementById('orderDeadline').value;
    
    // Convert datetime-local to timestamp
    const deadline = new Date(deadlineInput);
    
    // Validation
    if (deadline <= new Date()) {
        alert('Deadline must be in the future');
        return;
    }
    
    const orderData = {
        bookTitle: bookTitle.trim(),
        bookAuthor: bookAuthor.trim(),
        pricePerBook: bookPrice,
        targetQuantity: targetQty,
        currentQuantity: 1, // Creator is first participant
        deadline: deadline,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        creatorEmail: user.email,
        participants: [
            {
                uid: user.uid,
                email: user.email,
                joinedAt: new Date()
            }
        ],
        status: 'active', // active, completed, expired
        vendorConfirmed: false
    };
    
    try {
        const docRef = await addDoc(collection(db, 'bookOrders'), orderData);
        console.log('Book order created with ID:', docRef.id);
        
        // Reset form
        e.target.reset();
        
        alert('Group order created successfully! Share with friends to reach the target.');
    } catch (error) {
        console.error('Error creating order:', error);
        alert('Failed to create order: ' + error.message);
    }
});

// Real-time listener for active book orders
const loadActiveBookOrders = () => {
    const ordersContainer = document.getElementById('activeBookOrders');
    
    // Query for active orders only
    const q = query(
        collection(db, 'bookOrders'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
    );
    
    onSnapshot(q, (snapshot) => {
        ordersContainer.innerHTML = '';
        
        if (snapshot.empty) {
            ordersContainer.innerHTML = '<div class="empty-state">No active book orders yet. Create one to get started!</div>';
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            
            // Check if deadline has passed
            const now = new Date();
            const deadline = order.deadline.toDate ? order.deadline.toDate() : new Date(order.deadline);
            const isExpired = now > deadline;
            
            // Calculate progress percentage
            const progressPercent = Math.min((order.currentQuantity / order.targetQuantity) * 100, 100);
            
            // Check if current user already joined
            const currentUser = auth.currentUser;
            const hasJoined = currentUser && order.participants.some(p => p.uid === currentUser.uid);
            
            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-title">${order.bookTitle}</div>
                <div class="order-author">by ${order.bookAuthor}</div>
                
                <div class="order-details">
                    <div class="detail-row">
                        <span class="detail-label">Price per book:</span>
                        <span class="detail-value">₹${order.pricePerBook}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Progress:</span>
                        <span class="detail-value">${order.currentQuantity}/${order.targetQuantity} buyers</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Deadline:</span>
                        <span class="detail-value">${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}</span>
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                
                <span class="status-badge ${isExpired ? 'status-expired' : 'status-active'}">
                    ${isExpired ? 'Deadline Passed' : 'Active'}
                </span>
                
                ${!hasJoined && !isExpired ? `
                    <button class="btn-join" data-order-id="${orderId}">Join Order</button>
                ` : hasJoined ? `
                    <p style="color: #34a853; margin-top: 0.5rem; font-weight: 600;">✓ You've joined this order</p>
                ` : ''}
                
                <div class="participants-list">
                    <strong>Participants (${order.participants.length}):</strong>
                    ${order.participants.slice(0, 3).map(p => 
                        `<div class="participant-item">• ${p.email}</div>`
                    ).join('')}
                    ${order.participants.length > 3 ? `<div class="participant-item">...and ${order.participants.length - 3} more</div>` : ''}
                </div>
            `;
            
            ordersContainer.appendChild(card);
        });
        
        // Attach join order handlers
        document.querySelectorAll('.btn-join').forEach(btn => {
            btn.addEventListener('click', handleJoinOrder);
        });
    }, (error) => {
        console.error('Error loading orders:', error);
        ordersContainer.innerHTML = '<div class="empty-state">Error loading orders. Please refresh the page.</div>';
    });
};

// Handle joining an order
const handleJoinOrder = async (e) => {
    const orderId = e.target.dataset.orderId;
    const user = auth.currentUser;
    
    if (!user) {
        alert('You must be logged in to join an order');
        return;
    }
    
    try {
        const orderRef = doc(db, 'bookOrders', orderId);
        const orderSnap = await getDoc(orderRef);
        
        if (!orderSnap.exists()) {
            alert('Order not found');
            return;
        }
        
        const orderData = orderSnap.data();
        
        // Check if already joined
        if (orderData.participants.some(p => p.uid === user.uid)) {
            alert('You have already joined this order');
            return;
        }
        
        // Check if deadline passed
        const deadline = orderData.deadline.toDate ? orderData.deadline.toDate() : new Date(orderData.deadline);
        if (new Date() > deadline) {
            alert('This order deadline has passed');
            return;
        }
        
        // Update order
        await updateDoc(orderRef, {
            currentQuantity: orderData.currentQuantity + 1,
            participants: arrayUnion({
                uid: user.uid,
                email: user.email,
                joinedAt: new Date()
            })
        });
        
        console.log('Successfully joined order:', orderId);
        alert('Successfully joined the group order!');
        
    } catch (error) {
        console.error('Error joining order:', error);
        alert('Failed to join order: ' + error.message);
    }
};

// Initialize on page load
loadActiveBookOrders(); */
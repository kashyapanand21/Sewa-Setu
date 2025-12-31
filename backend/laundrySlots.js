import { auth, db, addDoc, collection, onSnapshot, query, where, orderBy, serverTimestamp, getDocs, doc, deleteDoc } from '../firebase.js';

const MAX_SLOTS_PER_TIME = 3; // Maximum bookings per time slot to prevent overcrowding

// Create laundry slot booking
document.getElementById('createLaundrySlotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to book a slot');
        return;
    }
    
    const location = document.getElementById('laundryLocation').value;
    const date = document.getElementById('laundryDate').value;
    const timeSlot = document.getElementById('laundryTimeSlot').value;
    
    // Validation - must be future date
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        alert('Please select a future date');
        return;
    }
    
    // Check if slot is already full
    try {
        const q = query(
            collection(db, 'laundrySlots'),
            where('location', '==', location),
            where('date', '==', selectedDate),
            where('timeSlot', '==', timeSlot),
            where('status', '==', 'booked')
        );
        
        const existingSlots = await getDocs(q);
        
        if (existingSlots.size >= MAX_SLOTS_PER_TIME) {
            alert(`This slot is full! Maximum ${MAX_SLOTS_PER_TIME} bookings per slot. Please choose another time.`);
            return;
        }
        
        // Check if user already booked this slot
        const userHasBooked = existingSlots.docs.some(doc => doc.data().bookedBy === user.uid);
        if (userHasBooked) {
            alert('You have already booked this slot');
            return;
        }
        
    } catch (error) {
        console.error('Error checking slot availability:', error);
        alert('Failed to check availability');
        return;
    }
    
    const slotData = {
        location: location,
        date: selectedDate,
        timeSlot: timeSlot,
        bookedBy: user.uid,
        bookedByEmail: user.email,
        createdAt: serverTimestamp(),
        status: 'booked' // booked, completed, cancelled
    };
    
    try {
        const docRef = await addDoc(collection(db, 'laundrySlots'), slotData);
        console.log('Laundry slot booked with ID:', docRef.id);
        
        // Reset form
        e.target.reset();
        
        alert('Laundry slot booked successfully!');
    } catch (error) {
        console.error('Error booking slot:', error);
        alert('Failed to book slot: ' + error.message);
    }
});

// Real-time listener for laundry slots
const loadLaundrySlots = () => {
    const slotsContainer = document.getElementById('laundrySlotsGrid');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Query for today and future slots
    const q = query(
        collection(db, 'laundrySlots'),
        where('status', '==', 'booked'),
        orderBy('date', 'asc')
    );
    
    onSnapshot(q, (snapshot) => {
        slotsContainer.innerHTML = '';
        
        if (snapshot.empty) {
            slotsContainer.innerHTML = '<div class="empty-state">No laundry slots booked yet.</div>';
            return;
        }
        
        // Group slots by location, date, and time
        const slotsByKey = {};
        
        snapshot.forEach((docSnap) => {
            const slot = docSnap.data();
            const slotId = docSnap.id;
            const slotDate = slot.date.toDate ? slot.date.toDate() : new Date(slot.date);
            
            // Only show today and future
            if (slotDate >= today) {
                const key = `${slot.location}|${slotDate.toDateString()}|${slot.timeSlot}`;
                if (!slotsByKey[key]) {
                    slotsByKey[key] = {
                        location: slot.location,
                        date: slotDate,
                        timeSlot: slot.timeSlot,
                        bookings: []
                    };
                }
                slotsByKey[key].bookings.push({ ...slot, id: slotId });
            }
        });
        
        // Display slots
        const sortedKeys = Object.keys(slotsByKey).sort((a, b) => {
            const dateA = slotsByKey[a].date;
            const dateB = slotsByKey[b].date;
            return dateA - dateB;
        });
        
        sortedKeys.forEach(key => {
            const slotGroup = slotsByKey[key];
            const bookingCount = slotGroup.bookings.length;
            const slotsRemaining = MAX_SLOTS_PER_TIME - bookingCount;
            const currentUser = auth.currentUser;
            const userBooking = slotGroup.bookings.find(b => b.bookedBy === currentUser?.uid);
            
            const card = document.createElement('div');
            card.className = 'slot-card';
            card.innerHTML = `
                <div class="order-title">${slotGroup.location}</div>
                
                <div class="order-details">
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${slotGroup.date.toDateString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${slotGroup.timeSlot}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Bookings:</span>
                        <span class="detail-value">${bookingCount}/${MAX_SLOTS_PER_TIME}</span>
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(bookingCount / MAX_SLOTS_PER_TIME) * 100}%"></div>
                </div>
                
                <span class="status-badge ${slotsRemaining > 0 ? 'status-active' : 'status-completed'}">
                    ${slotsRemaining > 0 ? `${slotsRemaining} slot${slotsRemaining > 1 ? 's' : ''} left` : 'Full'}
                </span>
                
                ${userBooking ? `
                    <p style="color: #34a853; margin-top: 0.5rem; font-weight: 600;">✓ You've booked this slot</p>
                    <button class="btn-danger" style="margin-top: 0.5rem;" data-slot-id="${userBooking.id}">Cancel Booking</button>
                ` : ''}
                
                <div class="participants-list">
                    <strong>Booked by:</strong>
                    ${slotGroup.bookings.map(b => 
                        `<div class="participant-item">• ${b.bookedByEmail}</div>`
                    ).join('')}
                </div>
            `;
            
            slotsContainer.appendChild(card);
        });
        
        if (sortedKeys.length === 0) {
            slotsContainer.innerHTML = '<div class="empty-state">No upcoming laundry slots booked.</div>';
        }
        
        // Attach cancel handlers
        document.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', handleCancelLaundrySlot);
        });
    }, (error) => {
        console.error('Error loading slots:', error);
        slotsContainer.innerHTML = '<div class="empty-state">Error loading slots. Please refresh the page.</div>';
    });
};

// Handle cancelling a laundry slot
const handleCancelLaundrySlot = async (e) => {
    const slotId = e.target.dataset.slotId;
    
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'laundrySlots', slotId));
        console.log('Laundry slot cancelled:', slotId);
        alert('Booking cancelled successfully');
    } catch (error) {
        console.error('Error cancelling slot:', error);
        alert('Failed to cancel booking: ' + error.message);
    }
};

// Set minimum date to today
document.getElementById('laundryDate').min = new Date().toISOString().split('T')[0];

// Initialize
loadLaundrySlots();
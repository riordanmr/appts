// API Base URL
const API_URL = window.location.origin + '/api';

// Global state
let token = localStorage.getItem('token');
let currentUser = null;
let selectedTimeSlot = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    checkAuth();
  }
  setMinDate();
});

function setMinDate() {
  const dateInput = document.getElementById('appointment-date');
  if (dateInput) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }
}

// Auth functions
function showTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabButtons = document.querySelectorAll('.tab-button');

  tabButtons.forEach(btn => btn.classList.remove('active'));

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabButtons[0].classList.add('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabButtons[1].classList.add('active');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    token = data.token;
    localStorage.setItem('token', token);
    currentUser = data.user;

    showBookingSection();
    loadServices();
    loadStylists();
    loadMyAppointments();
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.add('show');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;
  const errorDiv = document.getElementById('register-error');

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    token = data.token;
    localStorage.setItem('token', token);
    currentUser = data.user;

    showBookingSection();
    loadServices();
    loadStylists();
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.add('show');
  }
}

async function checkAuth() {
  try {
    // Try to use the token to load user's appointments (validates token)
    const response = await fetch(`${API_URL}/appointments/my-appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      showBookingSection();
      loadServices();
      loadStylists();
      loadMyAppointments();
    } else {
      localStorage.removeItem('token');
      token = null;
    }
  } catch (error) {
    localStorage.removeItem('token');
    token = null;
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  currentUser = null;
  location.reload();
}

function showBookingSection() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('booking-section').style.display = 'block';
  document.getElementById('user-info').style.display = 'flex';
  if (currentUser) {
    document.getElementById('user-name').textContent = currentUser.name;
  }
}

// Load services
async function loadServices() {
  try {
    const response = await fetch(`${API_URL}/services`);
    const services = await response.json();

    const select = document.getElementById('service-select');
    select.innerHTML = '<option value="">Choose a service...</option>';
    
    services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = `${service.name} - $${service.price} (${service.duration_minutes} min)`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

// Load stylists
async function loadStylists() {
  try {
    const response = await fetch(`${API_URL}/stylists`);
    const stylists = await response.json();

    const select = document.getElementById('stylist-select');
    select.innerHTML = '<option value="any">Any Available Stylist</option>';
    
    stylists.forEach(stylist => {
      const option = document.createElement('option');
      option.value = stylist.id;
      option.textContent = stylist.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading stylists:', error);
  }
}

// Load available time slots
async function loadAvailability() {
  const serviceId = document.getElementById('service-select').value;
  const stylistId = document.getElementById('stylist-select').value;
  const date = document.getElementById('appointment-date').value;

  if (!serviceId || !date) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/appointments/availability?serviceId=${serviceId}&stylistId=${stylistId}&date=${date}`
    );
    const data = await response.json();

    const timeSlotsContainer = document.getElementById('time-slots');
    const timeSlotGroup = document.getElementById('time-slot-group');
    
    timeSlotsContainer.innerHTML = '';
    selectedTimeSlot = null;

    if (data.availableSlots && data.availableSlots.length > 0) {
      timeSlotGroup.style.display = 'block';
      
      data.availableSlots.forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'time-slot';
        slotDiv.textContent = slot;
        slotDiv.addEventListener('click', () => selectTimeSlot(slot, slotDiv));
        timeSlotsContainer.appendChild(slotDiv);
      });
    } else {
      timeSlotGroup.style.display = 'block';
      timeSlotsContainer.innerHTML = '<p>No available time slots for this date.</p>';
    }

    document.getElementById('submit-booking').disabled = true;
  } catch (error) {
    console.error('Error loading availability:', error);
  }
}

function selectTimeSlot(slot, element) {
  // Remove previous selection
  document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
  
  // Add selection to clicked slot
  element.classList.add('selected');
  selectedTimeSlot = slot;
  
  document.getElementById('submit-booking').disabled = false;
}

// Book appointment
async function handleBooking(event) {
  event.preventDefault();

  const serviceId = document.getElementById('service-select').value;
  const stylistId = document.getElementById('stylist-select').value;
  const date = document.getElementById('appointment-date').value;
  const notes = document.getElementById('appointment-notes').value;

  if (!selectedTimeSlot) {
    alert('Please select a time slot');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        serviceId,
        stylistId,
        date,
        time: selectedTimeSlot,
        notes
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Booking failed');
    }

    // Show success message
    const resultDiv = document.getElementById('booking-result');
    resultDiv.textContent = 'Appointment booked successfully! You will receive confirmation via email and SMS.';
    resultDiv.style.display = 'block';

    // Reset form
    document.getElementById('booking-form').reset();
    document.getElementById('time-slot-group').style.display = 'none';
    selectedTimeSlot = null;
    document.getElementById('submit-booking').disabled = true;

    // Reload appointments
    loadMyAppointments();

    // Hide success message after 5 seconds
    setTimeout(() => {
      resultDiv.style.display = 'none';
    }, 5000);
  } catch (error) {
    alert(error.message);
  }
}

// Load user's appointments
async function loadMyAppointments() {
  try {
    const response = await fetch(`${API_URL}/appointments/my-appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const appointments = await response.json();

    const container = document.getElementById('my-appointments');
    
    if (appointments.length === 0) {
      container.innerHTML = '<p>No appointments yet.</p>';
      return;
    }

    container.innerHTML = '';
    
    appointments.forEach(apt => {
      const card = document.createElement('div');
      card.className = 'appointment-card';
      
      const statusClass = `status-${apt.status}`;
      const stylistName = apt.stylist_name || 'Any available stylist';
      
      // Build card safely without XSS vulnerability
      const heading = document.createElement('h4');
      heading.textContent = apt.service_name;
      card.appendChild(heading);
      
      const dateP = document.createElement('p');
      dateP.innerHTML = '<strong>Date:</strong> ';
      const dateSpan = document.createElement('span');
      dateSpan.textContent = apt.appointment_date;
      dateP.appendChild(dateSpan);
      card.appendChild(dateP);
      
      const timeP = document.createElement('p');
      timeP.innerHTML = '<strong>Time:</strong> ';
      const timeSpan = document.createElement('span');
      timeSpan.textContent = apt.appointment_time;
      timeP.appendChild(timeSpan);
      card.appendChild(timeP);
      
      const stylistP = document.createElement('p');
      stylistP.innerHTML = '<strong>Stylist:</strong> ';
      const stylistSpan = document.createElement('span');
      stylistSpan.textContent = stylistName;
      stylistP.appendChild(stylistSpan);
      card.appendChild(stylistP);
      
      const priceP = document.createElement('p');
      priceP.innerHTML = '<strong>Price:</strong> ';
      const priceSpan = document.createElement('span');
      priceSpan.textContent = `$${apt.price}`;
      priceP.appendChild(priceSpan);
      card.appendChild(priceP);
      
      const statusP = document.createElement('p');
      statusP.innerHTML = '<strong>Status:</strong> ';
      const statusBadge = document.createElement('span');
      statusBadge.className = `status-badge ${statusClass}`;
      statusBadge.textContent = apt.status;
      statusP.appendChild(statusBadge);
      card.appendChild(statusP);
      
      if (apt.notes) {
        const notesP = document.createElement('p');
        notesP.innerHTML = '<strong>Notes:</strong> ';
        const notesSpan = document.createElement('span');
        notesSpan.textContent = apt.notes;
        notesP.appendChild(notesSpan);
        card.appendChild(notesP);
      }
      
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

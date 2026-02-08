// API Base URL
const API_URL = window.location.origin + '/api';

// Global state
let token = localStorage.getItem('token');
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    checkAuth();
  }
});

// Auth functions
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

    // Check if user is stylist or admin
    if (data.user.role !== 'stylist' && data.user.role !== 'admin') {
      throw new Error('Access denied. This portal is for stylists only.');
    }

    token = data.token;
    localStorage.setItem('token', token);
    currentUser = data.user;

    showAppointmentsSection();
    loadAppointments();
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.add('show');
  }
}

async function checkAuth() {
  try {
    const response = await fetch(`${API_URL}/appointments/stylist-appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      showAppointmentsSection();
      loadAppointments();
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

function showAppointmentsSection() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('appointments-section').style.display = 'block';
  document.getElementById('user-info').style.display = 'flex';
  if (currentUser) {
    document.getElementById('user-name').textContent = currentUser.name;
  }
}

// Load appointments
async function loadAppointments() {
  try {
    const response = await fetch(`${API_URL}/appointments/stylist-appointments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const appointments = await response.json();

    const container = document.getElementById('appointments-list');
    
    if (appointments.length === 0) {
      container.innerHTML = '<p>No appointments scheduled.</p>';
      return;
    }

    container.innerHTML = '';
    
    // Group appointments by date
    const groupedAppointments = {};
    appointments.forEach(apt => {
      if (!groupedAppointments[apt.appointment_date]) {
        groupedAppointments[apt.appointment_date] = [];
      }
      groupedAppointments[apt.appointment_date].push(apt);
    });

    // Display appointments by date
    Object.keys(groupedAppointments).sort().forEach(date => {
      const dateHeader = document.createElement('h3');
      dateHeader.textContent = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      container.appendChild(dateHeader);

      groupedAppointments[date].forEach(apt => {
        const card = document.createElement('div');
        card.className = 'appointment-card';
        
        const statusClass = `status-${apt.status}`;
        
        card.innerHTML = `
          <h4>${apt.customer_name}</h4>
          <p><strong>Service:</strong> ${apt.service_name} (${apt.duration_minutes} min)</p>
          <p><strong>Time:</strong> ${apt.appointment_time}</p>
          <p><strong>Price:</strong> $${apt.price}</p>
          <p><strong>Phone:</strong> ${apt.customer_phone}</p>
          <p><strong>Email:</strong> ${apt.customer_email}</p>
          <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${apt.status}</span></p>
          ${apt.notes ? `<p><strong>Notes:</strong> ${apt.notes}</p>` : ''}
          <div class="appointment-actions">
            <button class="edit-btn" onclick="openEditModal(${apt.id}, '${apt.appointment_date}', '${apt.appointment_time}', '${apt.status}', '${apt.notes || ''}')">Edit</button>
            <button class="delete-btn" onclick="deleteAppointment(${apt.id})">Delete</button>
          </div>
        `;
        
        container.appendChild(card);
      });
    });
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// Edit appointment
function openEditModal(id, date, time, status, notes) {
  document.getElementById('edit-appointment-id').value = id;
  document.getElementById('edit-date').value = date;
  document.getElementById('edit-time').value = time;
  document.getElementById('edit-status').value = status;
  document.getElementById('edit-notes').value = notes;
  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

async function handleEditAppointment(event) {
  event.preventDefault();

  const id = document.getElementById('edit-appointment-id').value;
  const date = document.getElementById('edit-date').value;
  const time = document.getElementById('edit-time').value;
  const status = document.getElementById('edit-status').value;
  const notes = document.getElementById('edit-notes').value;

  try {
    const response = await fetch(`${API_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ date, time, status, notes })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Update failed');
    }

    closeEditModal();
    loadAppointments();
    alert('Appointment updated successfully');
  } catch (error) {
    alert(error.message);
  }
}

// Delete appointment
async function deleteAppointment(id) {
  if (!confirm('Are you sure you want to delete this appointment?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Delete failed');
    }

    loadAppointments();
    alert('Appointment deleted successfully');
  } catch (error) {
    alert(error.message);
  }
}

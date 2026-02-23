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
        
        // Build card safely without innerHTML XSS vulnerability
        const heading = document.createElement('h4');
        heading.textContent = apt.customer_name;
        card.appendChild(heading);
        
        const serviceP = document.createElement('p');
        serviceP.innerHTML = '<strong>Service:</strong> ';
        const serviceSpan = document.createElement('span');
        serviceSpan.textContent = `${apt.service_name} (${apt.duration_minutes} min)`;
        serviceP.appendChild(serviceSpan);
        card.appendChild(serviceP);
        
        const timeP = document.createElement('p');
        timeP.innerHTML = '<strong>Time:</strong> ';
        const timeSpan = document.createElement('span');
        timeSpan.textContent = apt.appointment_time;
        timeP.appendChild(timeSpan);
        card.appendChild(timeP);
        
        const priceP = document.createElement('p');
        priceP.innerHTML = '<strong>Price:</strong> ';
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `$${apt.price}`;
        priceP.appendChild(priceSpan);
        card.appendChild(priceP);
        
        const phoneP = document.createElement('p');
        phoneP.innerHTML = '<strong>Phone:</strong> ';
        const phoneSpan = document.createElement('span');
        phoneSpan.textContent = apt.customer_phone;
        phoneP.appendChild(phoneSpan);
        card.appendChild(phoneP);
        
        const emailP = document.createElement('p');
        emailP.innerHTML = '<strong>Email:</strong> ';
        const emailSpan = document.createElement('span');
        emailSpan.textContent = apt.customer_email;
        emailP.appendChild(emailSpan);
        card.appendChild(emailP);
        
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
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'appointment-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => {
          openEditModal(apt.id, apt.appointment_date, apt.appointment_time, apt.status, apt.notes || '');
        });
        actionsDiv.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
          deleteAppointment(apt.id);
        });
        actionsDiv.appendChild(deleteBtn);
        
        card.appendChild(actionsDiv);
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

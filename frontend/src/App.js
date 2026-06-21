import React, { useState, useEffect, useRef } from 'react';

const EmergencyApp = () => {
  const [accidentDetected, setAccidentDetected] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [location, setLocation] = useState(null);
 const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showAreYouOk, setShowAreYouOk] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState('');
  const [passwordResetStep, setPasswordResetStep] = useState('email'); // 'email' or 'otp'
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [authError, setAuthError] = useState('');
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // WhatsApp Web.js states
  const [whatsappQRCode, setWhatsappQRCode] = useState('');
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState('Disconnected');

  // Modal states
  const [showCustomerSupportModal, setShowCustomerSupportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('');
  
  // Verification and Forgot Password states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [tempRegisterData, setTempRegisterData] = useState(null);

  // Contacts Management states
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [phoneError, setPhoneError] = useState('');
  // Edit contact states
  const [editingContactIndex, setEditingContactIndex] = useState(null);
  const [editingContact, setEditingContact] = useState({ name: '', phone: '' });

  // Voice and Motion Detection States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMotionActive, setIsMotionActive] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');

  // Auto backend detection
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');
  const [backendReady, setBackendReady] = useState(false);

  const countdownRef = useRef(null);
  // Refs for voice and motion
  const voiceRecognitionRef = useRef(null);
  const motionHandlerRef = useRef(null);
  // WhatsApp polling interval ref
  const whatsappIntervalRef = useRef(null);

  // ============================================
  // LOAD CONTACTS FROM localStorage (Permanent)
  // ============================================
  useEffect(() => {
    // Load contacts from localStorage on app start
    const savedContacts = localStorage.getItem('emergencyContacts');
    if (savedContacts) {
      try {
        const parsed = JSON.parse(savedContacts);
        if (parsed.length > 0) {
          setEmergencyContacts(parsed);
          console.log('✅ Contacts loaded from localStorage');
        }
      } catch(e) {}
    }
  }, []);

  // Save contacts to localStorage whenever they change
  useEffect(() => {
    if (emergencyContacts.length > 0) {
      localStorage.setItem('emergencyContacts', JSON.stringify(emergencyContacts));
      console.log('✅ Contacts saved to localStorage');
    }
  }, [emergencyContacts]);

  // ============================================
  // SAVE CONTACTS TO BACKEND (Permanent storage)
  // ============================================
  const saveContactsToBackend = async (contacts) => {
    if (!isLoggedIn) {
      console.log('Not logged in, cannot save to backend');
      return false;
    }
    try {
      const token = localStorage.getItem('emergency_token');
      const response = await fetch(`${backendUrl}/api/user/emergency-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ contacts: contacts })
      });
      const data = await response.json();
      if (data.success) {
        console.log('✅ Contacts saved to backend');
        return true;
      }
      return false;
    } catch (error) { 
      console.error('Failed to save contacts:', error);
      return false;
    }
  };

  // ============================================
  // LOAD CONTACTS FROM BACKEND
  // ============================================
  const loadContactsFromBackend = async () => {
    if (!isLoggedIn) return;
    try {
      const token = localStorage.getItem('emergency_token');
      const response = await fetch(`${backendUrl}/api/user/emergency-contacts`, {
        method: 'GET', 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.contacts && data.contacts.length > 0) {
        setEmergencyContacts(data.contacts);
        localStorage.setItem('emergencyContacts', JSON.stringify(data.contacts));
        console.log('✅ Contacts loaded from backend');
      }
    } catch (error) { 
      console.error('Failed to load contacts:', error);
    }
  };

  // Validate alphanumeric name (must contain at least one letter)
  const validateName = (name) => {
    if (!name.trim()) return { isValid: false, message: '❌ Name is required' };
    if (!/[a-zA-Z]/.test(name.trim()))
      return { isValid: false, message: '❌ Name must contain at least one letter (cannot be only numbers)' };
    return { isValid: true, message: '' };
  };

  // ============================================
  // VOICE DETECTION FUNCTION
  // ============================================
  
const startVoiceDetection = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    setEmergencyStatus('❌ Voice detection not supported in this browser');
    return;
  }
  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  const emergencyKeywords = ['help', 'emergency', 'accident', 'save me', 'i need help', 'sos', 'crash', 'injured', 'i need assistance', 'someone help', 'call ambulance'];
  
  recognition.onstart = () => {
    setIsVoiceActive(true);
    setEmergencyStatus('🎤 Voice detection ACTIVE! Say "Help", "Emergency", "Accident" or "SOS" to trigger alert.');
    console.log('🎤 Voice recognition started');
  };
  
  recognition.onerror = (event) => {
    console.error('Voice error:', event.error);
    setIsVoiceActive(false);
    setEmergencyStatus(`❌ Voice error: ${event.error}. Please grant microphone permission.`);
  };
  
recognition.onresult = (event) => {
  // 🔥 CRITICAL FIX: Ignore all voice if emergency already active
  if (accidentDetected || showAreYouOk) {
    console.log('⚠️ Voice ignored – emergency already active');
    return;
  }
  
  let spokenText = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    spokenText += event.results[i][0].transcript;
  }
  spokenText = spokenText.toLowerCase().trim();
  console.log('🎤 Heard:', spokenText);
  setDetectionMessage(`Voice heard: "${spokenText}"`);
  
  const isEmergency = emergencyKeywords.some(keyword => spokenText.includes(keyword));
  if (isEmergency) {
    console.log('🚨 EMERGENCY KEYWORD DETECTED! Triggering accident detection...');
    setEmergencyStatus(`🚨 VOICE DETECTED: "${spokenText}" - Triggering emergency!`);
    setDetectionMessage(`🚨 Voice triggered: "${spokenText}"`);
    triggerAccidentDetection();
  }
};
  recognition.onend = () => {
    console.log('🎤 Voice recognition ended. Restarting...');
    if (isVoiceActive) {
      recognition.start();
    }
  };
  
  recognition.start();
  voiceRecognitionRef.current = recognition;
};
  
  
  const stopVoiceDetection = () => {
    if (voiceRecognitionRef.current) { voiceRecognitionRef.current.stop(); voiceRecognitionRef.current = null; }
    setIsVoiceActive(false);
    setEmergencyStatus('🎤 Voice detection stopped');
  };

  // ============================================
  // MOTION DETECTION FUNCTION
  // ============================================
  const startMotionDetection = () => {
    if (!window.DeviceMotionEvent) {
      setEmergencyStatus('❌ Motion detection not supported on this device');
      return;
    }
    let lastShakeTime = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    let shakeCount = 0;
    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const now = Date.now();
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);
      const intensity = (deltaX + deltaY + deltaZ) * 10;
      if (intensity > 40 && now - lastShakeTime > 1000) {
        lastShakeTime = now;
        shakeCount++;
        console.log(`💥 IMPACT DETECTED! Intensity: ${intensity.toFixed(0)}%`);
        setDetectionMessage(`Motion: Impact ${intensity.toFixed(0)}%`);
        if (intensity > 60 || shakeCount >= 2) {
          console.log('🚨 CRASH CONFIRMED!');
          setEmergencyStatus(`🚨 CRASH DETECTED! Impact force: ${intensity.toFixed(0)}% - Sending alerts!`);
          setDetectionMessage(`🚨 Crash detected! Impact: ${intensity.toFixed(0)}%`);
          triggerAccidentDetection();
          shakeCount = 0;
        } else {
          setEmergencyStatus(`⚠️ Impact detected: ${intensity.toFixed(0)}% - Monitoring...`);
        }
        setTimeout(() => { shakeCount = 0; }, 3000);
      }
      if (intensity > 20 && intensity < 40 && now - lastShakeTime < 500) {
        shakeCount++;
        if (shakeCount > 5) {
          console.log('🚨 CONTINUOUS SHAKING DETECTED!');
          setEmergencyStatus('🚨 Continuous shaking detected! Triggering emergency...');
          setDetectionMessage('🚨 Continuous shaking detected!');
          triggerAccidentDetection();
          shakeCount = 0;
        }
      }
      lastX = x;
      lastY = y;
      lastZ = z;
    };
    window.addEventListener('devicemotion', handleMotion);
    setIsMotionActive(true);
    setEmergencyStatus('📱 Motion detection ACTIVE! Drop or shake phone to test.');
    motionHandlerRef.current = handleMotion;
  };

  const stopMotionDetection = () => {
    if (motionHandlerRef.current) { window.removeEventListener('devicemotion', motionHandlerRef.current); motionHandlerRef.current = null; }
    setIsMotionActive(false);
    setEmergencyStatus('📱 Motion detection stopped');
  };

  // ============================================
  // START FULL AUTOMATIC DETECTION
  // ============================================
  const startFullAutomaticDetection = async () => {
  console.log('🔴 Starting full automatic detection...');
  
  // Request microphone permission explicitly
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ Microphone permission GRANTED!');
    stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission
  } catch (err) {
    console.error('❌ Microphone permission DENIED:', err);
    setEmergencyStatus('❌ Microphone permission denied. Please allow microphone access and try again.');
    return;
  }
  
  // Request motion permission if needed (iOS only)
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      await DeviceMotionEvent.requestPermission();
      console.log('✅ Motion permission granted');
    } catch (err) {
      console.warn('Motion permission denied:', err);
    }
  }
  
  startVoiceDetection();
  startMotionDetection();
  setEmergencyStatus('🔴 FULL AUTOMATIC DETECTION ACTIVE! Voice + Motion monitoring enabled.');
  setDetectionMessage('Auto detection started - Voice and Motion sensors active');
};

  const stopAllDetections = () => {
    stopVoiceDetection();
    stopMotionDetection();
    setEmergencyStatus('🟢 All automatic detections stopped');
    setDetectionMessage('');
  };

  // Auto-detect backend port
  useEffect(() => {
    const findBackend = async () => {
      const ports = [5000, 5001, 5002, 5003, 5004, 5005];
      console.log('🔍 Searching for backend on ports 5000-5005...');
      for (const port of ports) {
        try {
          console.log(`📡 Trying port ${port}...`);
          const response = await fetch(`http://localhost:${port}/api/health`);
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Backend FOUND on port ${port}!`, data);
            setBackendUrl(`http://localhost:${port}`);
            setBackendReady(true);
            setEmergencyStatus(`✅ Connected to backend on port ${port}`);
            return;
          }
        } catch (e) {
          console.log(`❌ Port ${port}: No backend`);
          continue;
        }
      }
      console.warn('⚠️ Backend not found on any port (5000-5005)');
      setEmergencyStatus('⚠️ Backend not found. Make sure backend is running on port 5000-5005');
    };
    findBackend();
  }, []);

  // Validate Pakistan phone number
  const validatePhoneNumber = (phone) => {
    const pakistanPhoneRegex = /^03[0-9]{9}$/;
    if (!pakistanPhoneRegex.test(phone)) {
      return { isValid: false, message: '❌ Invalid Pakistan phone number! Must start with 03 and be 11 digits (e.g., 03001234567)' };
    }
    return { isValid: true, message: '' };
  };

  // ============================================
  // WHATSAPP CONNECT - FIXED (Always shows QR code)
  // ============================================
  const connectWhatsApp = async () => {
    if (!backendReady) {
      setEmergencyStatus('⚠️ Backend not ready. Please wait...');
      return;
    }
    
    // Clear any existing interval
    if (whatsappIntervalRef.current) {
      clearInterval(whatsappIntervalRef.current);
      whatsappIntervalRef.current = null;
    }
    
    setWhatsappStatus('Requesting QR code...');
    setWhatsappQRCode('');
    
    try {
      const response = await fetch(`${backendUrl}/api/whatsapp/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('WhatsApp connect response:', data);
      
      if (data.qrCode) {
        setWhatsappQRCode(data.qrCode);
        setWhatsappStatus('Scan QR code with WhatsApp');
        setEmergencyStatus('✅ QR code generated! Scan with WhatsApp Web');
        
        // Start polling for connection status
        if (whatsappIntervalRef.current) clearInterval(whatsappIntervalRef.current);
        whatsappIntervalRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(`${backendUrl}/api/whatsapp/status`);
            const statusData = await statusRes.json();
            
            if (statusData.connected) {
              setWhatsappConnected(true);
              setWhatsappStatus('✅ WhatsApp Connected!');
              setWhatsappQRCode('');
              clearInterval(whatsappIntervalRef.current);
              whatsappIntervalRef.current = null;
              setEmergencyStatus('✅ WhatsApp connected successfully!');
            }
          } catch(e) {
            console.log('Status check error:', e);
          }
        }, 3000);
        
      } else if (data.status === 'connected') {
        setWhatsappConnected(true);
        setWhatsappStatus('✅ WhatsApp Connected!');
      } else {
        setWhatsappStatus('Failed to get QR code. Try again.');
        setEmergencyStatus('❌ Could not get QR code. Please restart backend.');
      }
      
    } catch (error) {
      console.error('WhatsApp error:', error);
      setWhatsappStatus('WhatsApp service unavailable');
      setWhatsappConnected(false);
      setEmergencyStatus('❌ Could not connect to WhatsApp backend');
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/whatsapp/status`);
      const data = await response.json();
      setWhatsappConnected(data.connected);
      setWhatsappStatus(data.connected ? '✅ WhatsApp Connected!' : 'Disconnected');
    } catch (error) {
      setWhatsappConnected(false);
      setWhatsappStatus('Disconnected');
    }
  };
  
  // Check if user is already logged in and load contacts
  useEffect(() => {
    if (backendReady) {
      checkWhatsAppStatus();
    }
  }, [backendReady]);

  // Cleanup WhatsApp interval on unmount
  useEffect(() => {
    return () => {
      if (whatsappIntervalRef.current) {
        clearInterval(whatsappIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('emergency_token');
    const userData = localStorage.getItem('emergency_user');
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
      loadContactsFromBackend();
    }
    getDetailedLocation();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // ============================================
  // CONTACT MANAGEMENT (With localStorage persistence)
  // ============================================
  const handleAddContact = async () => {
    if (!isLoggedIn) { setEmergencyStatus('⚠️ Please login to manage emergency contacts.'); return; }
    if (!newContact.name.trim()) { setEmergencyStatus('❌ Please enter name'); return; }
    const nameValidation = validateName(newContact.name);
    if (!nameValidation.isValid) { setEmergencyStatus(nameValidation.message); return; }
    if (!newContact.phone.trim()) { setEmergencyStatus('❌ Please enter phone number'); return; }
    const validation = validatePhoneNumber(newContact.phone);
    if (!validation.isValid) { setPhoneError(validation.message); setEmergencyStatus(validation.message); return; }
    setPhoneError('');
    const isDuplicate = emergencyContacts.some(contact => contact.phone === newContact.phone.trim());
    if (isDuplicate) { setEmergencyStatus('❌ This phone number already exists'); return; }
    const updatedContacts = [...emergencyContacts, { name: newContact.name.trim(), phone: newContact.phone.trim() }];
    setEmergencyContacts(updatedContacts);
    localStorage.setItem('emergencyContacts', JSON.stringify(updatedContacts));
    await saveContactsToBackend(updatedContacts);
    setNewContact({ name: '', phone: '' });
    setShowContactsModal(false);
    setEmergencyStatus('✅ Contact added permanently!');
  };

  const handleEditContact = (index) => {
    setEditingContactIndex(index);
    setEditingContact({ ...emergencyContacts[index] });
  };

  const handleUpdateContact = async () => {
    if (!isLoggedIn) return;
    if (!editingContact.name.trim()) { setEmergencyStatus('❌ Name is required'); return; }
    const nameValidation = validateName(editingContact.name);
    if (!nameValidation.isValid) { setEmergencyStatus(nameValidation.message); return; }
    if (!editingContact.phone.trim()) { setEmergencyStatus('❌ Phone number is required'); return; }
    const phoneValidation = validatePhoneNumber(editingContact.phone);
    if (!phoneValidation.isValid) { setEmergencyStatus(phoneValidation.message); return; }
    const updatedContacts = [...emergencyContacts];
    updatedContacts[editingContactIndex] = { name: editingContact.name.trim(), phone: editingContact.phone.trim() };
    setEmergencyContacts(updatedContacts);
    localStorage.setItem('emergencyContacts', JSON.stringify(updatedContacts));
    await saveContactsToBackend(updatedContacts);
    setEditingContactIndex(null);
    setEditingContact({ name: '', phone: '' });
    setEmergencyStatus('✅ Contact updated permanently!');
  };

  const cancelEdit = () => {
    setEditingContactIndex(null);
    setEditingContact({ name: '', phone: '' });
  };

  const handleRemoveContact = async (index) => {
    if (!isLoggedIn) return;
    const updatedContacts = emergencyContacts.filter((_, i) => i !== index);
    setEmergencyContacts(updatedContacts);
    localStorage.setItem('emergencyContacts', JSON.stringify(updatedContacts));
    await saveContactsToBackend(updatedContacts);
    setEmergencyStatus('✅ Contact removed permanently!');
  };

  const openContactsModal = () => {
    if (!isLoggedIn) { setEmergencyStatus('⚠️ Please login to manage emergency contacts.'); return; }
    setShowContactsModal(true);
    setNewContact({ name: '', phone: '' });
    setEditingContactIndex(null);
    setPhoneError('');
  };

  // ============================================
  // EMERGENCY FUNCTIONS
  // ============================================
 const triggerAccidentDetection = () => {
  // Prevent multiple triggers and STOP MICROPHONE immediately
  if (accidentDetected || showAreYouOk) return;
  
  stopVoiceDetection();  // ← ADD THIS LINE – kills microphone
  
  setAccidentDetected(true);
  setShowAreYouOk(true);
  setEmergencyStatus('🚨 Accident detected! 60 seconds to cancel...');
  getDetailedLocation();
  startCountdown();
};
  const startCountdown = () => {
  if (countdownRef.current) clearInterval(countdownRef.current);
  setCountdown(60);
  countdownRef.current = setInterval(() => {
    setCountdown((prev) => {
      if (prev <= 1) {
        clearInterval(countdownRef.current);
        triggerEmergencyResponse(); // ← Only call when timer reaches zero
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};

 const triggerEmergencyResponse = async () => {
  setShowAreYouOk(false);
  setEmergencyStatus('🚨 SENDING REAL WHATSAPP TO EMERGENCY CONTACTS...');
  console.log('🔄 STARTING REAL WHATSAPP EMERGENCY RESPONSE');
  await sendRealWhatsApp();
  
  // Restart voice detection after alerts are sent
  startVoiceDetection();  // ← ADD THIS LINE
};
   const cancelEmergency = () => {
  if (countdownRef.current) clearInterval(countdownRef.current);
  setAccidentDetected(false);
  setCountdown(60);
  setShowAreYouOk(false);
  setEmergencyStatus('✅ Emergency cancelled! No alerts were sent.');
  
  // Restart voice detection automatically
  startVoiceDetection();  // ← ADD THIS LINE
};

 const sendRealWhatsApp = async () => {
   try {
      const token = localStorage.getItem('emergency_token');
      console.log('🚨 Starting REAL WhatsApp emergency alerts...');
      const response = await fetch(`${backendUrl}/api/send-emergency-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ contacts: emergencyContacts, location: location })
      });
      if (!response.ok) {
        if (response.status === 401) { handleLogout(); throw new Error('Session expired. Please login again.'); }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('📱 Backend Response:', result);
      if (result.success) {
        const successful = result.results.filter(r => r.success).length;
        const resultsText = result.results.map(r => `• ${r.name} (${r.phone}) - ${r.success ? '✅ DELIVERED' : '❌ FAILED'}`).join('\n');
        setEmergencyStatus(`✅ REAL WHATSAPP ALERTS SENT!\n\n📱 ${successful}/${emergencyContacts.length} messages delivered\n⏰ ${new Date().toLocaleTimeString()}\n\nRESULTS:\n${resultsText}\n\nCheck your phones for REAL WhatsApp messages!`);
      } else {
        setEmergencyStatus(`❌ WhatsApp system error: ${result.error}\n\nPlease call emergency services manually!`);
      }
    } catch (error) {
      console.error('❌ WhatsApp sending failed:', error);
      setEmergencyStatus(`❌ Network error: ${error.message}\n\nMake sure:\n• Backend is running\n• Check browser console for details\n\nURGENT: Please call emergency services manually!\n• 1122/911\n• Contacts: ${emergencyContacts.map(c => c.phone).join(', ')}`);
    }
  };
  const simulateAccident = () => {
    if (!isLoggedIn) { setEmergencyStatus('⚠️ Please login to use emergency features.'); return; }
    console.log('🚨 SIMULATING ACCIDENT FOR TESTING');
    triggerAccidentDetection();
  };

  const testSMSNow = async () => {
    if (!isLoggedIn) { setEmergencyStatus('⚠️ Please login to test the alert system.'); return; }
    setEmergencyStatus('🧪 SENDING TEST WHATSAPP...');
    try {
      const token = localStorage.getItem('emergency_token');
      const response = await fetch(`${backendUrl}/api/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phoneNumber: '03206377143', name: 'Maryam Khalid' })
      });
      if (!response.ok) {
        if (response.status === 401) { handleLogout(); throw new Error('Session expired. Please login again.'); }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) setEmergencyStatus('✅ TEST WHATSAPP SENT! Check Maryam\'s phone for REAL message.');
      else setEmergencyStatus(`❌ Test failed: ${result.error}`);
    } catch (error) {
      console.error('Test error:', error);
      setEmergencyStatus(`❌ Test error: ${error.message}\n\nMake sure backend is running.`);
    }
  };
  
  const getDetailedLocation = () => {
    if (navigator.geolocation) {
      const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: new Date().toISOString() };
          setLocation(locationData);
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${locationData.latitude}&longitude=${locationData.longitude}&localityLanguage=en`);
            const data = await response.json();
            setLocation(prev => ({ ...prev, address: `${data.locality}, ${data.city}, ${data.countryName}` }));
          } catch (error) {
            setLocation(prev => ({ ...prev, address: `Coordinates: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}` }));
          }
        },
        (error) => { console.log('Location error:', error); getIPLocation(); },
        options
      );
    }
  };

  const getIPLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setLocation({ latitude: data.latitude, longitude: data.longitude, address: `${data.city}, ${data.region}, ${data.country_name}`, source: 'ip' });
    } catch (error) { console.log('IP location failed'); }
  };

  // ============================================
  // AUTHENTICATION FUNCTIONS
  // ============================================
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!registerData.name.trim()) {
      setAuthError('❌ Name is required');
      return;
    }
    if (!registerData.email.trim()) {
      setAuthError('❌ Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      setAuthError('❌ Please enter a valid email address');
      return;
    }
    if (!registerData.password) {
      setAuthError('❌ Password is required');
      return;
    }
    if (registerData.password.length < 8) {
      setAuthError('❌ Password must be at least 8 characters long');
      return;
    }
    if (!registerData.phone) {
      setAuthError('❌ Phone number is required');
      return;
    }
    const validation = validatePhoneNumber(registerData.phone);
    if (!validation.isValid) {
      setAuthError(validation.message);
      return;
    }

    setIsSubmitting(true);
    setAuthError('Sending verification code...');

    try {
      const response = await fetch(`${backendUrl}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerData.email, name: registerData.name })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTempRegisterData(registerData);
        setShowRegisterModal(false);
        setShowVerificationModal(true);
        setAuthError('');
      } else {
        setAuthError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      setAuthError('Network error. Please check if backend is running.');
    }
    
    setIsSubmitting(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!loginEmail.trim()) { setAuthError('❌ Email is required'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) { setAuthError('❌ Please enter a valid email address'); return; }
    if (!loginPassword) { setAuthError('❌ Password is required'); return; }
    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('emergency_token', data.token);
        localStorage.setItem('emergency_user', JSON.stringify(data.user));
        setIsLoggedIn(true);
        setUser(data.user);
        setShowLoginModal(false);
        setLoginEmail('');
        setLoginPassword('');
        setEmergencyStatus('✅ Login successful! Welcome back.');
        loadContactsFromBackend();
      } else setAuthError(data.error || 'Login failed');
    } catch (error) { setAuthError('Network error. Please check if backend is running.'); }
  };

  const handleLogout = () => {
  localStorage.removeItem('emergency_token');
  localStorage.removeItem('emergency_user');
  localStorage.removeItem('emergencyContacts'); // ← added
  setIsLoggedIn(false);
  setUser(null);
  setEmergencyContacts([]); // ← reset state
  setEmergencyStatus('✅ Logout successful.');
};
  const handleFeedback = () => { setShowFeedbackModal(true); setFeedbackMessage(''); setSubmissionStatus(''); };
  
  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) { setSubmissionStatus('❌ Please enter your feedback'); return; }
    setIsSubmitting(true);
    setSubmissionStatus('Submitting...');
    try {
      const token = localStorage.getItem('emergency_token');
      const response = await fetch(`${backendUrl}/api/feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: feedbackMessage, userEmail: user?.email || 'guest@example.com', userName: user?.name || 'Guest User' })
      });
      const data = await response.json();
      if (data.success) setSubmissionStatus('✅ Thank you for your valuable feedback! We have received it.');
      else setSubmissionStatus(`❌ ${data.error || 'Failed to submit feedback'}`);
    } catch (error) { setSubmissionStatus('❌ Network error. Please check if backend is running.'); }
    setIsSubmitting(false);
    setTimeout(() => { setShowFeedbackModal(false); setFeedbackMessage(''); setSubmissionStatus(''); }, 3000);
  };

  // ============================================
  // MODAL RENDERERS
  // ============================================
  
  const renderContactsModal = () => (
    showContactsModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,35,126,0.95), rgba(10,15,45,0.98))', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', border: '2px solid rgba(33,150,243,0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: 'white', marginBottom: '25px', textAlign: 'center', fontSize: '24px' }}>📞 Emergency Contacts</h3>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '25px', maxHeight: '300px', overflowY: 'auto' }}>
            {emergencyContacts.length === 0 ? ( <p style={{ color: '#a8b1ff', textAlign: 'center', fontSize: '14px' }}>No emergency contacts added yet</p> ) : (
              emergencyContacts.map((contact, index) => (
                <div key={index} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '15px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {editingContactIndex === index ? (
                    <div>
                      <input type="text" placeholder="Contact Name" value={editingContact.name} onChange={(e) => setEditingContact({...editingContact, name: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      <input type="tel" placeholder="Phone Number (03XXXXXXXXX - 11 digits)" value={editingContact.phone} onChange={(e) => setEditingContact({...editingContact, phone: e.target.value.replace(/[^0-9]/g, '')})} maxLength="11" style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleUpdateContact} style={{ flex: 1, padding: '8px', background: '#4caf50', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Save</button>
                        <button onClick={cancelEdit} style={{ flex: 1, padding: '8px', background: '#666', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>{contact.name}</div>
                        <div style={{ color: '#a8b1ff', fontSize: '14px' }}>📱 {contact.phone}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleEditContact(index)} style={{ padding: '6px 15px', background: '#ff9800', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Edit</button>
                        <button onClick={() => handleRemoveContact(index)} style={{ padding: '6px 15px', background: '#ff4444', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div style={{ background: 'rgba(33,150,243,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '25px', border: '1px solid rgba(33,150,243,0.2)' }}>
            <h4 style={{ color: '#bbdefb', margin: '0 0 15px 0', fontSize: '16px', textAlign: 'center' }}>Add New Contact</h4>
            <div style={{ marginBottom: '15px' }}>
              <input type="text" placeholder="Contact Name (must contain letters)" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', marginBottom: '10px' }} />
              <input type="tel" placeholder="Phone Number (03XXXXXXXXX - 11 digits)" value={newContact.phone} onChange={(e) => { const value = e.target.value.replace(/[^0-9]/g, ''); setNewContact({...newContact, phone: value}); setPhoneError(''); }} maxLength="11" style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: phoneError ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px' }} />
              {phoneError && <p style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '5px' }}>{phoneError}</p>}
              <p style={{ color: '#a8b1ff', fontSize: '12px', marginTop: '5px' }}>Format: 03XXXXXXXXX (11 digits, starts with 03)</p>
            </div>
            <button onClick={handleAddContact} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Add Contact</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><button onClick={() => setShowContactsModal(false)} style={{ padding: '12px 30px', background: 'linear-gradient(135deg, #2196f3, #1976d2)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button></div>
          <button onClick={() => setShowContactsModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#a8b1ff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    )
  );

  const renderFeedbackModal = () => (
    showFeedbackModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,35,126,0.95), rgba(10,15,45,0.98))', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '500px', border: '2px solid rgba(76,175,80,0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '24px' }}>💬 Send Feedback</h3>
          <p style={{ color: '#bbdefb', fontSize: '14px', marginBottom: '25px', textAlign: 'center', lineHeight: '1.5' }}>We value your feedback! Please share your thoughts, suggestions, or report any issues to help us improve RescueGuard Pro.</p>
          <div style={{ marginBottom: '25px' }}><textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder="Your feedback, suggestions, or issues..." rows="6" style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', resize: 'vertical', minHeight: '150px' }} /></div>
          {submissionStatus && <div style={{ background: submissionStatus.includes('✅') ? 'rgba(76,175,80,0.2)' : 'rgba(255,68,68,0.2)', border: submissionStatus.includes('✅') ? '1px solid #4caf50' : '1px solid #ff4444', color: submissionStatus.includes('✅') ? '#c8e6c9' : '#ffb3b3', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>{submissionStatus}</div>}
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button onClick={handleSubmitFeedback} disabled={isSubmitting} style={{ padding: '15px 30px', background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, minWidth: '150px' }}>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</button>
            <button onClick={() => { setShowFeedbackModal(false); setFeedbackMessage(''); setSubmissionStatus(''); }} style={{ padding: '15px 30px', background: 'transparent', color: '#a8b1ff', border: '1px solid rgba(168,177,255,0.3)', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', minWidth: '150px' }}>Cancel</button>
          </div>
          <button onClick={() => setShowFeedbackModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#a8b1ff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    )
  );
  const renderHelpModal = () => (
    showHelpModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,35,126,0.95), rgba(10,15,45,0.98))', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '600px', border: '2px solid rgba(255,152,0,0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto' }}>
          <h3 style={{ color: 'white', marginBottom: '25px', textAlign: 'center', fontSize: '24px' }}>❓ Help & User Guide</h3>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '25px', marginBottom: '25px' }}>
            <h4 style={{ color: '#ffcc80', margin: '0 0 15px 0', fontSize: '18px' }}>🚨 How to Use RescueGuard Pro</h4>
            <div style={{ marginBottom: '20px' }}><h5 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '16px' }}>1. Connect WhatsApp</h5><ul style={{ color: '#bbdefb', paddingLeft: '20px', margin: '0', fontSize: '14px', lineHeight: '1.6' }}><li>Click "Connect WhatsApp" at the top of the page</li><li>Open WhatsApp on your phone → Settings → Linked Devices</li><li>Scan the QR code to connect</li><li>Once connected, you can send real WhatsApp alerts</li></ul></div>
            <div style={{ marginBottom: '20px' }}><h5 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '16px' }}>2. Account Setup</h5><ul style={{ color: '#bbdefb', paddingLeft: '20px', margin: '0', fontSize: '14px', lineHeight: '1.6' }}><li>Use Login/Sign Up buttons at top right to create account</li><li>Register with your email and phone number (Pakistan format: 03XXXXXXXXX)</li><li>Add emergency contacts in your profile</li></ul></div>
            <div style={{ marginBottom: '20px' }}><h5 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '16px' }}>3. Testing the System</h5><ul style={{ color: '#bbdefb', paddingLeft: '20px', margin: '0', fontSize: '14px', lineHeight: '1.6' }}><li>Use "SIMULATE ACCIDENT" to test emergency response</li><li>Use "TEST ALERT SYSTEM" to verify WhatsApp integration</li><li>You have 60 seconds to cancel after simulation</li></ul></div>
          </div>
          <div style={{ background: 'rgba(255,152,0,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '25px', border: '1px solid rgba(255,152,0,0.3)' }}><h5 style={{ color: '#ffcc80', margin: '0 0 10px 0', fontSize: '16px' }}>⚠️ Important Notes</h5><ul style={{ color: '#ffe0b2', paddingLeft: '20px', margin: '0', fontSize: '14px', lineHeight: '1.6' }}><li>Phone numbers must be in Pakistan format: 03XXXXXXXXX (11 digits)</li><li>For real emergencies, always call emergency services first</li><li>WhatsApp must be connected via QR code for real alerts</li></ul></div>
          <button onClick={() => setShowHelpModal(false)} style={{ padding: '15px 40px', background: 'linear-gradient(135deg, #2196f3, #1976d2)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Got It!</button>
          <button onClick={() => setShowHelpModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#a8b1ff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    )
  );

  const renderVerificationModal = () => (
    showVerificationModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1003,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 35, 126, 0.95), rgba(10, 15, 45, 0.98))',
          padding: '40px',
          borderRadius: '20px',
          width: '90%',
          maxWidth: '400px',
          border: '2px solid rgba(37, 211, 102, 0.3)'
        }}>
          <h3 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>📧 Verify Your Email</h3>
          <p style={{ color: '#a8b1ff', textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>We sent a 6-digit verification code to:<br/><strong>{tempRegisterData?.email}</strong></p>
          <input type="text" placeholder="Enter 6-digit code" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6))} maxLength="6" style={{ width: '100%', padding: '15px', fontSize: '18px', textAlign: 'center', letterSpacing: '5px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', marginBottom: '20px' }} />
          {authError && <p style={{ color: '#ff6b6b', marginBottom: '15px', textAlign: 'center' }}>{authError}</p>}
          <button onClick={async () => {
              if (verificationCode.length !== 6) { setAuthError('❌ Please enter 6-digit verification code'); return; }
              setIsSubmitting(true);
              try {
                const response = await fetch(`${backendUrl}/api/auth/verify-and-register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...tempRegisterData, otp: verificationCode })
                });
                const data = await response.json();
                if (data.success) {
                  localStorage.setItem('emergency_token', data.token);
                  localStorage.setItem('emergency_user', JSON.stringify(data.user));
                  setIsLoggedIn(true);
                  setUser(data.user);
                  setShowVerificationModal(false);
                  setVerificationCode('');
                  setTempRegisterData(null);
                  setEmergencyStatus('✅ Registration successful! Welcome to RescueGuard Pro.');
                } else { setAuthError(data.error || 'Verification failed'); }
              } catch (error) { setAuthError('Network error. Please try again.'); }
              setIsSubmitting(false);
            }} disabled={isSubmitting} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>{isSubmitting ? 'Verifying...' : 'Verify & Register'}</button>
          <button onClick={() => { setShowVerificationModal(false); setVerificationCode(''); setTempRegisterData(null); setShowRegisterModal(true); }} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#a8b1ff', border: '1px solid rgba(168,177,255,0.3)', borderRadius: '10px', cursor: 'pointer' }}>Back to Register</button>
        </div>
      </div>
    )
  );

  const renderForgotPasswordModal = () => (
  showForgotPasswordModal && (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1003,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(26,35,126,0.95), rgba(10,15,45,0.98))',
        padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '400px'
      }}>
        <h3 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
          {passwordResetStep === 'email' ? 'Reset Password' : 'Enter Reset Code'}
        </h3>

        {passwordResetStep === 'email' ? (
          <>
            <p style={{ color: '#a8b1ff', marginBottom: '20px', textAlign: 'center' }}>
              Enter your email address to receive a reset code.
            </p>
            <input
              type="email"
              placeholder="Your Email Address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}
            />
            {authError && <p style={{ color: '#ff6b6b', marginBottom: '15px' }}>{authError}</p>}
            <button
              onClick={async () => {
                if (!resetEmail) { setAuthError('❌ Please enter your email'); return; }
                setIsSubmitting(true);
                try {
                  const response = await fetch(`${backendUrl}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmail })
                  });
                  const data = await response.json();
                  if (data.success) {
                    setAuthError('✅ Reset code sent! Check your email.');
                    setPasswordResetStep('otp');  // ← Move to OTP screen
                  } else {
                    setAuthError(data.error);
                  }
                } catch (error) {
                  setAuthError('Network error. Please try again.');
                }
                setIsSubmitting(false);
              }}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '10px' }}
            >
              Send Reset Code
            </button>
            <button
              onClick={() => {
                setShowForgotPasswordModal(false);
                setResetEmail('');
                setResetOtp('');
                setResetNewPassword('');
                setPasswordResetStep('email');
                setAuthError('');
              }}
              style={{ width: '100%', padding: '12px', background: 'transparent', color: '#a8b1ff', border: '1px solid rgba(168,177,255,0.3)', borderRadius: '10px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <p style={{ color: '#a8b1ff', marginBottom: '20px', textAlign: 'center' }}>
              Enter the 6-digit code sent to:<br/><strong>{resetEmail}</strong>
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={resetOtp}
              onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, '').slice(0,6))}
              maxLength="6"
              style={{ width: '100%', padding: '12px', textAlign: 'center', letterSpacing: '5px', borderRadius: '10px', marginBottom: '15px' }}
            />
            <input
              type="password"
              placeholder="New Password (min 8 characters)"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}
            />
            {authError && <p style={{ color: '#ff6b6b', marginBottom: '15px' }}>{authError}</p>}
            <button
              onClick={async () => {
                if (resetOtp.length !== 6) { setAuthError('❌ Please enter 6-digit code'); return; }
                if (resetNewPassword.length < 8) { setAuthError('❌ Password must be at least 8 characters'); return; }
                setIsSubmitting(true);
                try {
                  const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword: resetNewPassword })
                  });
                  const data = await response.json();
                  if (data.success) {
                    setAuthError('✅ Password reset successful! You can now login.');
                    setTimeout(() => {
                      setShowForgotPasswordModal(false);
                      setResetEmail('');
                      setResetOtp('');
                      setResetNewPassword('');
                      setPasswordResetStep('email');
                      setAuthError('');
                    }, 2000);
                  } else {
                    setAuthError(data.error);
                  }
                } catch (error) {
                  setAuthError('Network error. Please try again.');
                }
                setIsSubmitting(false);
              }}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '10px' }}
            >
              Reset Password
            </button>
            <button
              onClick={() => setPasswordResetStep('email')}
              style={{ width: '100%', padding: '12px', background: 'transparent', color: '#a8b1ff', border: '1px solid rgba(168,177,255,0.3)', borderRadius: '10px', cursor: 'pointer' }}
            >
              Back
            </button>
          </>
        )}
        <button
          onClick={() => {
            setShowForgotPasswordModal(false);
            setResetEmail('');
            setResetOtp('');
            setResetNewPassword('');
            setPasswordResetStep('email');
            setAuthError('');
          }}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#a8b1ff', fontSize: '24px', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
);
  const renderLoginModal = () => (
    showLoginModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1002, backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,35,126,0.95), rgba(10,15,45,0.98))', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '400px', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>Login to RescueGuard Pro</h3>
          {authError && <div style={{ background: 'rgba(255,68,68,0.2)', border: '1px solid #ff4444', color: '#ffb3b3', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{authError}</div>}
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={{ width: '100%', padding: '12px 15px', marginBottom: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px' }} required />
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input type={showLoginPassword ? "text" : "password"} placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', paddingRight: '45px' }} required />
              <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#a8b1ff', cursor: 'pointer', fontSize: '18px' }}>{showLoginPassword ? '👁️' : '🔒'}</button>
            </div>
            <button type="submit" style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #2196f3, #1976d2)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>Login</button>
            <button type="button" onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }} style={{ width: '100%', padding: '15px', background: 'transparent', color: '#a8b1ff', border: '1px solid rgba(168,177,255,0.3)', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginBottom: '10px' }}>Don't have an account? Register</button>
            <button type="button" onClick={() => { setShowLoginModal(false); setShowForgotPasswordModal(true); }} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#ff9800', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', marginBottom: '10px' }}>Forgot Password?</button>
            <button onClick={() => setShowLoginModal(false)} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          </form>
          <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#a8b1ff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    )
  );
  const renderRegisterModal = () => (
    showRegisterModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1002, backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,35,126,0.95), rgba(10,15,45,0.98))', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '400px', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>Create Account</h3>
          {authError && <div style={{ background: 'rgba(255,68,68,0.2)', border: '1px solid #ff4444', color: '#ffb3b3', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{authError}</div>}
          <form onSubmit={handleRegister}>
            <input type="text" placeholder="Full Name" value={registerData.name} onChange={(e) => setRegisterData({...registerData, name: e.target.value})} style={{ width: '100%', padding: '12px 15px', marginBottom: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px' }} required />
            <input type="email" placeholder="Email Address" value={registerData.email} onChange={(e) => setRegisterData({...registerData, email: e.target.value})} style={{ width: '100%', padding: '12px 15px', marginBottom: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px' }} required />
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <input type={showRegisterPassword ? "text" : "password"} placeholder="Password (Min. 8 characters)" value={registerData.password} onChange={(e) => setRegisterData({...registerData, password: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', paddingRight: '45px' }} required />
              <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#a8b1ff', cursor: 'pointer', fontSize: '18px' }}>{showRegisterPassword ? '👁️' : '🔒'}</button>
            </div>
            <input type="tel" placeholder="Phone Number (03XXXXXXXXX - 11 digits)" value={registerData.phone} onChange={(e) => { const value = e.target.value.replace(/[^0-9]/g, ''); setRegisterData({...registerData, phone: value}); }} maxLength="11" style={{ width: '100%', padding: '12px 15px', marginBottom: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px' }} required />
            <p style={{ color: '#a8b1ff', fontSize: '12px', marginTop: '-10px', marginBottom: '15px' }}>Format: 03XXXXXXXXX (Pakistan number, 11 digits)</p>
            <button type="submit" style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>Register</button>
            <button type="button" onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }} style={{ width: '100%', padding: '15px', background: 'transparent', color: '#a8b1ff', border: '1px solid rgba(168,177,255,0.3)', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>Already have an account? Login</button>
            <button onClick={() => setShowRegisterModal(false)} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}>Cancel</button>
          </form>
          <button onClick={() => setShowRegisterModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#a8b1ff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    )
  );

  const renderCustomerSupportModal = () => (
    showCustomerSupportModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, backdropFilter: 'blur(10px)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,35,126,0.95), rgba(10,15,45,0.98))', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '500px', border: '2px solid rgba(33,150,243,0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '24px' }}>📞 Customer Support</h3>
          <p style={{ color: '#bbdefb', fontSize: '14px', marginBottom: '25px', textAlign: 'center', lineHeight: '1.5' }}>Need help? Our support team is available 24/7. Describe your issue below and we'll get back to you within 24 hours.</p>
          <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', color: '#a8b1ff', fontSize: '14px', marginBottom: '8px' }}>Your Email</label><input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="Enter your email address" style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px' }} /></div>
          <div style={{ marginBottom: '25px' }}><label style={{ display: 'block', color: '#a8b1ff', fontSize: '14px', marginBottom: '8px' }}>Support Message</label><textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Describe your issue or question..." rows="5" style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', resize: 'vertical', minHeight: '120px' }} /></div>
          {submissionStatus && <div style={{ background: submissionStatus.includes('✅') ? 'rgba(76,175,80,0.2)' : 'rgba(255,68,68,0.2)', border: submissionStatus.includes('✅') ? '1px solid #4caf50' : '1px solid #ff4444', color: submissionStatus.includes('✅') ? '#c8e6c9' : '#ffb3b3', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>{submissionStatus}</div>}
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button onClick={async () => { if (!supportMessage.trim()) { setSubmissionStatus('❌ Please enter your message'); return; } if (!supportEmail.trim()) { setSubmissionStatus('❌ Please enter your email address'); return; } setIsSubmitting(true); setSubmissionStatus('Sending...'); try { const token = localStorage.getItem('emergency_token'); const response = await fetch(`${backendUrl}/api/customer-support`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ email: supportEmail, message: supportMessage, name: user?.name || 'Customer' }) }); const data = await response.json(); if (data.success) { setSubmissionStatus('✅ Support request sent successfully! Our team will contact you within 24 hours.'); setTimeout(() => { setShowCustomerSupportModal(false); setSupportMessage(''); setSupportEmail(''); setSubmissionStatus(''); }, 3000); } else { setSubmissionStatus(`❌ ${data.error || 'Failed to send'}`); } } catch (error) { console.error('Support error:', error); setSubmissionStatus('❌ Network error. Please check if backend is running.'); } setIsSubmitting(false); }} disabled={isSubmitting} style={{ padding: '15px 30px', background: 'linear-gradient(135deg, #2196f3, #1976d2)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, minWidth: '150px' }}>{isSubmitting ? 'Sending...' : 'Send Message'}</button>
            <button onClick={() => { setShowCustomerSupportModal(false); setSupportMessage(''); setSubmissionStatus(''); }} style={{ padding: '15px 30px', background: 'transparent', color: '#a8b1ff', border: '1px solid rgba(168,177,255,0.3)', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', minWidth: '150px' }}>Cancel</button>
          </div>
          <button onClick={() => setShowCustomerSupportModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#a8b1ff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    )
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div style={{ 
      padding: '0',
      fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
      textAlign: 'center',
      maxWidth: '100%',
      margin: '0 auto',
      minHeight: '100vh',
      color: '#ffffff',
      background: '#160c0c',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat'
    }}>
      
      {/* Render Modals */}
      {renderContactsModal()}
      {renderFeedbackModal()}
      {renderHelpModal()}
      {renderVerificationModal()}
      {renderForgotPasswordModal()}
      {renderLoginModal()}
      {renderRegisterModal()}
      {renderCustomerSupportModal()}

      {/* Backend Status Indicator */}
      {!backendReady && (
        <div style={{
          background: 'rgba(255, 68, 68, 0.9)',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ⚠️ Connecting to backend... Make sure backend is running on port 5000-5005
        </div>
      )}

      {/* Header - Professional Design */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(15px)',
        padding: '20px 30px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          
          {/* Logo and Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #ff4444, #cc0000)',
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px'
            }}>
              🚨
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'white' }}>RescueGuard Pro</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a8b1ff' }}>AI-Powered Emergency Response</p>
            </div>
          </div>

          {/* WhatsApp + Auto Detection Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            
            {/* WhatsApp Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: whatsappConnected ? 'rgba(37, 211, 102, 0.15)' : 'rgba(37, 211, 102, 0.1)',
              padding: '6px 15px',
              borderRadius: '30px',
              border: `1px solid ${whatsappConnected ? '#25D366' : 'rgba(37, 211, 102, 0.3)'}`
            }}>
              <span style={{ fontSize: '16px' }}>💚</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: whatsappConnected ? '#c8e6c9' : '#a8b1ff' }}>{whatsappStatus}</span>
              {!whatsappConnected && !whatsappQRCode && (
                <button onClick={connectWhatsApp} disabled={!backendReady} style={{
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  color: 'white',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: backendReady ? 'pointer' : 'not-allowed',
                  opacity: backendReady ? 1 : 0.5
                }}>Connect</button>
              )}
              {whatsappQRCode && <img src={whatsappQRCode} alt="QR" style={{ width: '120px', height: '120px', borderRadius: '8px' }} />}
              
            </div>

            {/* Auto Detection Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: (isVoiceActive || isMotionActive) ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.08)',
              padding: '6px 15px',
              borderRadius: '30px',
              border: `1px solid ${(isVoiceActive || isMotionActive) ? '#ff9800' : 'rgba(255, 152, 0, 0.3)'}`
            }}>
              <span style={{ fontSize: '16px' }}>🚨</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: isVoiceActive ? '#4caf50' : '#888' }}>🎤 {isVoiceActive ? 'ON' : 'OFF'}</span>
                <span style={{ fontSize: '11px', color: isMotionActive ? '#4caf50' : '#888' }}>📱 {isMotionActive ? 'ON' : 'OFF'}</span>
              </div>
              <button onClick={startFullAutomaticDetection} style={{
                background: 'linear-gradient(135deg, #ff9800, #f57c00)',
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>Start</button>
              <button onClick={stopAllDetections} style={{
                background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>Stop</button>
            </div>

          </div>

          {/* Login/Signup Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {!isLoggedIn ? (
              <>
                <button onClick={() => setShowLoginModal(true)} style={{
                  background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 22px',
                  borderRadius: '25px', 
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)'
                }}>Login</button>
                <button onClick={() => setShowRegisterModal(true)} style={{
                  background: 'transparent',
                  color: '#2196f3',
                  border: '1px solid #2196f3',
                  padding: '8px 22px',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>Sign Up</button>
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '5px 12px 5px 8px',
                borderRadius: '30px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{user?.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1000px',
        margin: '40px auto',
        padding: '0 25px'
      }}>
        {isLoggedIn && user && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '15px 20px',
            marginBottom: '20px',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#bbdefb', fontSize: '14px' }}>Welcome back, <strong style={{color: 'white'}}>{user.name}</strong>! Emergency system is {accidentDetected ? 'in alert mode' : 'ready'}. {!accidentDetected && ' You can test the system below.'}</p>
          </div>
        )}

        {!isLoggedIn && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 87, 34, 0.15))',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '20px',
            border: '2px solid rgba(255, 152, 0, 0.4)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffcc80', fontSize: '18px' }}>⚠️ Login Required</h3>
            <p style={{ margin: '0', color: '#ffcc80', fontSize: '14px' }}>Please login or register to use all emergency features including accident simulation, alert testing, and emergency contact management.</p>
          </div>
        )}

        {/* Emergency Action Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          padding: '40px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h2 style={{ margin: '0 0 25px 0', fontSize: '26px', fontWeight: '700', color: '#ffffff', textAlign: 'center' }}>Emergency Response Dashboard</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(255,68,68,0.15), rgba(211,47,47,0.1))', border: '2px solid rgba(255,68,68,0.3)', borderRadius: '20px', padding: '25px', textAlign: 'center', opacity: isLoggedIn ? 1 : 0.6 }}>
              <button onClick={simulateAccident} disabled={!isLoggedIn} style={{ background: 'linear-gradient(135deg, #ff4444, #d32f2f)', color: 'white', padding: '20px 35px', border: 'none', borderRadius: '15px', cursor: isLoggedIn ? 'pointer' : 'not-allowed', fontSize: '18px', fontWeight: '700', width: '100%', boxShadow: '0 8px 30px rgba(255,68,68,0.5)', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: isLoggedIn ? 1 : 0.6 }} onMouseOver={(e) => { if (isLoggedIn) { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 12px 40px rgba(255,68,68,0.7)'; } }} onMouseOut={(e) => { if (isLoggedIn) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 30px rgba(255,68,68,0.5)'; } }}><span style={{ fontSize: '24px' }}>🚨</span> SIMULATE ACCIDENT</button>
              <p style={{ margin: '15px 0 0 0', color: isLoggedIn ? '#ffb3b3' : '#888', fontSize: '14px', fontWeight: '500' }}>{isLoggedIn ? 'Test the emergency response system' : 'Login required to use this feature'}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(33,150,243,0.15), rgba(21,101,192,0.1))', border: '2px solid rgba(33,150,243,0.3)', borderRadius: '20px', padding: '25px', textAlign: 'center', opacity: isLoggedIn ? 1 : 0.6 }}>
              <button onClick={testSMSNow} disabled={!isLoggedIn} style={{ background: 'linear-gradient(135deg, #2196f3, #1976d2)', color: 'white', padding: '18px 30px', border: 'none', borderRadius: '15px', cursor: isLoggedIn ? 'pointer' : 'not-allowed', fontSize: '16px', fontWeight: '700', width: '100%', boxShadow: '0 8px 30px rgba(33,150,243,0.5)', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: isLoggedIn ? 1 : 0.6 }} onMouseOver={(e) => { if (isLoggedIn) { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxleShadow = '0 12px 40px rgba(33,150,243,0.7)'; } }} onMouseOut={(e) => { if (isLoggedIn) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 30px rgba(33,150,243,0.5)'; } }}><span style={{ fontSize: '22px' }}>📱</span>TEST ALERT SYSTEM</button>
              <p style={{ margin: '15px 0 0 0', color: isLoggedIn ? '#bbdefb' : '#888', fontSize: '14px', fontWeight: '500' }}>{isLoggedIn ? 'Verify WhatsApp integration' : 'Login required to use this feature'}</p>
            </div>
          </div>
          {emergencyStatus && <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '15px', padding: '20px', marginTop: '20px', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'pre-line', textAlign: 'left' }}><p style={{ margin: '0', color: '#ffffff', fontSize: '14px', lineHeight: '1.6', fontWeight: '500' }}>{emergencyStatus}</p></div>}
          {showAreYouOk && <div style={{ background: 'linear-gradient(135deg, rgba(255,152,0,0.2), rgba(255,87,34,0.15))', borderRadius: '15px', padding: '25px', marginTop: '20px', border: '2px solid rgba(255,152,0,0.4)' }}><h3 style={{ margin: '0 0 15px 0', color: '#ffcc80', fontSize: '20px', fontWeight: '600' }}>⚠️ ARE YOU OK?</h3><p style={{ margin: '0 0 20px 0', color: '#ffcc80', fontSize: '16px' }}>Emergency alerts will be sent in: <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4444', marginLeft: '10px' }}>{countdown}s</span></p><button onClick={cancelEmergency} style={{ background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: 'white', padding: '12px 30px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', boxShadow: '0 6px 20px rgba(76,175,80,0.4)' }}>✅ I'M OK - CANCEL ALERT</button></div>}
        </div>

        {/* Status and Information Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '30px' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '30px', border: `2px solid ${accidentDetected ? '#ff4444' : isLoggedIn ? '#4caf50' : '#ff9800'}`, boxShadow: '0 15px 35px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: accidentDetected ? 'linear-gradient(135deg,#ff4444,#d32f2f)' : isLoggedIn ? 'linear-gradient(135deg,#4caf50,#388e3c)' : 'linear-gradient(135deg,#ff9800,#f57c00)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: accidentDetected ? '0 6px 20px rgba(255,68,68,0.4)' : isLoggedIn ? '0 6px 20px rgba(76,175,80,0.4)' : '0 6px 20px rgba(255,152,0,0.4)' }}>{accidentDetected ? '🚨' : isLoggedIn ? '✅' : '⚠️'}</div>
              <div style={{ textAlign: 'left' }}><h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#ffffff' }}>System Status</h3><p style={{ margin: '5px 0 0 0', color: accidentDetected ? '#ffb3b3' : isLoggedIn ? '#c8e6c9' : '#ffe0b2', fontSize: '14px', fontWeight: '500' }}>{accidentDetected ? 'Emergency Mode Active' : isLoggedIn ? 'All Systems Operational' : 'Login Required'}</p></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px', marginTop: '15px' }}><p style={{ margin: '0', color: '#a8b1ff', fontSize: '13px', lineHeight: '1.5' }}>{accidentDetected ? 'Emergency protocol activated. Monitoring situation and ready to dispatch alerts.' : isLoggedIn ? 'System actively monitoring for accidents. GPS and WhatsApp integration ready.' : 'Please login to access all emergency features and save your emergency contacts.'}</p></div>
          </div>
          {location && (
          <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '30px', border: '1px solid rgba(33,150,243,0.3)', boxShadow: '0 15px 35px rgba(0,0,0,0.3)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: 'linear-gradient(135deg,#9c27b0,#7b1fa2)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 6px 20px rgba(156,39,176,0.4)' }}>📍</div>
                <div style={{ textAlign: 'left' }}><h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#ffffff' }}>Current Location</h3><p style={{ margin: '5px 0 0 0', color: '#e1bee7', fontSize: '14px', fontWeight: '500' }}>{location.source === 'ip' ? 'Approximate' : 'GPS'} Location</p></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px', marginTop: '15px' }}><p style={{ margin: '0', color: '#d1c4e9', fontSize: '14px', lineHeight: '1.5' }}>{location.address}</p>{location.latitude && <p style={{ margin: '10px 0 0 0', color: '#b39ddb', fontSize: '12px' }}>Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>}</div>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '30px', border: '2px solid rgba(156,39,176,0.3)', boxShadow: '0 15px 35px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: 'linear-gradient(135deg,#ff9800,#f57c00)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 6px 20px rgba(255,152,0,0.4)' }}>📋</div>
              <div style={{ textAlign: 'left' }}><h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#ffffff' }}>Emergency Contacts</h3><p style={{ margin: '5px 0 0 0', color: '#ffe0b2', fontSize: '14px', fontWeight: '500' }}>{emergencyContacts.length} contact{emergencyContacts.length !== 1 ? 's' : ''} configured</p></div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
              {emergencyContacts.slice(0,2).map((contact, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: index === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <div><div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{contact.name}</div><div style={{ color: '#a8b1ff', fontSize: '12px' }}>{contact.phone}</div></div>
                </div>
              ))}
              {emergencyContacts.length > 2 && <div style={{ color: '#ffcc80', fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>+ {emergencyContacts.length - 2} more contact{emergencyContacts.length - 2 !== 1 ? 's' : ''}</div>}
            </div>
            <button onClick={openContactsModal} disabled={!isLoggedIn} style={{ width: '100%', padding: '12px', background: isLoggedIn ? 'linear-gradient(135deg, #ff9800, #f57c00)' : 'rgba(255,152,0,0.3)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: isLoggedIn ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span>📝</span>{isLoggedIn ? 'Manage Contacts' : 'Login Required'}</button>
          </div>
        </div>

        {/* BOTTOM SECTION: Logout, Help, Feedback, Support buttons */}
        {isLoggedIn && (
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '25px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>Account & Support Options</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <button onClick={handleLogout} style={{ background: 'linear-gradient(135deg, #ff4444, #d32f2f)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(255,68,68,0.3)' }} onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 25px rgba(255,68,68,0.5)'; }} onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(255,68,68,0.3)'; }}><span>🚪</span> Logout</button>
              <button onClick={() => setShowHelpModal(true)} style={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(255,152,0,0.3)' }} onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 25px rgba(255,152,0,0.5)'; }} onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(255,152,0,0.3)'; }}><span>❓</span> Help & Guide</button>
              <button onClick={handleFeedback} style={{ background: 'linear-gradient(135deg, #9c27b0, #7b1fa2)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(156,39,176,0.3)' }} onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 25px rgba(156,39,176,0.5)'; }} onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(156,39,176,0.3)'; }}><span>💬</span> Send Feedback</button>
              <button onClick={() => setShowCustomerSupportModal(true)} style={{ background: 'linear-gradient(135deg, #2196f3, #1976d2)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(33,150,243,0.3)' }} onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 25px rgba(33,150,243,0.5)'; }} onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(33,150,243,0.3)'; }}><span>📞</span> Customer Support</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#a8b1ff', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '30px', background: 'rgba(0,0,0,0.2)' }}>
          <p style={{ margin: '0 0 10px 0', color: '#a8b1ff', fontSize: '14px' }}>RescueGuard Pro v2.0 • Emergency Response System • {isLoggedIn ? `User: ${user?.email}` : 'Guest Mode'}</p>
          <p style={{ margin: '5px 0 0 0' }}>WhatsApp Integration: {whatsappConnected ? 'Connected ✓' : 'Not Connected'} | {isLoggedIn ? 'Logged In' : 'Guest Mode'} | Backend: {backendUrl}</p>
        </div>
      </div>
    </div>
  );
};

export default EmergencyApp;

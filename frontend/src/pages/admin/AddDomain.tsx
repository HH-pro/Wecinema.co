import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './DomainManager.css';

interface Domain {
  _id: string;
  domain: {
    name: string;
    date: string;
  };
  hosting: {
    name: string;
    date: string;
  };
}

const API_ENDPOINTS = {
  DOMAINS: {
    GET_ALL: 'https://wecinema.co/api/domain/domains',
    CREATE: 'https://wecinema.co/api/domain/save-domain',
    UPDATE: (id: string) => `https://wecinema.co/api/domain/domain/${id}`,
    DELETE: (id: string) => `https://wecinema.co/api/domain/domain/${id}`
  },
  WHATSAPP: {
    SEND: 'https://wecinema.co/api/domain/send-test-message'
  }
};

const DomainManager: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    hostingName: '',
    hostingDate: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+923117836704');
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  // New bot state
  const [showBotMessage, setShowBotMessage] = useState(false);
  const [botResponse, setBotResponse] = useState("");
  const [sendStatus, setSendStatus] = useState<{
    type: 'success' | 'error' | null,
    message: string
  }>({ type: null, message: '' });

  const fetchDomains = async () => {
    try {
      const response = await axios.get<Domain[]>(API_ENDPOINTS.DOMAINS.GET_ALL);
      setDomains(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch domains');
      console.error(err);
    }
  };

  const saveDomain = async (domainData: Omit<Domain, '_id'>) => {
    const url = editing?._id 
      ? API_ENDPOINTS.DOMAINS.UPDATE(editing._id)
      : API_ENDPOINTS.DOMAINS.CREATE;
    
    const method = editing?._id ? 'put' : 'post';
    
    try {
      const response = await axios[method](url, {
        domain: {
          name: formData.name,
          date: formData.date
        },
        hosting: {
          name: formData.hostingName,
          date: formData.hostingDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  };

  // AI Bot functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBotMessage(true);
      setBotResponse("🤖 Hi! I'm your Domain Manager AI. I can help you track and notify about expiring domains.");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const BotMessage = () => (
    <div className="bot-message">
      <div className="bot-avatar">
        <div className="bot-pulse"></div>
        <i className="fas fa-robot"></i>
      </div>
      <div className="bot-text">
        <div className="bot-triangle"></div>
        <p>{botResponse}</p>
      </div>
    </div>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDaysRemaining = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sendWhatsAppMessage = async () => {
    if (!phoneNumber.trim()) {
      setSendStatus({
        type: 'error',
        message: 'Please enter a valid phone number'
      });
      return;
    }
  
    if (!selectedDomain) {
      setSendStatus({
        type: 'error',
        message: 'Please select a domain first'
      });
      return;
    }
  
    try {
      const domainExpiry = formatDate(selectedDomain.domain.date);
      const hostingExpiry = formatDate(selectedDomain.hosting.date);
      const domainDaysLeft = calculateDaysRemaining(selectedDomain.domain.date);
      const hostingDaysLeft = calculateDaysRemaining(selectedDomain.hosting.date);
  
      const alertMessage = `🔔 *Domain Expiration Alert* 🔔

🌐 *Domain Name:* ${selectedDomain.domain.name}
⏳ *Domain Expiry:* ${domainExpiry} (${domainDaysLeft} days remaining)

🖥️ *Hosting Provider:* ${selectedDomain.hosting.name}
📅 *Hosting Expiry:* ${hostingExpiry} (${hostingDaysLeft} days remaining)

${customMessage.trim() ? `💬 *Message from Wecinema Admin:*\n${customMessage}` : ''}

⚠️ Please renew your services before the expiration date to avoid any disruption. 🚫`;

  
      console.log('Sending WhatsApp message:', {  // Add this for debugging
        number: alertMessage,
        message: alertMessage
      });
  
      const response = await axios.post(API_ENDPOINTS.WHATSAPP.SEND, {
        number: alertMessage,
        message: alertMessage
      });
  
      console.log('WhatsApp API response:', response.data); // Log the response
  
      setSendStatus({
        type: 'success',
        message: `Alert sent to ${phoneNumber}`
      });
      setCustomMessage('');
    } catch (error) {
      console.error('WhatsApp send error:', error.response || error);
      setSendStatus({
        type: 'error',
        message: 'Failed to send alert: ' + (error.response?.data?.error || error.message)
      });
    }
  
    setTimeout(() => setSendStatus({ type: null, message: '' }), 5000);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveDomain({
        domain: {
          name: formData.name,
          date: formData.date
        },
        hosting: {
          name: formData.hostingName,
          date: formData.hostingDate
        }
      });
      resetForm();
      await fetchDomains();
    } catch (error) {
      alert('Operation failed');
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      name: '',
      date: '',
      hostingName: '',
      hostingDate: ''
    });
  };

  const startEdit = (domain: Domain) => {
    setEditing(domain);
    setFormData({
      name: domain.domain.name,
      date: domain.domain.date.split('T')[0],
      hostingName: domain.hosting.name,
      hostingDate: domain.hosting.date.split('T')[0]
    });
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  return (
    <div className="domain-manager-container">
      <div className="bot-container">
        {showBotMessage && <BotMessage />}
      </div>
      <div className="domain-manager-card">
        <h2 className="domain-manager-title">
          <i className="fas fa-server"></i>
          Domain & Hosting Manager
        </h2>

        {editing !== null && (
          <div className="domain-form-container">
            <form onSubmit={handleSubmit}>
              <h3>
                <i className="fas fa-edit"></i>
                {editing._id ? 'Edit Domain' : 'Add New Domain'}
              </h3>
              
              <div className="form-group">
                <label>Domain Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Expiration Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Hosting Provider</label>
                <input
                  type="text"
                  name="hostingName"
                  value={formData.hostingName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Hosting Expiration</label>
                <input
                  type="date"
                  name="hostingDate"
                  value={formData.hostingDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  <i className="fas fa-save"></i> Save
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="domain-list-container">
          <div className="list-header">
            <h3>
              <i className="fas fa-list"></i>
              Managed Services ({domains.length})
            </h3>
          </div>
          
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}
          
          {domains.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-cloud"></i>
              <p>No domains found</p>
            </div>
          ) : (
            <div className="domain-list">
              {domains.map(domain => (
                <div 
                  key={domain._id} 
                  className={`domain-item ${selectedDomain?._id === domain._id ? 'selected' : ''}`}
                  onClick={() => setSelectedDomain(domain)}
                >
                  <div className="domain-info">
                    <div className="domain-header">
                      <span className="domain-name">
                        <i className="fas fa-globe"></i>
                        {domain.domain.name}
                      </span>
                      {/* <span className={`days-remaining ${calculateDaysRemaining(domain.domain.date) <= 30 ? 'warning' : ''}`}>
                        {calculateDaysRemaining(domain.domain.date)} days
                      </span> */}
                    </div>
                    
                    <div className="domain-dates">
                      <div>
                        <i className="far fa-calendar-alt"></i>
                         <strong>Domain:</strong> {domain.domain.name} - {formatDate(domain.domain.date)}
                      </div>
                      <div>
                        <i className="fas fa-server"></i>
                        <strong>Hosting:</strong> {domain.hosting.name} - {formatDate(domain.hosting.date)}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(domain);
                    }}
                    className="edit-button"
                  >
                    <i className="fas fa-pencil-alt"></i> Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="whatsapp-section">
            <h3>
              <i className="fab fa-whatsapp"></i>
              Send Domain Expiry Alert
            </h3>
            
            <div className="form-row">
              {/* <div className="form-group">
                <label>Recipient Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                />
              </div> */}
              
             
            </div>

            {selectedDomain && (
              <div className="selected-domain-info">
                <h4>Selected Domain Details</h4>
                <div className="domain-details">
                  <p><strong>Domain:</strong> {selectedDomain.domain.name}</p>
                  <p><strong>Expires:</strong> {formatDate(selectedDomain.domain.date)} 
                    ({calculateDaysRemaining(selectedDomain.domain.date)} days remaining)</p>
                  <p><strong>Hosting:</strong> {selectedDomain.hosting.name}</p>
                  <p><strong>Expires:</strong> {formatDate(selectedDomain.hosting.date)} 
                    ({calculateDaysRemaining(selectedDomain.hosting.date)} days remaining)</p>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Custom Alert Message</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter additional message for the recipient..."
                rows={3}
              />
            </div>

            {sendStatus.type && (
              <div className={`status-message ${sendStatus.type}`}>
                <i className={`fas ${sendStatus.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                {sendStatus.message}
              </div>
            )}

            <button 
              onClick={sendWhatsAppMessage}
              className="btn-primary whatsapp-btn"
              disabled={!selectedDomain}
            >
              <i className="fab fa-whatsapp"></i> 
              {selectedDomain ? 'Send Expiry Alert' : 'Select a domain first'}
            </button>

            <div className="message-preview">
              <h4>Message Preview:</h4>
              <div className="preview-content">
                {selectedDomain ? (
                  <>
                    <p>🔔 <strong>Domain Expiration Alert</strong> 🔔</p>
                    <p><strong>Domain Name:</strong> {selectedDomain.domain.name}</p>
                    <p><strong>Domain Expiry:</strong> {formatDate(selectedDomain.domain.date)} 
                      ({calculateDaysRemaining(selectedDomain.domain.date)} days remaining)</p>
                    <p><strong>Hosting Provider:</strong> {selectedDomain.hosting.name}</p>
                    <p><strong>Hosting Expiry:</strong> {formatDate(selectedDomain.hosting.date)} 
                      ({calculateDaysRemaining(selectedDomain.hosting.date)} days remaining)</p>
                    {customMessage.trim() && (
                      <>
                        <p><strong>Message from Admin:</strong></p>
                        <p>{customMessage}</p>
                      </>
                    )}
                  </>
                ) : (
                  <p>No domain selected - select a domain to see preview</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainManager;
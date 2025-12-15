import React from 'react';
import { FaClock, FaUser, FaCheckCircle, FaTruck, FaReply, FaTimes, FaExclamationTriangle, FaCreditCard, FaSpinner } from 'react-icons/fa';
import './BuyerDashboard.css';

interface TimelineEvent {
  _id: string;
  eventType: string;
  eventData: any;
  performedBy: any;
  createdAt: string;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const OrderTimeline: React.FC<OrderTimelineProps> = ({ events, loading }) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'order_created': return <FaCheckCircle />;
      case 'payment_pending': return <FaCreditCard />;
      case 'payment_completed': return <FaCreditCard />;
      case 'processing_started': return <FaClock />;
      case 'work_started': return <FaUser />;
      case 'order_delivered': return <FaTruck />;
      case 'revision_requested': return <FaReply />;
      case 'revision_completed': return <FaCheckCircle />;
      case 'order_completed': return <FaCheckCircle />;
      case 'order_cancelled': return <FaTimes />;
      case 'dispute_opened': return <FaExclamationTriangle />;
      default: return <FaClock />;
    }
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('completed')) return '#27ae60';
    if (eventType.includes('cancelled') || eventType.includes('dispute')) return '#e74c3c';
    if (eventType.includes('revision')) return '#f39c12';
    if (eventType.includes('delivered')) return '#3498db';
    if (eventType.includes('payment')) return '#9b59b6';
    return '#95a5a6';
  };

  const getEventTitle = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPerformerName = (performedBy: any) => {
    if (!performedBy) return 'System';
    if (typeof performedBy === 'object') {
      return performedBy.username || performedBy.firstName || performedBy.email || 'User';
    }
    return 'User';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="timeline-loading">
        <FaSpinner className="loading-spinner" />
        <p>Loading timeline...</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="no-timeline">
        <FaClock className="no-timeline-icon" />
        <p>No timeline events available</p>
      </div>
    );
  }

  return (
    <div className="order-timeline">
      <div className="timeline-container">
        {events.map((event, index) => (
          <div key={event._id || index} className="timeline-event">
            <div 
              className="timeline-event-marker" 
              style={{ backgroundColor: getEventColor(event.eventType) }}
            >
              {getEventIcon(event.eventType)}
            </div>
            
            <div className="timeline-event-content">
              <div className="timeline-event-header">
                <h4 className="event-title">{getEventTitle(event.eventType)}</h4>
                <span className="event-time">{formatDateTime(event.createdAt)}</span>
              </div>
              
              <div className="timeline-event-body">
                <p className="event-performer">
                  Performed by: <strong>{getPerformerName(event.performedBy)}</strong>
                </p>
                
                {event.eventData && Object.keys(event.eventData).length > 0 && (
                  <div className="event-data">
                    {Object.entries(event.eventData).map(([key, value]) => (
                      <div key={key} className="event-data-item">
                        <strong>{key.replace(/_/g, ' ')}:</strong>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTimeline;
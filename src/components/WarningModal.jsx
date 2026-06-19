import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './WarningModal.css';

const WarningModal = ({ isOpen, onClose, title = "WARNING", message, countdown = 0 }) => {
  const [timeLeft, setTimeLeft] = useState(countdown);

  useEffect(() => {
    // Sync external countdown state
    setTimeLeft(countdown);
  }, [countdown]);

  useEffect(() => {
    let timer;
    if (isOpen && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Optionally auto-close or allow user to close, depends on logic outside
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  // Process message to inject dynamic timer and split by line breaks for rendering
  const renderMessage = () => {
    if (!message) return null;
    let finalMessage = message;
    if (timeLeft > 0) {
      // Replace dynamic tokens if needed, but since we know the specific string, 
      finalMessage = finalMessage.replace('{time}', `${timeLeft} detik`);
    } else {
      // If time is 0 but it had a time token, maybe text should change?
      // Revert if time is 0 and it was a countdown modal
      finalMessage = finalMessage.replace('{time}', `0 detik`);
    }

    return finalMessage.split('\n').map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div className="warning-modal-overlay">
      <div className="warning-modal-content">
        {/* Optional close icon on top right */}
        <button className="warning-modal-close" onClick={onClose}>
            <X size={20} />
        </button>

        <div className="warning-modal-icon-container">
          <div className="warning-modal-icon-background">
            <AlertTriangle size={32} color="red" fill="white" className="warning-modal-icon" />
          </div>
        </div>

        <h2 className="warning-modal-title">{title}</h2>
        <p className="warning-modal-message">
          {renderMessage()}
        </p>

        <button className="warning-modal-button" onClick={onClose}>
          Back
        </button>
      </div>
    </div>
  );
};

export default WarningModal;

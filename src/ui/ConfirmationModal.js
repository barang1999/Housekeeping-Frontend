import React from 'react';
import './ConfirmationModal.css';
import { useTranslation } from '../i18n/LanguageProvider';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onConfirm} className="confirm-button">{t('confirmation.confirm', 'Confirm')}</button>
          <button onClick={onClose} className="cancel-button">{t('confirmation.cancel', 'Cancel')}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

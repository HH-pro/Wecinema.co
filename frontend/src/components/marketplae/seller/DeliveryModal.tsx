// src/components/marketplace/seller/DeliveryModal.tsx
import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    _id: string;
    orderNumber: string;
    listingId: {
      title: string;
    };
    buyerId: {
      username: string;
    };
    revisions?: number;
    maxRevisions?: number;
    notes?: string;
  };
  onDeliver: (deliveryData: {
    orderId: string;
    message: string;
    attachments: File[];
    isFinal: boolean;
    revisionsLeft?: number;
  }) => Promise<void>;
  isLoading?: boolean;
  validateFile?: (file: File) => string | null;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({
  isOpen,
  onClose,
  order,
  onDeliver,
  isLoading = false,
  validateFile
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isFinalDelivery, setIsFinalDelivery] = useState(true);
  const [errors, setErrors] = useState<{
    message?: string;
    attachments?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // ✅ Validate each file before adding
      const validFiles: File[] = [];
      const validationErrors: string[] = [];
      
      files.forEach(file => {
        // Use custom validation function if provided
        if (validateFile) {
          const error = validateFile(file);
          if (error) {
            validationErrors.push(error);
          } else {
            validFiles.push(file);
          }
        } else {
          // Fallback to default validation
          const validTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime', 'video/x-msvideo',
            'application/pdf', 'application/zip', 'application/x-rar-compressed',
            'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/mpeg', 'audio/wav', 'audio/ogg'
          ];
          
          const maxSize = 100 * 1024 * 1024; // 100MB
          
          if (!validTypes.includes(file.type)) {
            validationErrors.push(`File type not supported: ${file.name}`);
            return;
          }
          
          if (file.size > maxSize) {
            validationErrors.push(`File too large (max 100MB): ${file.name}`);
            return;
          }
          
          validFiles.push(file);
        }
      });
      
      // Show validation errors
      if (validationErrors.length > 0) {
        toast.error(`❌ ${validationErrors.join(', ')}`);
      }
      
      // Add valid files
      if (validFiles.length > 0) {
        setAttachments(prev => [...prev, ...validFiles]);
        setErrors(prev => ({ ...prev, attachments: undefined }));
        toast.success(`✅ Added ${validFiles.length} file(s)`);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: typeof errors = {};
    
    if (!message.trim()) {
      newErrors.message = 'Delivery message is required';
    }
    
    if (attachments.length === 0) {
      newErrors.attachments = 'At least one attachment is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the errors before delivering');
      return;
    }
    
    try {
      await onDeliver({
        orderId: order._id,
        message: message.trim(),
        attachments,
        isFinal: isFinalDelivery,
        revisionsLeft: order.maxRevisions && order.revisions !== undefined 
          ? order.maxRevisions - order.revisions
          : undefined
      });
      
      // Reset form on success
      setMessage('');
      setAttachments([]);
      setIsFinalDelivery(true);
      setErrors({});
      toast.success('Work delivered successfully!');
    } catch (error) {
      // Error handling is done in parent component
      console.error('Delivery failed:', error);
      toast.error('Failed to deliver work. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File): string => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    if (file.type === 'application/zip' || file.type.includes('rar')) return '📦';
    return '📎';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-yellow-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-t-2xl border-b border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Deliver Work</h3>
                <p className="text-gray-600 mt-1">
                  Deliver completed work to {order.buyerId?.username || 'buyer'} for Order #{order.orderNumber}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 p-2 hover:bg-white rounded-lg transition-colors"
                disabled={isLoading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Order Info */}
            <div className="mt-4 p-4 bg-white rounded-xl border border-yellow-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Listing</p>
                  <p className="font-medium text-gray-900">{order.listingId?.title || 'Order'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Revisions Used</p>
                  <p className="font-medium text-gray-900">
                    {order.revisions || 0} of {order.maxRevisions || 3}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Delivery Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errors.message) setErrors(prev => ({ ...prev, message: undefined }));
                  }}
                  placeholder="Add a message for the buyer. Explain what you've delivered and any important notes..."
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                    errors.message ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Be clear and detailed. This helps avoid misunderstandings and revision requests.
                </p>
              </div>
              
              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments *
                </label>
                
                {/* File Upload Area */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer hover:bg-yellow-50 ${
                    errors.attachments ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isLoading}
                    accept="image/*,video/*,.pdf,.zip,.rar,.doc,.docx,.txt,.mp3,.wav,.ogg"
                  />
                  
                  <div className="text-4xl mb-3">📎</div>
                  <p className="font-medium text-gray-900">Click to upload files</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Drag and drop or click to browse. Max 100MB per file.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supported: Images, Videos, PDF, ZIP, Documents, Audio
                  </p>
                </div>
                
                {errors.attachments && (
                  <p className="mt-1 text-sm text-red-600">{errors.attachments}</p>
                )}
                
                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Files to deliver ({attachments.length})
                    </p>
                    {attachments.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getFileIcon(file)}</span>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          disabled={isLoading}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Delivery Type */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Final Delivery</p>
                    <p className="text-sm text-gray-600">
                      {isFinalDelivery 
                        ? 'This will be marked as final delivery. Buyer can request revisions if available.'
                        : 'Mark as draft delivery for review before final submission.'
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFinalDelivery(!isFinalDelivery)}
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                    disabled={isLoading}
                    style={{
                      backgroundColor: isFinalDelivery ? '#f59e0b' : '#d1d5db'
                    }}
                  >
                    <span className="sr-only">Toggle final delivery</span>
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isFinalDelivery ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                
                {order.revisions !== undefined && order.maxRevisions && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-300">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Revision Status:</span>{' '}
                      {order.revisions} of {order.maxRevisions} revisions used.{' '}
                      {order.maxRevisions - order.revisions > 0 ? (
                        <span className="text-green-600">
                          {order.maxRevisions - order.revisions} revision{order.maxRevisions - order.revisions !== 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="text-red-600">No revisions remaining</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Notes from Order */}
              {order.notes && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <p className="font-medium text-blue-900 mb-1">Buyer's Notes</p>
                  <p className="text-sm text-blue-800">{order.notes}</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Delivering...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Deliver Work
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-medium rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 disabled:opacity-50 border border-gray-300"
              >
                Cancel
              </button>
            </div>
            
            {/* Info Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                  <span className="font-medium">Important:</span> Once delivered, the buyer will have 3 days to review the work and request revisions if needed. Make sure all files are correct before delivery.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;
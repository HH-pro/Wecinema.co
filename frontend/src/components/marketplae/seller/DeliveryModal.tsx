// src/components/marketplace/seller/DeliveryModal.tsx - UPDATED VERSION
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import marketplaceApi from '../../../api/marketplaceApi';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    _id: string;
    orderNumber: string;
    status: string;
    listingId: {
      title: string;
    } | string;
    buyerId: {
      username: string;
      email?: string;
    };
    revisions?: number;
    maxRevisions?: number;
    buyerNotes?: string;
    requirements?: string;
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
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setAttachments([]);
      setErrors({});
      setUploadProgress([]);
      setIsUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ✅ IMPROVED FILE VALIDATION
  const defaultValidateFile = (file: File): string | null => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    // Check file size
    if (file.size > maxSize) {
      return `"${file.name}" is too large (max 100MB)`;
    }

    // Check file type by extension (more reliable than MIME type)
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = [
      // Images
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      // Videos
      'mp4', 'mov', 'avi', 'webm', 'mkv',
      // Documents
      'pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      // Audio
      'mp3', 'wav', 'ogg', 'm4a',
      // Archives
      'zip', 'rar', '7z'
    ];

    if (!extension || !allowedExtensions.includes(extension)) {
      return `"${file.name}" has unsupported file type`;
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    const validFiles: File[] = [];
    const validationErrors: string[] = [];
    
    files.forEach(file => {
      // Use custom validation or default
      const validationFunction = validateFile || defaultValidateFile;
      const error = validationFunction(file);
      
      if (error) {
        validationErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });
    
    // Show validation errors
    if (validationErrors.length > 0) {
      toast.error(`Validation failed: ${validationErrors.join(', ')}`, {
        duration: 5000
      });
    }
    
    // Add valid files
    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      setUploadProgress(prev => [...prev, ...Array(validFiles.length).fill(0)]);
      setErrors(prev => ({ ...prev, attachments: undefined }));
      
      toast.success(`Added ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}`, {
        icon: '📎'
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const removedFile = attachments[index];
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
    
    toast.success(`Removed "${removedFile.name}"`, {
      icon: '🗑️'
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      
      // Create a fake change event to reuse the same logic
      const fakeEvent = {
        target: { files: e.dataTransfer.files }
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleFileSelect(fakeEvent);
    }
  };

  // ✅ IMPROVED SUBMIT HANDLER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: typeof errors = {};
    
    if (!message.trim()) {
      newErrors.message = 'Please add a delivery message';
    }
    
    if (attachments.length === 0) {
      newErrors.attachments = 'Please add at least one file';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please complete all required fields');
      return;
    }

    try {
      // Call parent handler
      await onDeliver({
        orderId: order._id,
        message: message.trim(),
        attachments,
        isFinal: isFinalDelivery,
        revisionsLeft: order.maxRevisions && order.revisions !== undefined 
          ? order.maxRevisions - order.revisions
          : undefined
      });
      
      // Success - don't reset form here, let parent handle it
      toast.success('Work delivered successfully! ✅', {
        duration: 4000
      });
      
    } catch (error: any) {
      console.error('Delivery submission error:', error);
      
      // Don't show toast here - parent component will handle it
      // Just show modal error
      setErrors(prev => ({
        ...prev,
        message: error.message || 'Failed to deliver. Please try again.'
      }));
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
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return '🖼️';
    }
    
    // Videos
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension || '')) {
      return '🎥';
    }
    
    // Audio
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      return '🎵';
    }
    
    // PDF
    if (extension === 'pdf') {
      return '📄';
    }
    
    // Documents
    if (['doc', 'docx', 'txt'].includes(extension || '')) {
      return '📝';
    }
    
    // Spreadsheets
    if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
      return '📊';
    }
    
    // Archives
    if (['zip', 'rar', '7z'].includes(extension || '')) {
      return '📦';
    }
    
    return '📎';
  };

  // Get listing title
  const getListingTitle = () => {
    if (typeof order.listingId === 'object') {
      return order.listingId.title;
    }
    return 'Order #' + order.orderNumber;
  };

  // Calculate revisions remaining
  const getRevisionsRemaining = () => {
    if (order.maxRevisions !== undefined && order.revisions !== undefined) {
      return order.maxRevisions - order.revisions;
    }
    return null;
  };

  const revisionsRemaining = getRevisionsRemaining();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-yellow-200 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-t-2xl border-b border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Deliver Work</h3>
                <p className="text-gray-600 mt-1">
                  Deliver to {order.buyerId?.username || order.buyerId?.email || 'buyer'} • Order #{order.orderNumber}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 p-2 hover:bg-white rounded-lg transition-colors"
                disabled={isLoading || isUploading}
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
                  <p className="font-medium text-gray-900 truncate">{getListingTitle()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Revisions</p>
                  <p className="font-medium text-gray-900">
                    {order.revisions || 0} of {order.maxRevisions || 3}
                    {revisionsRemaining !== null && revisionsRemaining > 0 && (
                      <span className="ml-2 text-sm text-green-600">
                        ({revisionsRemaining} remaining)
                      </span>
                    )}
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
                  placeholder={`Hi ${order.buyerId?.username || 'there'}, here's your delivery...`}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                    errors.message ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isLoading || isUploading}
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Explain what you've delivered, include any instructions, and mention important files.
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
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isLoading || isUploading}
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.ogg,.m4a,.zip,.rar,.7z"
                  />
                  
                  <div className="text-4xl mb-3">📎</div>
                  <p className="font-medium text-gray-900">
                    {isUploading ? 'Uploading files...' : 'Click or drag files here'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Supported files up to 100MB each
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Images, Videos, Documents, Audio, Archives
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
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl flex-shrink-0">{getFileIcon(file)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">{file.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              {uploadProgress[index] > 0 && uploadProgress[index] < 100 && (
                                <div className="flex-1 max-w-xs">
                                  <div className="w-full bg-gray-200 rounded-full h-1">
                                    <div 
                                      className="bg-green-500 h-1 rounded-full" 
                                      style={{ width: `${uploadProgress[index]}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {uploadProgress[index]}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                          disabled={isLoading || isUploading}
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
                        ? 'Mark as complete. Buyer can request revisions if available.'
                        : 'Mark as draft for review before final submission.'
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFinalDelivery(!isFinalDelivery)}
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                    disabled={isLoading || isUploading}
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
                
                {revisionsRemaining !== null && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Revisions:</span>{' '}
                          {order.revisions || 0} used, {revisionsRemaining} remaining
                        </p>
                        {revisionsRemaining === 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ No revisions left. This delivery will be final.
                          </p>
                        )}
                      </div>
                      {revisionsRemaining > 0 && !isFinalDelivery && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Draft Mode
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Notes from Order */}
              {(order.buyerNotes || order.requirements) && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <p className="font-medium text-blue-900 mb-1">Order Details</p>
                  {order.requirements && (
                    <div className="mb-2">
                      <p className="text-xs text-blue-800 font-medium">Requirements:</p>
                      <p className="text-sm text-blue-800">{order.requirements}</p>
                    </div>
                  )}
                  {order.buyerNotes && (
                    <div>
                      <p className="text-xs text-blue-800 font-medium">Buyer Notes:</p>
                      <p className="text-sm text-blue-800">{order.buyerNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isLoading || isUploading || attachments.length === 0 || !message.trim()}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading || isUploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isUploading ? 'Uploading...' : 'Delivering...'}
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
                disabled={isLoading || isUploading}
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
                <div>
                  <p className="font-medium text-gray-700">Important Information:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Buyer has 3 days to review and request revisions</li>
                    <li>• Make sure all files are correct and complete</li>
                    <li>• Large files may take longer to upload</li>
                    <li>• Keep a backup of your delivered files</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;
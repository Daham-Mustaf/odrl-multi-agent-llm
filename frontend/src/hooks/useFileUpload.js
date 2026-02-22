import { useState } from 'react';

/**
 * Custom hook for file upload functionality
 * Handles drag & drop and file selection with validation
 * 
 * Usage:
 *   const { dragActive, fileName, uploadStatus, handleFileUpload, handleDrag, handleDrop } = useFileUpload();
 */
export const useFileUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);

  /**
   * Handle file upload with validation
   * @param {File} file - File to upload
   * @returns {Promise<string|null>} - File content or null if error
   */
  const handleFileUpload = async (file) => {
    if (!file) return null;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus({ 
        type: 'error', 
        message: 'File too large (max 5MB)' 
      });
      return null;
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/json'];
    const isValidType = allowedTypes.includes(file.type) || 
                       file.name.match(/\.(txt|md|json)$/i);
    
    if (!isValidType) {
      setUploadStatus({ 
        type: 'error', 
        message: 'Invalid file type. Use .txt, .md, or .json' 
      });
      return null;
    }

    // Read file
    try {
      const text = await file.text();
      setFileName(file.name);
      setUploadStatus({ 
        type: 'success', 
        message: `Loaded ${file.name}` 
      });
      
      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(null), 3000);
      
      return text;
    } catch (err) {
      setUploadStatus({ 
        type: 'error', 
        message: 'Failed to read file' 
      });
      return null;
    }
  };

  /**
   * Handle drag events
   */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  /**
   * Handle drop event
   */
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      return await handleFileUpload(e.dataTransfer.files[0]);
    }
    return null;
  };

  /**
   * Clear upload status
   */
  const clearUploadStatus = () => {
    setUploadStatus(null);
  };

  /**
   * Reset all state
   */
  const reset = () => {
    setDragActive(false);
    setFileName('');
    setUploadStatus(null);
  };

  return {
    dragActive,
    fileName,
    uploadStatus,
    handleFileUpload,
    handleDrag,
    handleDrop,
    clearUploadStatus,
    reset
  };
};

import React, { useState, useEffect } from 'react';
import { b64ToBlob } from '@/utils/kmsClient';

interface EncryptedViewerProps {
  fileId: string;
  onClose: () => void;
}

const EncryptedViewer: React.FC<EncryptedViewerProps> = ({ fileId, onClose }) => {
  const [encryptedContent, setEncryptedContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchEncryptedContent = async () => {
      try {
        setLoading(true);
        // Fetch cipher metadata from Drive DB
        const meta = await fetch(`/api/drive/getCipher?id=${fileId}`).then((r) => r.json());
        setFileName(meta.fileName);
        
        // Display the encrypted content in base64 format
        setEncryptedContent(meta.cipher);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch encrypted content');
        setLoading(false);
        console.error(err);
      }
    };

    fetchEncryptedContent();
  }, [fileId]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-11/12 max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-lg p-6 overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold mb-4">
          {fileName}
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="overflow-auto max-h-[calc(90vh-8rem)]">
            <div className="bg-gray-100 p-4 rounded font-mono text-xs break-all">
              {encryptedContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EncryptedViewer;

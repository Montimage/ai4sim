import React, { useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import OutputModal from './OutputModal';

interface TruncatedOutputProps {
  content: string;
  maxLength?: number;
  toolName?: string;
  timestamp?: Date;
  title?: string;
}

const TruncatedOutput: React.FC<TruncatedOutputProps> = ({ 
  content, 
  maxLength = 500, 
  toolName, 
  timestamp,
  title = "Complete Output"
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const isTruncated = content.length > maxLength;
  const displayContent = isTruncated ? content.substring(0, maxLength) + '...' : content;

  return (
    <>
      <div className="relative">
        <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
          {displayContent}
        </pre>
        
        {isTruncated && (
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {maxLength} of {content.length} characters
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
            >
              <EyeIcon className="w-3 h-3" />
              <span>View complete output</span>
            </button>
          </div>
        )}
      </div>

      <OutputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        content={content}
        toolName={toolName}
        timestamp={timestamp}
      />
    </>
  );
};

export default TruncatedOutput;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface OutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  toolName?: string;
  timestamp?: Date;
}

const OutputModal: React.FC<OutputModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  content, 
  toolName,
  timestamp 
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatContent = (text: string) => {
    // Préserve la mise en forme du texte avec les retours à la ligne
    return text;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                  {toolName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Tool: <span className="font-mono font-medium">{toolName}</span>
                    </p>
                  )}
                  {timestamp && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {timestamp.toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Copy Button */}
                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {copied ? 'Copied!' : 'Copy'}
                    </span>
                  </button>
                  
                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Close"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full p-6 overflow-y-auto">
                  <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                    {formatContent(content)}
                  </pre>
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {content.split('\n').length} lines • {content.length} characters
                  </span>
                  <span>
                    Use Ctrl+F to search within content
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OutputModal;

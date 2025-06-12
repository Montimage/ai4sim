import React from "react";

interface ServiceFrameProps {
  url: string;
  onClose: () => void;
}

export const ServiceFrame: React.FC<ServiceFrameProps> = ({ url, onClose }) => {
  return (
    <div className="service-frame">
      <div className="frame-header">
        <h3>Service Interface</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      <div className="frame-container">
        <iframe
          src={url}
          title="Service Interface"
          className="w-full h-full"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
};

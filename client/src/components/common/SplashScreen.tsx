import React, { useEffect } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  /**
   * Callback invoked when the splash animation finishes.
   * Typically used to hide the splash screen and show the main app.
   */
  onFinish: () => void;
}

/**
 * A full‑screen splash screen that displays the developer credit.
 * It automatically fades out after 3 seconds.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Trigger the finish callback after the animation duration.
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); // 3 seconds
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <h1 className="splash-title">Quiz Arena</h1>
        <p className="splash-credit">Developed by Aryan Kewte</p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { MonitorX } from 'lucide-react';

export const MIN_SUPPORTED_VIEWPORT_WIDTH = 900;
export const MIN_SUPPORTED_VIEWPORT_HEIGHT = 600;

/**
 * Hard Viewport Gate (Universal V2 Contract):
 * - Blocks any viewport where width < 900 OR height < 600
 * - Does NOT enforce landscape-only (tall windows like 1275x1301 are allowed)
 * - Completely unmounts children (workspace) to prevent broken layouts & credential leakage
 * - Does NOT provide a "continue anyway" bypass
 * - Displays live tabular W x H dimensions and clear resolution instructions
 */
export function SupportedViewportGate({
  children,
  productName = 'Evaluation Console',
}) {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : MIN_SUPPORTED_VIEWPORT_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : MIN_SUPPORTED_VIEWPORT_HEIGHT,
  }));

  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    // Initial sync
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isWidthValid = dimensions.width >= MIN_SUPPORTED_VIEWPORT_WIDTH;
  const isHeightValid = dimensions.height >= MIN_SUPPORTED_VIEWPORT_HEIGHT;
  const isSupported = isWidthValid && isHeightValid;

  // Hard gate: workspace must not mount when below floor
  if (!isSupported) {
    return (
      <div
        className="viewport-gate-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="viewport-gate-title"
      >
        <div className="viewport-gate-card">
          <div className="viewport-gate-header">
            <MonitorX className="viewport-gate-icon" size={24} strokeWidth={2} />
            <h1 id="viewport-gate-title" className="viewport-gate-title">
              {productName} requires a larger screen
            </h1>
          </div>

          <p className="viewport-gate-message">
            This application is an enterprise workspace optimized for data density,
            traces, and multi-panel inspection.
          </p>

          <div className="viewport-gate-metrics">
            <div className="viewport-gate-metric-row">
              <span className="viewport-gate-metric-label">Current Viewport</span>
              <span
                className={`viewport-gate-metric-value tabular-nums ${
                  !isWidthValid || !isHeightValid ? 'deficient' : 'valid'
                }`}
              >
                {dimensions.width} × {dimensions.height}
              </span>
            </div>

            <div className="viewport-gate-metric-row">
              <span className="viewport-gate-metric-label">Minimum Required</span>
              <span className="viewport-gate-metric-value tabular-nums">
                {MIN_SUPPORTED_VIEWPORT_WIDTH} × {MIN_SUPPORTED_VIEWPORT_HEIGHT}
              </span>
            </div>
          </div>

          <p className="viewport-gate-instruction">
            Please maximize your browser window or move to a larger display.
          </p>
        </div>
      </div>
    );
  }

  // When floor requirements are met, render the workspace
  return <>{children}</>;
}

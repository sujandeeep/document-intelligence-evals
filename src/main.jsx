import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('CRITICAL REACT CRASH CAUGHT BY BOUNDARY:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '30px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          minHeight: '100vh',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ Application Error Encountered</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            A rendering exception was intercepted. Details:
          </p>
          <pre style={{
            backgroundColor: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #334155',
            color: '#fca5a5',
            fontSize: '12px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

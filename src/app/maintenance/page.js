export default function MaintenancePage() {
    return (
      <html lang="en">
        <head>
          <title>Site Maintenance</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style={{ 
          margin: 0, 
          padding: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: '#f0f2f5' 
        }}>
          <div style={{
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '1rem' }}>
              We'll be right back!
            </h1>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Our site is currently undergoing scheduled maintenance.
              We'll be back online shortly.
            </p>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Thank you for your patience.
            </p>
          </div>
        </body>
      </html>
    );
  }
export default function MaintenancePage() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 mx-4 bg-white rounded-lg shadow-md max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            We'll be right back!
          </h1>
          <p className="text-gray-600 mb-4">
            Our site is currently undergoing scheduled maintenance.
            We'll be back online shortly.
          </p>
          <p className="text-gray-500 text-sm">
            Thank you for your patience.
          </p>
        </div>
      </div>
    );
  }
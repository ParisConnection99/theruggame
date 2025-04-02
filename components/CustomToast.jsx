import React from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom toast component with logo
const CustomToast = ({ message }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {/* Logo on the left */}
      <div style={{ marginRight: '12px' }}>
        {/* Replace this with your actual logo component or image */}
        <img 
          src="/images/logo1.png" 
          alt="Site Logo" 
          style={{ width: '30px', height: '30px' }} 
        />
      </div>
      
      {/* Message in the middle */}
      <div>
        {message}
      </div>
    </div>
  );
};

// Function to show custom toast
export const showToast = (message, type = 'default') => {
  const toastContent = <CustomToast message={message} />;
  
  const toastOptions = {
    position: "top-right",
    autoClose: 1500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true
  };
  
  switch(type) {
    case 'success':
      toast.success(toastContent, toastOptions);
      break;
    case 'error':
      toast.error(toastContent, toastOptions);
      break;
    case 'info':
      toast.info(toastContent, toastOptions);
      break;
    case 'warning':
      toast.warning(toastContent, toastOptions);
      break;
    default:
      toast(toastContent, toastOptions);
  }
};

// Make sure you add this ToastContainer component somewhere in your app (usually in your main layout)
// <ToastContainer />

// Example usage:
// showToast("Operation completed successfully!", "success");
// showToast("Something went wrong!", "error");
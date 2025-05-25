/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from 'react-toastify';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },
  
  error: (message: string) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  },
  
  warning: (message: string) => {
    toast.warning(message, {
      position: "top-right",
      autoClose: 2500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }
};

// Helper to show validation errors
export const showValidationError = (errors: Record<string, any>) => {
  const errorMessages = Object.entries(errors)
    .map(([field, error]) => `${field}: ${error}`)
    .join(', ');
  
  showToast.error(`Validation Error: ${errorMessages}`);
};
// utils/authErrors.ts
import Toast from 'react-native-toast-message';

export function showLoginError(error: any) {
  let userMessage = "An unknown login error occurred.";
  let toastType = 'error'; 

  switch (error.code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      userMessage = "Invalid email or password.";
      break;
    case "auth/invalid-email":
      userMessage = "Please enter a valid email address.";
      break;
    case "auth/network-request-failed":
      userMessage = "Please check your internet connection.";
      break;
    default:
      userMessage = error.message || "An unknown error occurred.";
  }

  Toast.show({
    type: toastType,
    text1: "Login Failed",
    text2: userMessage,
  });
}

// Register errors
export function showRegisterError(error: any) {
  let userMessage = "An unknown registration error occurred.";
  let toastType = 'error';

  switch (error.code) {
    case "auth/email-already-in-use":
      userMessage = "This email address is already in use.";
      break;
    case "auth/invalid-email":
      userMessage = "Please enter a valid email address.";
      break;
    case "auth/weak-password":
      userMessage = "Password should be at least 6 characters.";
      break;
    case "auth/operation-not-allowed":
      userMessage = "Email/password accounts are not enabled. Please check Firebase settings.";
      break;
    case "auth/network-request-failed":
      userMessage = "Please check your internet connection.";
      break;
    default:
      userMessage = error.message || "An unknown error occurred.";
  }

  Toast.show({
    type: toastType,
    text1: "Registration Failed",
    text2: userMessage,
  });
}
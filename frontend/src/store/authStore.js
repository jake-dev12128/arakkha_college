import { create } from "zustand";

const useAuthStore = create((set) => ({
  loginEmail: "",
  loginIdentifier: "",
  loginType: null,
  signInAttempt: null,

  setLoginAttempt: ({
    email = "",
    identifier = "",
    loginType = "staff",
    signInAttempt = null,
  }) => {
    set({
      loginEmail: email,
      loginIdentifier: identifier || email,
      loginType,
      signInAttempt,
    });
  },

  clearLoginAttempt: () => {
    set({
      loginEmail: "",
      loginIdentifier: "",
      loginType: null,
      signInAttempt: null,
    });
  },
}));

export default useAuthStore;
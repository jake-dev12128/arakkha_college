
import { useEffect } from "react";
import { useAuth } from "@clerk/react";

import {
  configureApiAuth,
} from "../../api/api.js";

// ==================================================
// AUTH SESSION MANAGER
// ==================================================

export default function AuthSessionManager() {
  const { getToken } = useAuth();

  useEffect(() => {
    configureApiAuth(getToken);

    return () => {
      configureApiAuth(null);
    };
  }, [getToken]);

  return null;
}

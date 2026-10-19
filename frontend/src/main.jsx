import React from "react";
import ReactDOM from "react-dom/client";

import {
  ClerkProvider,
} from "@clerk/react";

import {
  ChakraProvider,
  defaultSystem,
} from "@chakra-ui/react";
import "./styles/management.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY"
  );
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>

   <ClerkProvider
  publishableKey={clerkPublishableKey}
  signInFallbackRedirectUrl="/acc/auth/dashboard"
>

      <ChakraProvider
        value={defaultSystem}
      >
                <ThemeProvider>
        
        <App />
                </ThemeProvider>
        
      </ChakraProvider>

    </ClerkProvider>

  </React.StrictMode>
);


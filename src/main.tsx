
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import JoinOrg from "./JoinOrg";
import Landing from "./Landing";
import "./index.css";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ClerkProvider publishableKey={clerkKey}>
        <BrowserRouter>
          <Routes>
            <Route
              path="/join/:token"
              element={
                <>
                  <SignedOut>
                    <Landing />
                  </SignedOut>
                  <SignedIn>
                    <JoinOrg />
                  </SignedIn>
                </>
              }
            />
            <Route path="/app" element={<App />} />
            <Route path="/" element={<App />} />
            <Route path="*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </ClerkProvider>
    </HelmetProvider>
  </React.StrictMode>
);

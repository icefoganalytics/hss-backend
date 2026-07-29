import { createAuth0Client } from "@auth0/auth0-spa-js";
import * as config from "./config";

// Single shared Auth0 SPA client. The access token it returns (audience =
// auth0Audience) is what the API validates as the Bearer token.
let clientPromise = null;

export function getAuth0() {
  if (!clientPromise) {
    clientPromise = createAuth0Client({
      domain: config.auth0Domain,
      clientId: config.auth0ClientId,
      authorizationParams: {
        audience: config.auth0Audience,
        redirect_uri: `${window.location.origin}/login-complete`,
      },
      // Persist the session so a page refresh keeps the user logged in.
      cacheLocation: "localstorage",
      useRefreshTokens: true,
    });
  }
  return clientPromise;
}

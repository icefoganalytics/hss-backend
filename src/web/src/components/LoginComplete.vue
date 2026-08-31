<template>
  <div></div>
</template>

<script>
// Handles the Auth0 redirect callback, then sends the user into the app.
import router from "../router";
import store from "../store";

export default {
  name: "LoginComplete",
  async created() {
    try {
      await store.dispatch("handleAuthCallback");
    } catch (e) {
      // Auth0 puts the real reason in error/error_description; the bare
      // message ("Unauthorized") on its own isn't diagnosable.
      console.error("Auth callback failed:", e.error, e.error_description || e.message, e);
    }
    // The global guard may redirect this push (e.g. to /sign-in when the
    // callback failed); that's expected, so swallow the navigation rejection.
    router.push("/").catch(() => {});
  }
};
</script>

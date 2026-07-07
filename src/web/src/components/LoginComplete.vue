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
      console.error(e);
    }
    router.push("/");
  }
};
</script>

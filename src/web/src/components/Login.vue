<template>
  <div class="hello">
    <h1>{{ title }}</h1>
    <p>
      The authentication for this application is managed by our identity
      provider. When you click the button below, you will be redirected to
      sign in and then returned here.
    </p>
    <p>
      If you already have an active session, you may be returned here
      immediately without re-entering your credentials.
    </p>

    <button class="v-btn primary v-size--default" @click="signIn">
      Click here to sign in
    </button>
  </div>
</template>

<script>
import * as config from "../config";
import router from "../router";
import store from "../store";

export default {
  name: "Login",
  data: () => ({
    title: `Sign in to ${config.applicationName}`
  }),
  async created() {
    await store.dispatch("checkAuthentication");
    if (store.getters.isAuthenticated) {
      router.push("/");
    }
  },
  methods: {
    async signIn() {
      await store.dispatch("login");
    }
  }
};
</script>

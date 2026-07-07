import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import axios from "axios";
import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'
import vuetify from "./plugins/vuetify";
import { getAuth0 } from "./auth";

Vue.config.productionTip = false;

// Attach the Auth0 access token as a Bearer header on every API request.
// Auth is now stateless JWT, so cookies are no longer used.
axios.interceptors.request.use(async (cfg) => {
  try {
    const auth0 = await getAuth0();
    if (await auth0.isAuthenticated()) {
      const token = await auth0.getTokenSilently();
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // Not authenticated / token unavailable — request proceeds without a token.
  }
  return cfg;
});

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");

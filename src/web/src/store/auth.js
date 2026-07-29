import axios from "axios";
import { AUTH_CHECK_URL, LOGIN_EVENT_URL } from "../urls";
import { getAuth0 } from "../auth";

const state = {
    user: null,
    fullName: ""
};
const getters = {
    isAuthenticated: state => !!state.user,
    fullName: state => { return state.fullName },
    dbUser: state => { return state.user ? state.user.db_user : null }
};
const actions = {
    // Auth state comes from the Auth0 SPA; when it confirms a session, load the
    // user + DB permissions from the API (single source of truth = the DB).
    async checkAuthentication({ commit }) {
        try {
            const auth0 = await getAuth0();
            if (await auth0.isAuthenticated()) {
                const resp = await axios.get(AUTH_CHECK_URL);
                commit("setUser", resp.data.data);
            } else {
                commit("clearUser");
            }
        } catch (e) {
            commit("clearUser");
        }
    },
    // Redirects to Auth0 to sign in (returns to /login-complete).
    async login() {
        const auth0 = await getAuth0();
        await auth0.loginWithRedirect();
    },
    // Completes the Auth0 redirect, loads the user, and records the login.
    async handleAuthCallback({ dispatch }) {
        const auth0 = await getAuth0();
        const query = window.location.search;
        // Only process a genuine Auth0 redirect (has code/error + state), and only
        // once — then strip the params so a reload can't reprocess them (which
        // throws "Invalid state").
        if (query.includes("state=") && (query.includes("code=") || query.includes("error="))) {
            try {
                await auth0.handleRedirectCallback();
            } finally {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
        await dispatch("checkAuthentication");
        try {
            await axios.post(LOGIN_EVENT_URL);
        } catch (e) {
            // Audit logging is best-effort; don't block login on it.
        }
    },
    async signOut({ commit }) {
        const auth0 = await getAuth0();
        commit("clearUser");
        await auth0.logout({
            logoutParams: { returnTo: `${window.location.origin}/sign-in` }
        });
    }
};
const mutations = {
    setUser(state, user) {
        state.user = user;
        state.fullName = user.oid_user.displayName;
    },
    clearUser(state) {
        state.user = null;
        state.fullName = null;
    }
};

export default {
    state,
    getters,
    actions,
    mutations
};

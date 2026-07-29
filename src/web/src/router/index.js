import Vue from "vue";
import VueRouter from "vue-router";
// import Home from "../components/Home.vue";
import NotFound from "../views/NotFound.vue";
import Login from "../components/Login";
import LoginComplete from "../components/LoginComplete";
import Profile from "../components/Profile";
import store from "../store";
import Constellation from "../components/Constellation/Constellation";
import ConstellationDetails from "../components/Constellation/ConstellationDetails";
import ConstellationExport from "../components/Constellation/ConstellationExport"
import ConstellationAnalytics from "../components/Constellation/ConstellationAnalytics";
import ConstellationWarnings from "../components/Constellation/ConstellationWarnings";
import ConstellationWarningsDetails from "../components/Constellation/ConstellationWarningsDetails";
import Hipma from "../components/Hipma/Hipma";
import HipmaDetails from "../components/Hipma/HipmaDetails";
import HipmaExport from "../components/Hipma/HipmaExport";
import HipmaAnalytics from "../components/Hipma/HipmaAnalytics";
import HipmaWarnings from "../components/Hipma/HipmaWarnings";
import HipmaWarningsDetails from "../components/Hipma/HipmaWarningsDetails";
import Midwifery from "../components/Midwifery/Midwifery";
import MidwiferyDetails from "../components/Midwifery/MidwiferyDetails";
import MidwiferyExport from "../components/Midwifery/MidwiferyExport";
import MidwiferyAnalytics from "../components/Midwifery/MidwiferyAnalytics";
import MidwiferyWarnings from "../components/Midwifery/MidwiferyWarnings";
import MidwiferyWarningsDetails from "../components/Midwifery/MidwiferyWarningsDetails";
import Dental from "../components/Dental/Dental";
import DentalDetails from "../components/Dental/DentalDetails";
import DentalEditSubmission from "../components/Dental/DentalEditSubmission";
import DentalExport from "../components/Dental/DentalExport";
import DentalWarnings from "../components/Dental/DentalWarnings";
import DentalWarningsDetails from "../components/Dental/DentalWarningsDetails";
import DentalAnalytics from "../components/Dental/DentalAnalytics";
import DentalArchived from "../components/Dental/DentalArchived";

import Dashboard from "../components/Dashboard.vue";
import ModuleLogs from "../components/General/ModuleLogs.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/moduleLogs",
    name: "Logs History",
    component: ModuleLogs,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/sign-in",
    name: "Login",
    component: Login
  },
  {
    path: "/login-complete",
    name: "LoginComplete",
    component: LoginComplete
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "*",
    name: "Not Found",
    component: NotFound

  },
  {
    path: "/constellation/:type?",
    name: "Constellation Health",
    component: Constellation,
    props: true,
    meta: {
      requiresAuth: true,
      permissions: [
        "constellation_view"
      ]
    }
  },
  {
    path: "/constellation/show/:constellationHealth_id",
    name: "Constellation Health",
    component: ConstellationDetails,
    meta: {
      requiresAuth: true,
      permissions: [
        "constellation_view"
      ]
    }
  },
  {
    path: "/constellationExport",
    name: "Constellation Export",
    component: ConstellationExport,
    meta: {
      requiresAuth: true,
      permissions: [
        "constellation_view"
      ]
    }
  },
  {
    path: "/constellationAnalytics",
    name: "Constellation Analytics",
    component: ConstellationAnalytics,
    meta: {
      requiresAuth: true,
      permissions: [
        "constellation_view"
      ]
    }
  },
  {
    path: "/hipma",
    name: "Health Information",
    component: Hipma,
    meta: {
      requiresAuth: true,
      permissions: [
        "hipma_view"
      ]
    }
  },
  {
    path: "/hipma/show/:hipma_id",
    name: "Health Information Details",
    component: HipmaDetails,
    meta: {
      requiresAuth: true,
      permissions: [
        "hipma_view"
      ]
    }
  },
  {
    path: "/hipmaExport",
    name: "Health Information Export",
    component: HipmaExport,
    meta: {
      requiresAuth: true,
      permissions: [
        "hipma_view"
      ]
    }
  },
  {
    path: "/hipmaAnalytics",
    name: "Hipma Analytics",
    component: HipmaAnalytics,
    meta: {
      requiresAuth: true,
      permissions: [
        "hipma_view"
      ]
    }
  },
  {
    path: "/midwifery/:type?",
    name: "Midwifery",
    component: Midwifery,
    props: true,
    meta: {
      requiresAuth: true,
      permissions: [
        "midwifery_view"
      ]
    }
  },
  {
    path: "/midwifery/show/:midwifery_id",
    name: "Midwifery Details",
    component: MidwiferyDetails,
    meta: {
      requiresAuth: true,
      permissions: [
        "midwifery_view"
      ]
    }
  },
  {
    path: "/midwiferyExport",
    name: "Midwifery Export",
    component: MidwiferyExport,
    meta: {
      requiresAuth: true,
      permissions: [
        "midwifery_view"
      ]
    }
  },
  {
    path: "/midwiferyAnalytics",
    name: "Midwifery Analytics",
    component: MidwiferyAnalytics,
    meta: {
      requiresAuth: true,
      permissions: [
        "midwifery_view"
      ]
    }
  },
  {
    path: "/hipmaWarnings",
    name: "Hipma Warnings",
    component: HipmaWarnings,
    meta: {
      requiresAuth: true,
      permissions: [
        "hipma_view"
      ]
    }
  },
  {
    path: "/hipmaWarnings/details/:duplicate_id",
    name: "Hipma Warnings Details",
    component: HipmaWarningsDetails,
    meta: {
      requiresAuth: true,
      permissions: [
        "hipma_view"
      ]
    }
  },
  {
    path: "/midwiferyWarnings",
    name: "Midwifery Warnings",
    component: MidwiferyWarnings,
    meta: {
      requiresAuth: true,
      permissions: [
        "midwifery_view"
      ]
    }
  },
  {
    path: "/midwiferyWarnings/details/:duplicate_id",
    name: "Midwifery Warnings Details",
    component: MidwiferyWarningsDetails,
    meta: {
      requiresAuth: true,
      permissions: [
        "midwifery_view"
      ]
    }
  },
  {
    path: "/constellationWarnings",
    name: "Constellation Warnings",
    component: ConstellationWarnings,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/constellationWarnings/details/:duplicate_id",
    name: "Constellation Warnings Details",
    component: ConstellationWarningsDetails,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/dental/:type?",
    name: "Dental Service",
    component: Dental,
    props: true,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
  {
    path: "/dental/show/:dentalService_id",
    name: "Dental Service Details",
    component: DentalDetails,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
  {
    path: "/dental/edit/:dentalService_id",
    name: "Dental Service Edit Submission",
    component: DentalEditSubmission,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
  {
    path: "/dentalExport",
    name: "Dental Export",
    component: DentalExport,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
  {
    path: "/dentalWarnings",
    name: "Dental Warnings",
    component: DentalWarnings,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
  {
    path: "/dentalWarnings/details/:duplicate_id",
    name: "Dental Warnings Details",
    component: DentalWarningsDetails,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
  {
    path: "/dentalAnalytics",
    name: "Dental Analytics",
    component: DentalAnalytics,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
  {
    path: "/dentalArchived",
    name: "Dental Archived",
    component: DentalArchived,
    meta: {
      requiresAuth: true,
      permissions: [
        "dental_view"
      ]
    }
  },
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth || false;
  const permissions = to.meta?.permissions ?? [];

  if (!requiresAuth && permissions.length === 0) {
    return next();
  }

  await store.dispatch("checkAuthentication");
  var isAuthenticated = store.getters.isAuthenticated;
  const userPermissions = store.getters.dbUser?.permissions ?? [];

  // Validate authentication
  if (requiresAuth && !isAuthenticated) {
    console.log("You aren't authenticatd, redirecting to sign-in")
    next("/sign-in");
    return;
  }

  // Validate permissions. A route that requires none passes for any
  // authenticated user (permissions.every over [] is true).
  const validate = permissions.every((x) => {
    return userPermissions.some((p) => p.permission_name === x);
  });

  if (!validate) {
    // Not permitted for this route — send home, unless we're already going
    // there (guard against an infinite redirect loop when the user has no
    // matching permissions).
    if (to.path !== "/") {
      next("/");
    } else {
      next();
    }
    return;
  }

  return next();
});

export default router;

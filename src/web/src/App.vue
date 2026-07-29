<template>
  <v-app>
    <v-navigation-drawer
      v-bind:app="hasSidebar"
      permanent
      clipped
      color="#fff"
      id="menu-services"
      :mini-variant.sync="mini"
      v-bind:class="{ 'd-none': !hasSidebar }"
    >
    <v-list-item>
      <v-icon v-if="mini" >mdi-chevron-right</v-icon>
      
      <v-list-item-title> Services</v-list-item-title>

      <v-btn
        icon
        @click.stop="mini = !mini"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
    </v-list-item>
      <v-divider></v-divider>
      <v-list dense nav class="mt-1 pb-0 pt-1"
        v-for='(section) in sections' :key="section.header">
          <div class="section-container" v-if="checkPermissions(section.permissions)">
            <v-subheader  v-if="!mini">{{ section.header }}</v-subheader>
            <img v-if="mini && section.icon" :src="section.icon" height="36px" width="36px" />
            <v-list-item-group
              v-for="detail in section.data"
              v-bind:key="detail.name"
              color= "white"
              class="mb-0"
            >
              <v-list-item
                link
                nav
                :title="detail.name"
                :to="detail.url"
                v-if="checkPermissions(detail.permissions)"
                @click="onMenuClick(detail)"
              >
                <v-list-item-icon>
                  <v-icon>{{ detail.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-title>{{ detail.name }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list-item-group>
          </div>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar
      app
      color="#fff"
      flat
      height="70"
      style="left: 0; border-bottom: 3px #f3b228 solid"
    >
      <!-- <v-icon color="#f3b228" class="mr-5">{{ applicationIcon }}</v-icon> -->
      <img src="/yukon.svg" class="toolbar-img" height="44" />
      <v-toolbar-title class="text-xs-center">
        <span class="font-weight-bold toolbar-app-name">{{ applicationName }}</span>

        <v-progress-circular
          :class="loadingClass"
          indeterminate
          color="#f3b228"
          size="20"
          width="2"
          class="ml-4"
        ></v-progress-circular>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- <v-label dark>License Year:</v-label>
      <v-select
        v-model="licenseYear"
        smaller
        :items="licenseYears"
        dense
        style="margin-left: 15px; max-width: 150px; margin-right: 20px"
        hide-details
      ></v-select> -->

      <div v-if="isAuthenticated">
        <span>{{ username }}</span>
        <v-menu bottom left class="ml-0">
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon color="primary" v-bind="attrs" v-on="on">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list dense style="min-width: 200px">
            <v-list-item to="/profile">
              <v-list-item-icon>
                <v-icon>mdi-account</v-icon>
              </v-list-item-icon>
              <v-list-item-title>My profile</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item @click="signOut">
              <v-list-item-icon>
                <v-icon>mdi-exit-run</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Sign out</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <div v-else>
        <router-link to="/sign-in">Sign in</router-link>
      </div>

      <!-- <v-app-bar-nav-icon @click.stop="drawerRight = !drawerRight"></v-app-bar-nav-icon> -->
    </v-app-bar>

    <v-main v-bind:style="{ 'padding-left: 33px !important': !hasSidebar }">
      <!-- Provides the application the proper gutter -->
      <v-container fluid id="container-main">
        <v-row id="container-row">
          <v-col>
            <router-view :key="componentKey"></router-view>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

      <v-footer
        flat
        style="z-index: 10"
        padless
        height="70"
      >
        <v-card
          class="flex"
          flat
          tile
        >
          <v-card-title  id="footer-bg">
            <img src="/logo-white.svg" class="toolbar-img" height="44"/>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="white--text text-center footer-details">
            <span>© Copyright {{ new Date().getFullYear() }} <a href="/">Government of Yukon</a></span>
          </v-card-text>
        </v-card>
      </v-footer>

  </v-app>
</template>

<script>
import router from "./router";
//import { mapState } from "vuex";
import store from "./store";
import * as config from "./config";

export default {
  name: "App",
  components: {},
  computed: {
    username() {
      return store.getters.fullName;
    },
    isAuthenticated() {
      return store.getters.isAuthenticated;
    }
  },
  data: () => ({
    dialog: false,
    drawer: false,
    mini: false,
    drawerRight: null,
    headerShow: false,
    menuShow: false,
    dbUser: null,
    loadingClass: "d-none",
    applicationName: config.applicationName,
    applicationIcon: config.applicationIcon,
    sections: config.sections,
    hasSidebar: false, //config.hasSidebar,
    hasSidebarClosable: config.hasSidebarClosable,
    componentKey: 0,
  }),
  created: async function() {
    await store.dispatch("checkAuthentication");
    //this.username = store.getters.fullName
    this.dbUser = store.getters.dbUser;
    if (!this.isAuthenticated) this.hasSidebar = false;
    else this.hasSidebar = config.hasSidebar;
  },
  watch: {
    isAuthenticated: function(val) {
      if (!val) this.hasSidebar = false;
      else this.hasSidebar = config.hasSidebar;
    },
    '$route'() {
      this.forceRerender();
    }
  },
  methods: {
    nav: function(location) {
      router.push(location);
    },
    toggleHeader: function() {
      this.headerShow = !this.headerShow;
    },
    toggleMenu: function() {
      this.menuShow = !this.menuShow;
    },
    signOut: function() {
      store.dispatch("signOut");
      router.push("/");
    },
    forceRerender() {
      this.componentKey += 1;
    },
    checkPermissions(permissions) {
      const userPermissions = this.dbUser?.permissions;
      if (userPermissions) {
        return permissions.every((x) => {
            return userPermissions.find((p) => p.permission_name === x) !== undefined;
        });   
      }
      return false;
    },
    onMenuClick(detail) {
      if (detail.url === "/dental") {
        sessionStorage.removeItem("dentalFilters");
      }

      if (detail.url === "/dentalArchived") {
        sessionStorage.removeItem("dentalArchiveFilters");
      }

      if (this.$route.path === detail.url) {
        // Force component refresh if the user is already on the same route
        this.componentKey += 1;
      }
    },
  }
};
</script>
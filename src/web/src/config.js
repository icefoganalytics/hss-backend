
export const applicationName = "Health and social services";
export const applicationIcon = "mdi-cash-register";
export const hasSidebar = true;
export const hasSidebarClosable = false;

export const sections = [
    {
        header: "Analytics",
        icon: "",
        permissions: [
            "dashboard_view"
        ],
        data:[
            {
                name: "Dashboard",
                url: "/",
                icon: "fa-solid fa-grip",
                permissions: [
                    "dashboard_view"
                ]
            },
            {
                name: "Logs History",
                url: "/moduleLogs",
                icon: "fa-solid fa-book",
                permissions: [
                    "dental_logs"
                ]
            },
        ]
    },
    {
        header: "Constellation Health",
        icon: "/CH.png",
        permissions: [
            "constellation_view"
        ],
        data:[
            {
                name: "Submissions",
                url: "/constellation",
                icon: "fa-regular fa-rectangle-list",
                permissions: [
                    "constellation_view"
                ]
            },
            {
                name: "Warnings",
                url: "/constellationWarnings",
                icon: "fas fa-exclamation-triangle",
                permissions: [
                    "constellation_view"
                ]
            },
            {
                name: "Analytics",
                url: "/constellationAnalytics",
                icon: "fa-solid fa-chart-line",
                permissions: [
                    "constellation_view"
                ]
            },
            {
                name: "Export",
                url: "/constellationExport",
                icon: "fa-solid fa-file-export",
                permissions: [
                    "constellation_view"
                ]
            }
        ]
    },
    {
        header: "HIPMA",
        icon: "/H.png",
        permissions: [
            "hipma_view"
        ],
        data:[
            {
                name: "Submissions",
                url: "/hipma",
                icon: "fa-regular fa-rectangle-list",
                permissions: [
                    "hipma_view"
                ]
            },
            {
                name: "Warnings",
                url: "/hipmaWarnings",
                icon: "fas fa-exclamation-triangle",
                permissions: [
                    "hipma_view"
                ]
            },
            {
                name: "Analytics",
                url: "/hipmaAnalytics",
                icon: "fa-solid fa-chart-line",
                permissions: [
                    "hipma_view"
                ]
            },
            {
                name: "Export",
                url: "/hipmaExport",
                icon: "fa-solid fa-file-export",
                permissions: [
                    "hipma_view"
                ]
            }
        ]
    },
    {
        header: "Midwifery",
        icon: "/MS.png",
        permissions: [
            "midwifery_view"
        ],
        data:[
            {
                name: "Submissions",
                url: "/midwifery",
                icon: "fa-regular fa-rectangle-list",
                permissions: [
                    "midwifery_view"
                ]
            },
            {
                name: "Warnings",
                url: "/midwiferyWarnings",
                icon: "fas fa-exclamation-triangle",
                permissions: [
                    "midwifery_view"
                ]
            },
            {
                name: "Analytics",
                url: "/midwiferyAnalytics",
                icon: "fa-solid fa-chart-line",
                permissions: [
                    "midwifery_view"
                ]
            },
            {
                name: "Export",
                url: "/midwiferyExport",
                icon:  "fa-solid fa-file-export",
                permissions: [
                    "midwifery_view"
                ]
            }
        ]
    },
    {
        header: "Dental",
        icon: "/D.png",
        permissions: [
            "dental_view"
        ],
        data:[
            {
                name: "Submissions",
                url: "/dental",
                icon: "fa-regular fa-rectangle-list",
                permissions: [
                    "dental_view"
                ]
            },
            {
                name: "Warnings",
                url: "/dentalWarnings",
                icon: "fas fa-exclamation-triangle",
                permissions: [
                    "dental_view"
                ]
            },
            {
                name: "Analytics",
                url: "/dentalAnalytics",
                icon: "fa-solid fa-chart-line",
                permissions: [
                    "dental_view"
                ]
            },
            {
                name: "Export",
                url: "/dentalExport",
                icon:  "fa-solid fa-file-export",
                permissions: [
                    "dental_view"
                ]
            },
            {
                name: "Past Records",
                url: "/dentalArchived",
                icon:  "fa-solid fa-box-archive",
                permissions: [
                    "dental_view"
                ]
            },
        ]
    },
];
export const environment = process.env.NODE_ENV;
export const apiBaseUrl = (process.env.NODE_ENV == "test" || process.env.NODE_ENV == "production") ? "" : "http://localhost:3000";

// Auth0 SPA configuration, selected per environment (like apiBaseUrl above)
// rather than via .env. domain / clientId / audience are public client
// identifiers (not secrets), so they live here. The `audience` MUST match the
// API's AUTH_AUDIENCE so the access token is accepted by the backend.
const auth0Configs = {
    development: {
        domain: "icefoganalytics.us.auth0.com",
        clientId: "UMwwor9ytM9ruJTkX21gqtNHw4g0H4gt",
        audience: "development",
    },
    test: {
        domain: "",
        clientId: "",
        audience: "",
    },
    production: {
        domain: "",
        clientId: "",
        audience: "",
    },
};

const auth0Config = auth0Configs[process.env.NODE_ENV] || auth0Configs.development;

export const auth0Domain = auth0Config.domain;
export const auth0ClientId = auth0Config.clientId;
export const auth0Audience = auth0Config.audience;
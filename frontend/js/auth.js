
(function () {
    if (window.PROCONNECT_AUTH_INITIALIZED) {
        return;
    }
    window.PROCONNECT_AUTH_INITIALIZED = true;
    function isAuthenticated() {
        return !!window.getToken();

    }

    function getCurrentUser() {
        try {
            const user = localStorage.getItem("user");
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error("User data parsing failed:", error);
            return null;
        }
    }

    async function fetchCurrentUser() {
        try {
            const data = await window.apiGet("/auth/me",{ redirectOn401: false });
            if (!data) {
                return null;
            }
            const user = data.user || data;
            if (!user) {
                return null;
            }
            localStorage.setItem("user",JSON.stringify(user));
            return user;
        } catch (error) {
            console.error("Unable to fetch current user:",error);
            return null;
        }

    }


    async function requireAuth(options = {}) {
        const {
            redirect = true,
            refreshUser = false
        } = options;
        if (!isAuthenticated()) {
            if (redirect) {
                window.location.replace("/auth/login.html");
            }
            return null;
        }

        let user = getCurrentUser();
        if (refreshUser || !user) {
            user = await fetchCurrentUser();
        }

        if (!user) {
            if (redirect) {
                window.location.replace("/auth/login.html");
            }
            return null;
        }
        return user;
    }

    function getUserRole() {
        const user = getCurrentUser();
        return (user?.role || "user").toString().toLowerCase().trim();
    }


    function hasRole(...roles) {
        const currentRole = getUserRole()
        return roles.map(role => role.toLowerCase()).includes(currentRole);
    }


    function redirectByRole(user = getCurrentUser()) {
        if (!user) {
            window.location.replace("/auth/login.html");
            return;
        }

        const role = (user.role || "user").toString().toLowerCase().trim();
        const routes = {
            admin: "/admin/dashboard.html",
            recruiter: "/recruiter/dashboard.html",
            user: "/pages/feed.html"
        };

        window.location.replace( routes[role] || routes.user);
    }


    async function requireRole(...allowedRoles) {
        const user = await requireAuth();
        if (!user) {
            return null;
        }

        const role = (user.role || "user").toString().toLowerCase().trim();
        const allowed = allowedRoles.map(
            item => item.toLowerCase()
        );

        if (!allowed.includes(role)) {
            console.warn("Access denied. User role:",role);
            window.location.replace("/pages/feed.html");
            return null;

        }

        return user;

    }


    async function logout() {
        try {
            if (typeof window.apiPost === "function") {
                await window.apiPost(
                    "/auth/logout",
                    {},
                    { redirectOn401: false }
                );
            }

        } catch (error) {
            console.warn("Server logout request failed:",error.message );
        } finally {
            window.clearAuth();
            sessionStorage.removeItem("pendingVerificationEmail");
            window.location.replace("/auth/login.html");
        }

    }

    function googleLogin() {
        const apiBase =window.PROCONNECT_CONFIG?.API_BASE_URL || window.API;
        if (!apiBase) {
            console.error("API configuration missing");
            return;
        }
        window.location.href = `${apiBase}/auth/google`;
    }


    function updateCurrentUser(updatedUser) {
        if (!updatedUser) {
            return;
        }
        localStorage.setItem("user",JSON.stringify(updatedUser));

    }


    window.ProConnectAuth = {
        isAuthenticated,
        getCurrentUser,
        fetchCurrentUser,
        requireAuth,
        getUserRole,
        hasRole,
        redirectByRole,
        requireRole,
        logout,
        googleLogin,
         updateCurrentUser
    };

    window.googleLogin = googleLogin;
    window.logout = logout;
    window.requireAuth = requireAuth;
    console.log(
        "ProConnect Authentication initialized"
    );

})();


(function () {
  "use strict";

  if (window.PROCONNECT_API_INITIALIZED) return;
  window.PROCONNECT_API_INITIALIZED = true;

  const API_BASE =
    window.PROCONNECT_CONFIG?.API_BASE_URL ||
    window.API ||
    `${window.location.origin}/api`;

  let refreshPromise = null;

  function getToken() {
    return localStorage.getItem("accessToken");
  }

  function setToken(token) {
    if (token && typeof token === "string") {
      localStorage.setItem("accessToken", token);
    }
  }

  function clearAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }

  async function refreshAccessToken() {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const response = await fetch(
          `${API_BASE}/auth/refresh`,
          {
            method: "POST",
            credentials: "include"
          }
        );

        if (!response.ok) {
          throw new Error("Refresh token expired");
        }

        const data = await response.json();

        if (!data.accessToken) {
          throw new Error("Access token missing");
        }

        setToken(data.accessToken);

        return data.accessToken;

      })().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  }


  async function apiRequest(url, options = {}, retry = true) {

    if (
      typeof options !== "object" ||
      options === null ||
      Array.isArray(options)
    ) {
      throw new Error("Invalid API options");
    }

    const {
      redirectOn401 = true,
      timeout = 15000,
      ...requestOptions
    } = options;

    const method = (
      requestOptions.method || "GET"
    ).toUpperCase();

    const isFormData =
      typeof FormData !== "undefined" &&
      requestOptions.body instanceof FormData;

    const headers = {
      ...(getToken()
        ? { Authorization: `Bearer ${getToken()}` }
        : {}),
      ...(requestOptions.headers || {})
    };

    if (
      !isFormData &&
      requestOptions.body &&
      !headers["Content-Type"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    const endpoint = `${API_BASE}${url}`;

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      timeout
    );

    const config = {
      ...requestOptions,
      method,
      headers,
      credentials: "include",
      signal: controller.signal,
      body: ["GET", "HEAD"].includes(method)
        ? undefined
        : requestOptions.body
    };

    try {

      console.log(`📡 API: ${method} ${url}`);

      let response = await fetch(endpoint, config);

      clearTimeout(timer);

      const excludedRoutes = [
        "/auth/login",
        "/auth/register",
        "/auth/refresh",
        "/auth/logout"
      ];

      const shouldRefresh =
        response.status === 401 &&
        retry &&
        !excludedRoutes.some(route => url.startsWith(route));

      if (shouldRefresh) {

        try {

          const newToken = await refreshAccessToken();

          const retryController = new AbortController();

          const retryTimer = setTimeout(
            () => retryController.abort(),
            timeout
          );

          try {
            response = await fetch(endpoint, {
              ...config,
              signal: retryController.signal,
              headers: {
                ...headers,
                Authorization: `Bearer ${newToken}`
              }
            });
          } finally {
            clearTimeout(retryTimer);
          }

        } catch (error) {

          clearAuth();

          if (redirectOn401) {
            window.location.replace("/auth/login.html");
          }

          throw new Error("Session expired. Please log in again.");
        }
      }

      if (response.status === 401) {

        if (redirectOn401) {
          clearAuth();
          window.location.replace("/auth/login.html");
        }

        throw new Error("Unauthorized");
      }


      if (response.status === 204) {
        return {};
      }

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Request failed: ${response.status}`
        );
      }

      return data;

    } catch (error) {

      clearTimeout(timer);

      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }

      console.error(
        `❌ API ERROR [${method} ${url}]:`,
        error.message
      );

      throw error;
    }
  }

  function apiGet(url, options = {}) {
    return apiRequest(url, {
      ...options,
      method: "GET"
    });
  }

  function apiPost(url, body, options = {}) {
    return apiRequest(url, {
      ...options,
      method: "POST",
      body: body instanceof FormData
        ? body
        : JSON.stringify(body)
    });
  }

  function apiPut(url, body, options = {}) {
    return apiRequest(url, {
      ...options,
      method: "PUT",
      body: body instanceof FormData
        ? body
        : JSON.stringify(body)
    });
  }

  function apiDelete(url, options = {}) {
    return apiRequest(url, {
      ...options,
      method: "DELETE"
    });
  }

  window.getToken = getToken;
  window.setToken = setToken;
  window.clearAuth = clearAuth;

  window.api = apiRequest;
  window.apiRequest = apiRequest;
  window.authFetch = apiRequest;

  window.apiGet = apiGet;
  window.apiPost = apiPost;
  window.apiPut = apiPut;
  window.apiDelete = apiDelete;

  console.log("✅ ProConnect API initialized:", API_BASE);

})();
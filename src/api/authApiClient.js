import { api } from './baseApiClient';

export const refreshToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        return null;
    }

    try {
        const res = await fetch(api('/api/auth/refresh'), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        });

        if (!res.ok) {
            return null;
        }

        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
        return data.token;
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
};

export const ensureValidToken = async () => {
    let token = localStorage.getItem("token");
    if (!token) {
        return null;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            token = await refreshToken();
        }
    } catch (error) {
        token = await refreshToken();
    }

    return token;
};

export const login = async (username, password) => {
    try {
        const response = await fetch(api('/api/auth/login'), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const rawBody = await response.text();
        let data = null;

        if (rawBody) {
            try {
                data = JSON.parse(rawBody);
            } catch (parseError) {
                console.warn("Login response was not valid JSON", parseError);
            }
        }

        if (response.ok) {
            if (!data) {
                return { success: false, message: "Unexpected login response." };
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);
            localStorage.setItem("refreshToken", data.refreshToken);
            return { success: true, token: data.token, username: data.username };
        } else {
            const message = data?.message || "Login failed. Please try again.";
            return { success: false, message };
        }
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, message: "An error occurred during login." };
    }
};

export const signup = async (username, password) => {
    try {
        const response = await fetch(api('/api/auth/signup'), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error("Signup error:", error);
        return { success: false, message: "An error occurred during signup." };
    }
};

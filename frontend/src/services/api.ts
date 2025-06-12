import axios from "axios";
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
            return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
        }
        return Promise.reject(error);
    }
);

export const attackService = {
    executeAttack: async (command: string, parameters: Record<string, any>) => {
        return api.post("/api/attacks", { command, parameters });
    },

    stopAttack: async (id: string) => {
        return api.delete(`/api/attacks/${id}`);
    },

    getStatus: async (id: string) => {
        return api.get(`/api/attacks/${id}/status`);
    },

    listAttacks: async () => {
        return api.get("/api/attacks");
    }
};

export const authService = {
    changePassword: async (currentPassword: string, newPassword: string) => {
        return api.put("/api/auth/change-password", { 
            currentPassword, 
            newPassword 
        });
    }
};

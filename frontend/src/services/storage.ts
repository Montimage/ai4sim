class StorageService {
    private readonly prefix = "ai4sim_";

    set<T>(key: string, value: T): void {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(this.prefix + key, serialized);
        } catch (error) {
            console.error(`Error saving to localStorage:`, error);
        }
    }

    get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error reading from localStorage:`, error);
            return null;
        }
    }

    remove(key: string): void {
        localStorage.removeItem(this.prefix + key);
    }

    clear(): void {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => localStorage.removeItem(key));
    }
}

export const storage = new StorageService();

export const createStorage = <T>() => ({
    getItem: async (name: string): Promise<T | null> => {
        const str = localStorage.getItem(name);
        return str ? JSON.parse(str) : null;
    },
    setItem: async (name: string, value: T): Promise<void> => {
        localStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: async (name: string): Promise<void> => {
        localStorage.removeItem(name);
    },
});

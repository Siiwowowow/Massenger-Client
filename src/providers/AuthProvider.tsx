//src/providers/AuthProvider.tsx
"use client";

import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { logoutUser } from "@/features/auth/services/auth.services";
import { ICurrentUser } from "@/features/user/types/user.types";

interface AuthContextType {
    user: ICurrentUser | null;
    setUser: (user: ICurrentUser | null) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
    children, 
    initialUser 
}: { 
    children: React.ReactNode; 
    initialUser: ICurrentUser | null;
}) {
    const [user, setUser] = useState<ICurrentUser | null>(initialUser);

    const logout = useCallback(async () => {
        setUser(null);
        await logoutUser();
        window.location.href = "/login";
    }, []);

    const contextValue = useMemo(() => ({
        user,
        setUser,
        logout,
    }), [user, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
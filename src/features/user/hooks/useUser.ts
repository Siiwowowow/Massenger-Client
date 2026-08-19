// src/features/user/hooks/useUser.ts
import { useAuth } from "@/providers/AuthProvider";
import { ICurrentUser } from "@/features/user/types/user.types";

export const useUser = () => {
    const { user, setUser, logout } = useAuth();
    
    return { 
        user, 
        setUser: setUser as (user: ICurrentUser | null) => void,
        logout 
    };
};

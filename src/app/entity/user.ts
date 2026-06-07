export class User {
    id: string;
    name: string;
    level: number;
    role: string;
    // email: string;
    email_verified: boolean;
    sub: string;

    constructor(id: string, name: string, role: string, email_verified: boolean) {
        this.id = id;
        this.name = name;
        this.role = role;
        // this.email = email;
        this.email_verified = email_verified;
    }

    static LEVEL_INVALID = -1;
    static LEVEL_DEFAULT = 0;
    static LEVEL_USER = 1;
    static LEVEL_ADMIN = 2;
    static LEVEL_SUPER_USER = 3;

    static GUEST_ROLE = 'Guest';
    static INVITED_ROLE = 'Invited';
    static ADMIN_ROLE = 'Admin';
    static SUPER_ADMIN_ROLE = 'SuperAdmin';
    static ID_INITIAL_USER = 'InitialUserId';

    // Role hierarchy used by route guards. Higher number means more privilege.
    static ROLE_RANK: { [role: string]: number } = {
        [User.GUEST_ROLE]: 0,
        [User.INVITED_ROLE]: 1,
        [User.ADMIN_ROLE]: 2,
        [User.SUPER_ADMIN_ROLE]: 3,
    };

    static isLoggedIn(user: User | null): boolean {
        return !!user && user.id !== User.ID_INITIAL_USER;
    }

    static satisfiesRole(role: string, minRole: string): boolean {
        const have = User.ROLE_RANK[role] ?? -1;
        const need = User.ROLE_RANK[minRole] ?? 0;
        return have >= need;
    }
}

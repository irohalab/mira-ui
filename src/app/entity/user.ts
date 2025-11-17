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
}

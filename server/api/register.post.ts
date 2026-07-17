import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { users } from "../database/schema";
import { userSettings } from "../database/schema";

let registrationQueue = Promise.resolve();

async function withRegistrationLock<T>(callback: () => Promise<T>) {
    const previousRegistration = registrationQueue;
    let releaseLock!: () => void;
    registrationQueue = new Promise<void>((resolve) => {
        releaseLock = resolve;
    });

    await previousRegistration;

    try {
        return await callback();
    } finally {
        releaseLock();
    }
}

function isValidEmail(email: string) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string) {
    return username.length >= 3
        && username.length <= 40
        && /^[a-zA-Z0-9_.-]+$/.test(username);
}

export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "register", 5, 60_000);

    const body = await readBody(event);

    const { username, password, email, challengeToken } = body;
    const usernameValue = String(username ?? "").trim();
    const emailAddress = String(email ?? "").trim().toLowerCase();
    const passwordValue = String(password ?? "");

    if (!usernameValue || !emailAddress || !passwordValue) {
        throw createError({
            status: 400,
            statusText: "Username, email, and password are required."
        })
    }

    if (!isValidUsername(usernameValue)) {
        throw createError({
            status: 400,
            statusText: "Username must be 3-40 characters and only use letters, numbers, dots, underscores, or hyphens."
        })
    }

    if (!isValidEmail(emailAddress)) {
        throw createError({
            status: 400,
            statusText: "A valid email is required."
        })
    }

    if (passwordValue.length < 8 || passwordValue.length > 200) {
        throw createError({
            status: 400,
            statusText: "Password must be between 8 and 200 characters."
        })
    }

    if (!challengeToken || !consumeSignupChallengeToken(String(challengeToken), getClientAddress(event))) {
        throw createError({
            status: 400,
            statusText: "Complete the signup challenge before creating an account."
        })
    }

    const hashedPassword = await bcrypt.hash(passwordValue, 10);

    const newUser = await withRegistrationLock(async () => {
        const existingEmail = await useDrizzle()
            .select()
            .from(users)
            .where(eq(users.email, emailAddress))
            .get();

        if (existingEmail) {
            throw createError({
                status: 409,
                statusText: "An account with this email already exists."
            })
        }

        const existingUsername = await useDrizzle()
            .select()
            .from(users)
            .where(eq(users.name, usernameValue))
            .get();

        if (existingUsername) {
            throw createError({
                status: 409,
                statusText: "This username is already taken."
            })
        }

        const adminCount = await useDrizzle()
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "admin"))
            .get();
        const initialAdminEmail = String(process.env.INITIAL_ADMIN_EMAIL ?? "").trim().toLowerCase();
        const role = Number(adminCount?.count ?? 0) === 0
            && Boolean(initialAdminEmail)
            && emailAddress === initialAdminEmail
            ? "admin"
            : "user";

        return await useDrizzle().insert(users).values({
            name: usernameValue,
            password: hashedPassword,
            email: emailAddress,
            role
        }).returning().get();
    });

    setHeader(event, "Cache-Control", "no-store");

    await useDrizzle().insert(userSettings).values({
        userID: String(newUser.id),
        colorMode: "light",
        searchVisible: "true"
    }).returning().get();


    return {
        newUser: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            createdAt: newUser.createdAt
        }
    };
});

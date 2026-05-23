import { desc, eq } from 'drizzle-orm';
import { users } from '../database/schema';
import { User } from '../utils/useDrizzle';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
export default defineEventHandler(async (event) => {
    enforceRateLimit(event, "login", 10, 60_000);

    const body = await readBody(event);

    const { email, username, password } = body;
    const emailAddress = String(email ?? "").trim().toLowerCase();
    const usernameValue = String(username ?? "").trim();
    const passwordValue = String(password ?? "");

    if (!usernameValue && !emailAddress) {
        throw createError({
            status: 400,
            statusText: "An email or username must be provided."
        })
    }

    if (!passwordValue) {
        throw createError({
            status: 400,
            statusText: "A password must be provided!"
        })
    }

    if (emailAddress.length > 254 || usernameValue.length > 80 || passwordValue.length > 200) {
        throw createError({
            status: 400,
            statusText: "Invalid login request."
        })
    }

    let user: User | undefined | null = null;
    if (usernameValue) {
        user = await useDrizzle()
            .select()
            .from(users)
            .where(eq(users.name, usernameValue))
            .orderBy(desc(users.id))
            .get();
    }

    if (emailAddress) {
        user = await useDrizzle()
            .select()
            .from(users)
            .where(eq(users.email, emailAddress))
            .orderBy(desc(users.id))
            .get();
    }

    if (!user) {
        throw createError({
            status: 404,
            statusText: "User could not be found!"
        })
    }

    const verificiation = await bcrypt.compare(passwordValue, user.password ?? '')
    if (!verificiation) {
        throw createError({
            status: 400,
            statusText: "Password is not correct."
        })
    }
 
    const token = jwt.sign({
        username: user.name,
        emailAddress: user.email,
        id: user.id,
        role: user.role
    }, process.env.JSON_SECRET_KEY!, { algorithm: "HS256", expiresIn: "48h" })

    setCookie(event, "token", token, {
        maxAge: 172800,
        sameSite: "strict",
        path: "/",
        secure: process.env.COOKIE_SECURE === "true" || getRequestHeader(event, "x-forwarded-proto") === "https",
        httpOnly: true
    });

    return { success: true }
});

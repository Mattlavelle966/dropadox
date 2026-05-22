import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "../database/schema";
import { userSettings } from "../database/schema";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { username, password, email } = body;

    if (!username || !email || !password) {
        throw createError({
            status: 400,
            statusText: "Username, email, and password are required."
        })
    }

    const existingEmail = await useDrizzle()
        .select()
        .from(users)
        .where(eq(users.email, email))
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
        .where(eq(users.name, username))
        .get();

    if (existingUsername) {
        throw createError({
            status: 409,
            statusText: "This username is already taken."
        })
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await useDrizzle().insert(users).values({
        name: username,
        password: hashedPassword,
        email: email
    }).returning().get();


    await useDrizzle().insert(userSettings).values({
        userID: String(newUser.id),
        colorMode: "light"
    }).returning().get();


    return {
        newUser: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            createdAt: newUser.createdAt
        }
    };
});

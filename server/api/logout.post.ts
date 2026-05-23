export default defineEventHandler((event) => {
    deleteCookie(event, "token", {
        path: "/"
    });

    return { success: true };
});

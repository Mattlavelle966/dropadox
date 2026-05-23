function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function safeHref(value: string) {
    const href = value.trim();
    return (href.startsWith("/") && !href.startsWith("//"))
        || href.startsWith("https://")
        || href.startsWith("http://")
        ? href
        : "#";
}

function inlineMarkdown(value: string) {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
            return `<a href="${escapeHtml(safeHref(href))}" rel="noopener noreferrer">${label}</a>`;
        });
}

export function renderSafeMarkdown(markdown = "") {
    const lines = markdown.trim().split(/\r?\n/);
    const html: string[] = [];
    let listOpen = false;

    function closeList() {
        if (listOpen) {
            html.push("</ul>");
            listOpen = false;
        }
    }

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            closeList();
            continue;
        }

        if (trimmed.startsWith("### ")) {
            closeList();
            html.push(`<h4>${inlineMarkdown(trimmed.slice(4))}</h4>`);
        } else if (trimmed.startsWith("## ")) {
            closeList();
            html.push(`<h3>${inlineMarkdown(trimmed.slice(3))}</h3>`);
        } else if (trimmed.startsWith("# ")) {
            closeList();
            html.push(`<h2>${inlineMarkdown(trimmed.slice(2))}</h2>`);
        } else if (trimmed.startsWith("- ")) {
            if (!listOpen) {
                html.push("<ul>");
                listOpen = true;
            }
            html.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
        } else {
            closeList();
            html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
        }
    }

    closeList();
    return html.join("");
}

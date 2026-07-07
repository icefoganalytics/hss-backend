// Minimal structured logger.
//
// Replaces scattered `console.log(e)` calls (audit LOW-01) that dumped raw error
// objects — which, for Oracle errors, can echo SQL fragments and bound values
// containing PHI/PII. This logger emits a single structured line per event and
// logs only an error's name/message/stack (never request or response bodies),
// and gives one central place to extend redaction later.

type Level = "info" | "warn" | "error";

function emit(level: Level, message: string, err?: unknown): void {
    const entry: Record<string, unknown> = {
        level,
        time: new Date().toISOString(),
        message,
    };

    if (err instanceof Error) {
        entry.errorName = err.name;
        entry.errorMessage = err.message;
        entry.stack = err.stack;
    } else if (err !== undefined && err !== null) {
        entry.error = String(err);
    }

    const line = JSON.stringify(entry);

    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
}

export const logger = {
    info: (message: string) => emit("info", message),
    warn: (message: string, err?: unknown) => emit("warn", message, err),
    error: (message: string, err?: unknown) => emit("error", message, err),
};

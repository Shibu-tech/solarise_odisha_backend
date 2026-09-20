// Global error-handling middleware
// Maps PostgreSQL error codes to clean HTTP responses
// Must be mounted LAST in server.js: app.use(errorHandler)

const errorHandler = (err, req, res, next) => {
    // Log full error for server-side debugging
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

    // Multer / File upload errors
    if (err.name === "MulterError" || err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            success: false,
            error: err.code === "LIMIT_FILE_SIZE"
                ? "File size exceeds allowed limit (maximum 10MB)"
                : err.message || "File upload error",
        });
    }

    if (err.message && err.message.includes("Unsupported file type")) {
        return res.status(400).json({
            success: false,
            error: err.message,
        });
    }

    // PostgreSQL error codes (from 'pg' driver)
    if (err.code) {
        switch (err.code) {
            // Unique constraint violation (e.g. duplicate email, phone, consumer_id)
            case "23505":
                return res.status(409).json({
                    success: false,
                    error: "A record with this value already exists",
                    detail: err.detail || null,
                    constraint: err.constraint || null,
                });

            // Foreign key violation (e.g. referencing non-existent user, area_block, project)
            case "23503":
                return res.status(400).json({
                    success: false,
                    error: "Referenced record does not exist",
                    detail: err.detail || null,
                    constraint: err.constraint || null,
                });

            // CHECK constraint violation (e.g. age BETWEEN 18 AND 120, amount >= 0, aadhaar/pan regex)
            case "23514":
                return res.status(400).json({
                    success: false,
                    error: "Value out of allowed range or failed validation",
                    detail: err.detail || null,
                    constraint: err.constraint || null,
                });

            // NOT NULL violation (e.g. missing required fields like first_name, phone_primary)
            case "23502":
                return res.status(400).json({
                    success: false,
                    error: "Required field is missing",
                    detail: err.detail || null,
                    column: err.column || null,
                });

            // Invalid input syntax for enum (e.g. invalid role, payment_mode, project_status)
            case "22P02":
                return res.status(400).json({
                    success: false,
                    error: "Invalid value for this field",
                    detail: err.message || null,
                });

            // Undefined table
            case "42P01":
                return res.status(500).json({
                    success: false,
                    error: "Database configuration error",
                });

            // Undefined column
            case "42703":
                return res.status(500).json({
                    success: false,
                    error: "Database configuration error — unknown column",
                });

            // String data right truncation (e.g. phone exceeding VARCHAR(15))
            case "22001":
                return res.status(400).json({
                    success: false,
                    error: "Value too long for this field",
                    detail: err.detail || null,
                });

            default:
                // Catch any other PG errors not explicitly handled
                return res.status(500).json({
                    success: false,
                    error: "Database error",
                    code: err.code,
                    detail: err.detail || null,
                });
        }
    }

    // JWT / Auth errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            error: "Invalid token",
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            error: "Token has expired",
        });
    }

    // Express JSON parse errors (malformed request body)
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            error: "Invalid JSON in request body",
        });
    }

    // Custom application errors with status code
    if (err.status || err.statusCode) {
        const status = err.status || err.statusCode;
        return res.status(status).json({
            success: false,
            error: err.message || "An error occurred",
        });
    }

    // Fallback — generic 500
    return res.status(500).json({
        success: false,
        error: "Internal server error",
    });
};

export default errorHandler;

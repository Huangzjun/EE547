class ApiError extends Error {
    constructor(message) {
        super(message);
        this.name = "ApiError";
    }
}

class EntityNotFoundError extends ApiError {
    constructor(message) {
        super(message);
        this.name = "EntityNotFoundError";
    }
}

module.exports = { ApiError, EntityNotFoundError };

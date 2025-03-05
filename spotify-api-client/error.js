class EntityNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "EntityNotFoundError";
    }
}

class ApiError extends Error {
    constructor(message) {
        super(message);
        this.name = "ApiError";
    }
}

module.exports = { ApiError, EntityNotFoundError };

// class ApiError extends Error{
//     constructor(
//         statusCode,
//         message = "Something went wrong",
//         error = [],
//         stack = "No stack trace available",
//     ) {
//         super(message);
//         this.statusCode = statusCode;
//         this.data = null
//         this.message = message;
//         this.error = error;
//         this.sucuess = false;

//         if (stack) {
//             this.stack = stack;
//         } else {
//             Error.captureStackTrace(this, this.constructor);
//         }
//     }
// }

// export { ApiError };

class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        error = [],
        stack = null
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.error = error;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };
import { AppError } from "../errors/app-error.js";

export function validateRequest(schema, property = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      return next(
        new AppError(400, "VALIDATION_ERROR", "Request validation failed", result.error.flatten())
      );
    }

    req[property] = result.data;
    next();
  };
}

export function validatePagination({ defaultPageSize = 24, maxPageSize = 100 } = {}) {
  return (req, res, next) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? defaultPageSize);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
      return next(new AppError(400, "VALIDATION_ERROR", `page must be positive and pageSize must be between 1 and ${maxPageSize}`));
    }
    req.pagination = { page, pageSize, skip: (page - 1) * pageSize };
    next();
  };
}

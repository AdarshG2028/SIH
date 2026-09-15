const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  console.error(err);

  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    ...(err.details !== undefined ? { details: err.details } : {}),
  });
};

module.exports = errorHandler;

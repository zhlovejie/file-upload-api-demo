function responseMiddleware(req, res, next) {
  res.success = (data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  };

  next();
}

module.exports = responseMiddleware;

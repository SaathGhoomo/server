const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check if req.user.role is included in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // If allowed → call next()
    next();
  };
};

export { authorizeRoles };

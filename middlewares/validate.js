const { body, validationResult } = require('express-validator');

// Validation rules
const validationRules = {
  register: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Name must be between 3 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  createBooking: [
    body('partnerId')
      .isMongoId()
      .withMessage('Invalid partner ID'),
    body('date')
      .isISO8601()
      .withMessage('Invalid date format'),
    body('startTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid start time format (HH:MM)'),
    body('endTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid end time format (HH:MM)')
  ],

  partnerApply: [
    body('bio')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Bio must be between 10 and 500 characters'),
    body('hourlyRate')
      .isNumeric()
      .withMessage('Hourly rate must be a number')
      .isFloat({ min: 100, max: 10000 })
      .withMessage('Hourly rate must be between 100 and 10000'),
    body('city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters')
  ],

  withdrawalRequest: [
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .isFloat({ min: 100, max: 50000 })
      .withMessage('Amount must be between 100 and 50000'),
    body('upiId')
      .matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/)
      .withMessage('Invalid UPI ID format')
  ]
};

// Validation middleware
const validate = (rules) => {
  return async (req, res, next) => {
    await Promise.all(rules.map(rule => rule.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    next();
  };
};

module.exports = { validationRules, validate };

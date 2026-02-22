import Joi from 'joi';

// Common validation schemas
export const schemas = {
  // User registration
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 50 characters'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address'
    }),
    password: Joi.string().min(6).max(128).required().messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 128 characters'
    }),
    role: Joi.string().valid('user').default('user')
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address'
    }),
    password: Joi.string().min(6).max(128).required().messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 128 characters'
    })
  }),

  // Booking creation
  createBooking: Joi.object({
    partnerId: Joi.string().required().messages({
      'string.empty': 'Partner ID is required'
    }),
    date: Joi.date().iso().min('now').required().messages({
      'date.empty': 'Date is required',
      'date.min': 'Date cannot be in the past'
    }),
    startTime: Joi.string().required().messages({
      'string.empty': 'Start time is required'
    }),
    endTime: Joi.string().required().messages({
      'string.empty': 'End time is required'
    }),
    message: Joi.string().max(500).optional().messages({
      'string.max': 'Message cannot exceed 500 characters'
    })
  }),

  // Partner application
  partnerApplication: Joi.object({
    bio: Joi.string().min(10).max(1000).required().messages({
      'string.empty': 'Bio is required',
      'string.min': 'Bio must be at least 10 characters',
      'string.max': 'Bio cannot exceed 1000 characters'
    }),
    hourlyRate: Joi.number().min(100).max(10000).required().messages({
      'number.base': 'Hourly rate must be a number',
      'number.min': 'Hourly rate must be at least ₹100',
      'number.max': 'Hourly rate cannot exceed ₹10,000'
    }),
    interests: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    city: Joi.string().min(2).max(50).required().messages({
      'string.empty': 'City is required',
      'string.min': 'City must be at least 2 characters',
      'string.max': 'City cannot exceed 50 characters'
    }),
    experience: Joi.string().min(10).max(1000).required().messages({
      'string.empty': 'Experience is required',
      'string.min': 'Experience must be at least 10 characters',
      'string.max': 'Experience cannot exceed 1000 characters'
    })
  }),

  // Review creation
  createReview: Joi.object({
    bookingId: Joi.string().required().messages({
      'string.empty': 'Booking ID is required'
    }),
    rating: Joi.number().min(1).max(5).required().messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5'
    }),
    comment: Joi.string().max(1000).optional().messages({
      'string.max': 'Comment cannot exceed 1000 characters'
    })
  }),

  // Payment verification
  paymentVerification: Joi.object({
    razorpay_payment_id: Joi.string().required().messages({
      'string.empty': 'Payment ID is required'
    }),
    razorpay_order_id: Joi.string().required().messages({
      'string.empty': 'Order ID is required'
    }),
    razorpay_signature: Joi.string().required().messages({
      'string.empty': 'Signature is required'
    })
  })
};

// Validation middleware factory
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source]);
    
    if (error) {
      console.log(`Validation error (${source}):`, error.details);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        errors: error.details.map(d => ({ field: d.path, message: d.message }))
      });
    }
    
    // Sanitize the validated data
    req[source] = sanitizeInput(value);
    next();
  };
};

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      if (typeof input[key] === 'string') {
        sanitized[key] = input[key].trim().replace(/[<>]/g, '');
      } else {
        sanitized[key] = input[key];
      }
    }
    return sanitized;
  }
  return input;
};

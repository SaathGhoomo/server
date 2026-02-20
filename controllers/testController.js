import Test from '../models/Test.js';

export const createTestData = async (req, res) => {
  try {
    const { name, message } = req.body;

    // String validation before DB insertion
    if (name === undefined || name === null) {
      return res.status(400).json({
        success: false,
        message: 'name is required',
        data: {},
      });
    }
    if (message === undefined || message === null) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
        data: {},
      });
    }
    if (typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'name must be a string',
        data: {},
      });
    }
    if (typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'message must be a string',
        data: {},
      });
    }

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'name cannot be empty',
        data: {},
      });
    }
    if (trimmedMessage.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'message cannot be empty',
        data: {},
      });
    }

    const testDoc = await Test.create({
      name: trimmedName,
      message: trimmedMessage,
    });

    return res.status(200).json({
      success: true,
      message: 'Test data created successfully',
      data: testDoc,
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating test data',
      data: {},
    });
  }
};

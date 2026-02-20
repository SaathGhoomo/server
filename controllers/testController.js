import Test from '../models/Test.js';

export const createTestData = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid input: name and email are required, name must be a string.',
      });
    }

    const testDoc = await Test.create({ name, email });

    return res.status(200).json({
      success: true,
      data: testDoc,
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating test data.',
    });
  }
};


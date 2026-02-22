import Review from '../models/Review.js';
import Partner from '../models/Partner.js';

// Calculate and update partner's average rating and total reviews
export const calculatePartnerRating = async (partnerId) => {
  try {
    console.log('=== CALCULATING PARTNER RATING ===');
    console.log('Partner ID:', partnerId);

    // Get all reviews for this partner
    const reviews = await Review.find({ partner: partnerId });
    
    if (reviews.length === 0) {
      // If no reviews, set defaults
      await Partner.findByIdAndUpdate(partnerId, {
        averageRating: 0,
        totalReviews: 0
      });
      console.log('No reviews found, setting rating to 0');
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Update partner with new rating
    await Partner.findByIdAndUpdate(partnerId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: reviews.length
    });

    console.log(`Partner ${partnerId} rating updated: ${averageRating.toFixed(1)} (${reviews.length} reviews)`);
    
  } catch (error) {
    console.error('Error calculating partner rating:', error);
    throw error;
  }
};

// Recalculate all partner ratings (for maintenance)
export const recalculateAllPartnerRatings = async () => {
  try {
    console.log('=== RECALCULATING ALL PARTNER RATINGS ===');
    
    const partners = await Partner.find({});
    
    for (const partner of partners) {
      await calculatePartnerRating(partner._id);
    }
    
    console.log(`Recalculated ratings for ${partners.length} partners`);
    
  } catch (error) {
    console.error('Error recalculating all partner ratings:', error);
    throw error;
  }
};

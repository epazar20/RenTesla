package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByReservationId(Long reservationId);

    List<Review> findByVehicleUuid(String vehicleUuid);

    List<Review> findByUserId(Long userId);

    List<Review> findByStatus(Review.ReviewStatus status);

    @Query("SELECT r FROM Review r WHERE r.vehicleUuid = :vehicleUuid AND r.status = 'PUBLISHED' " +
           "ORDER BY r.createdAt DESC")
    List<Review> findPublishedReviewsByVehicle(@Param("vehicleUuid") String vehicleUuid);

    @Query("SELECT r FROM Review r WHERE r.userId = :userId AND r.status = 'PUBLISHED' " +
           "ORDER BY r.createdAt DESC")
    List<Review> findPublishedReviewsByUser(@Param("userId") Long userId);

    @Query("SELECT r FROM Review r WHERE r.status = 'FLAGGED' ORDER BY r.createdAt ASC")
    List<Review> findFlaggedReviews();

    @Query("SELECT r FROM Review r WHERE r.status = 'PENDING_MODERATION' ORDER BY r.createdAt ASC")
    List<Review> findReviewsPendingModeration();

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.vehicleUuid = :vehicleUuid AND r.status = 'PUBLISHED'")
    Optional<Double> getAverageRatingByVehicle(@Param("vehicleUuid") String vehicleUuid);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.vehicleUuid = :vehicleUuid AND r.status = 'PUBLISHED'")
    long countPublishedReviewsByVehicle(@Param("vehicleUuid") String vehicleUuid);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.userId = :userId AND r.status = 'PUBLISHED'")
    long countPublishedReviewsByUser(@Param("userId") Long userId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.vehicleUuid = :vehicleUuid " +
           "AND r.status = 'PUBLISHED' GROUP BY r.rating ORDER BY r.rating DESC")
    List<Object[]> getRatingDistributionByVehicle(@Param("vehicleUuid") String vehicleUuid);

    @Query("SELECT r FROM Review r WHERE r.vehicleUuid = :vehicleUuid AND r.status = 'PUBLISHED' " +
           "AND r.rating >= :minRating ORDER BY r.createdAt DESC")
    List<Review> findReviewsByVehicleAndMinRating(@Param("vehicleUuid") String vehicleUuid,
                                                 @Param("minRating") Integer minRating);

    @Query("SELECT r FROM Review r WHERE r.isFlagged = true AND r.status != 'HIDDEN' " +
           "ORDER BY r.createdAt ASC")
    List<Review> findFlaggedReviewsNeedingAction();

    @Query("SELECT r FROM Review r WHERE r.reviewedByAdmin = :adminId ORDER BY r.updatedAt DESC")
    List<Review> findReviewsModeratedByAdmin(@Param("adminId") Long adminId);

    // Statistics
    @Query("SELECT COUNT(r) FROM Review r WHERE r.status = :status")
    long countByStatus(@Param("status") Review.ReviewStatus status);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.status = 'PUBLISHED'")
    Optional<Double> getOverallAverageRating();

    @Query("SELECT COUNT(r) FROM Review r WHERE r.createdAt >= :fromDate AND r.createdAt <= :toDate")
    long countReviewsByDateRange(@Param("fromDate") LocalDateTime fromDate,
                                @Param("toDate") LocalDateTime toDate);

    @Query("SELECT r.vehicleUuid, AVG(r.rating) as avgRating, COUNT(r) as reviewCount " +
           "FROM Review r WHERE r.status = 'PUBLISHED' GROUP BY r.vehicleUuid " +
           "HAVING COUNT(r) >= :minReviews ORDER BY avgRating DESC")
    List<Object[]> getTopRatedVehicles(@Param("minReviews") Long minReviews);

    @Query("SELECT r FROM Review r WHERE r.status = 'PUBLISHED' AND r.rating = 5 " +
           "ORDER BY r.createdAt DESC")
    List<Review> getFiveStarReviews();

    @Query("SELECT r FROM Review r WHERE r.status = 'PUBLISHED' AND r.rating <= 2 " +
           "ORDER BY r.createdAt DESC")
    List<Review> getLowRatedReviews();

    // Detailed ratings averages
    @Query("SELECT AVG(r.vehicleConditionRating) FROM Review r WHERE r.vehicleUuid = :vehicleUuid " +
           "AND r.status = 'PUBLISHED' AND r.vehicleConditionRating IS NOT NULL")
    Optional<Double> getAverageVehicleConditionRating(@Param("vehicleUuid") String vehicleUuid);

    @Query("SELECT AVG(r.serviceQualityRating) FROM Review r WHERE r.vehicleUuid = :vehicleUuid " +
           "AND r.status = 'PUBLISHED' AND r.serviceQualityRating IS NOT NULL")
    Optional<Double> getAverageServiceQualityRating(@Param("vehicleUuid") String vehicleUuid);

    @Query("SELECT AVG(r.communicationRating) FROM Review r WHERE r.vehicleUuid = :vehicleUuid " +
           "AND r.status = 'PUBLISHED' AND r.communicationRating IS NOT NULL")
    Optional<Double> getAverageCommunicationRating(@Param("vehicleUuid") String vehicleUuid);

    @Query("SELECT AVG(r.valueForMoneyRating) FROM Review r WHERE r.vehicleUuid = :vehicleUuid " +
           "AND r.status = 'PUBLISHED' AND r.valueForMoneyRating IS NOT NULL")
    Optional<Double> getAverageValueForMoneyRating(@Param("vehicleUuid") String vehicleUuid);

    boolean existsByReservationId(Long reservationId);

    boolean existsByUserIdAndVehicleUuid(Long userId, String vehicleUuid);
} 
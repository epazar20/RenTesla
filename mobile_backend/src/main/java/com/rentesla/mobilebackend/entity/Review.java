package com.rentesla.mobilebackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "reviews")
public class Review extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "reservation_id", nullable = false, unique = true)
    private Long reservationId;

    @NotNull
    @Column(name = "vehicle_uuid", nullable = false)
    private String vehicleUuid;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull
    @Min(1)
    @Max(5)
    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Size(max = 2000)
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ReviewStatus status = ReviewStatus.PUBLISHED;

    // Detailed ratings
    @Min(1)
    @Max(5)
    @Column(name = "vehicle_condition_rating")
    private Integer vehicleConditionRating;

    @Min(1)
    @Max(5)
    @Column(name = "service_quality_rating")
    private Integer serviceQualityRating;

    @Min(1)
    @Max(5)
    @Column(name = "communication_rating")
    private Integer communicationRating;

    @Min(1)
    @Max(5)
    @Column(name = "value_for_money_rating")
    private Integer valueForMoneyRating;

    // Moderation fields
    @Column(name = "is_flagged")
    private Boolean isFlagged = false;

    @Size(max = 500)
    @Column(name = "flag_reason")
    private String flagReason;

    @Column(name = "flagged_by")
    private Long flaggedBy;

    @Column(name = "reviewed_by_admin")
    private Long reviewedByAdmin;

    @Size(max = 1000)
    @Column(name = "admin_notes")
    private String adminNotes;

    // Helpful ratings
    @Column(name = "helpful_count")
    private Integer helpfulCount = 0;

    @Column(name = "not_helpful_count")
    private Integer notHelpfulCount = 0;

    // Vehicle owner response
    @Size(max = 1000)
    @Column(name = "owner_response", columnDefinition = "TEXT")
    private String ownerResponse;

    @Column(name = "owner_response_at")
    private java.time.LocalDateTime ownerResponseAt;

    @Column(name = "owner_id")
    private Long ownerId;

    // Verification
    @Column(name = "is_verified_rental")
    private Boolean isVerifiedRental = true;

    @Column(name = "is_anonymous")
    private Boolean isAnonymous = false;

    // Images
    @Size(max = 2000)
    @Column(name = "image_urls", columnDefinition = "TEXT")
    private String imageUrls; // JSON array of image URLs

    // Constructors
    public Review() {}

    public Review(Long reservationId, String vehicleUuid, Long userId, Integer rating) {
        this.reservationId = reservationId;
        this.vehicleUuid = vehicleUuid;
        this.userId = userId;
        this.rating = rating;
        this.status = ReviewStatus.PUBLISHED;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getReservationId() {
        return reservationId;
    }

    public void setReservationId(Long reservationId) {
        this.reservationId = reservationId;
    }

    public String getVehicleUuid() {
        return vehicleUuid;
    }

    public void setVehicleUuid(String vehicleUuid) {
        this.vehicleUuid = vehicleUuid;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public ReviewStatus getStatus() {
        return status;
    }

    public void setStatus(ReviewStatus status) {
        this.status = status;
    }

    public Integer getVehicleConditionRating() {
        return vehicleConditionRating;
    }

    public void setVehicleConditionRating(Integer vehicleConditionRating) {
        this.vehicleConditionRating = vehicleConditionRating;
    }

    public Integer getServiceQualityRating() {
        return serviceQualityRating;
    }

    public void setServiceQualityRating(Integer serviceQualityRating) {
        this.serviceQualityRating = serviceQualityRating;
    }

    public Integer getCommunicationRating() {
        return communicationRating;
    }

    public void setCommunicationRating(Integer communicationRating) {
        this.communicationRating = communicationRating;
    }

    public Integer getValueForMoneyRating() {
        return valueForMoneyRating;
    }

    public void setValueForMoneyRating(Integer valueForMoneyRating) {
        this.valueForMoneyRating = valueForMoneyRating;
    }

    public Boolean getIsFlagged() {
        return isFlagged;
    }

    public void setIsFlagged(Boolean isFlagged) {
        this.isFlagged = isFlagged;
    }

    public String getFlagReason() {
        return flagReason;
    }

    public void setFlagReason(String flagReason) {
        this.flagReason = flagReason;
    }

    public Long getFlaggedBy() {
        return flaggedBy;
    }

    public void setFlaggedBy(Long flaggedBy) {
        this.flaggedBy = flaggedBy;
    }

    public Long getReviewedByAdmin() {
        return reviewedByAdmin;
    }

    public void setReviewedByAdmin(Long reviewedByAdmin) {
        this.reviewedByAdmin = reviewedByAdmin;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }

    public Integer getHelpfulCount() {
        return helpfulCount;
    }

    public void setHelpfulCount(Integer helpfulCount) {
        this.helpfulCount = helpfulCount;
    }

    public Integer getNotHelpfulCount() {
        return notHelpfulCount;
    }

    public void setNotHelpfulCount(Integer notHelpfulCount) {
        this.notHelpfulCount = notHelpfulCount;
    }

    public String getOwnerResponse() {
        return ownerResponse;
    }

    public void setOwnerResponse(String ownerResponse) {
        this.ownerResponse = ownerResponse;
    }

    public java.time.LocalDateTime getOwnerResponseAt() {
        return ownerResponseAt;
    }

    public void setOwnerResponseAt(java.time.LocalDateTime ownerResponseAt) {
        this.ownerResponseAt = ownerResponseAt;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }

    public Boolean getIsVerifiedRental() {
        return isVerifiedRental;
    }

    public void setIsVerifiedRental(Boolean isVerifiedRental) {
        this.isVerifiedRental = isVerifiedRental;
    }

    public Boolean getIsAnonymous() {
        return isAnonymous;
    }

    public void setIsAnonymous(Boolean isAnonymous) {
        this.isAnonymous = isAnonymous;
    }

    public String getImageUrls() {
        return imageUrls;
    }

    public void setImageUrls(String imageUrls) {
        this.imageUrls = imageUrls;
    }

    // Enums
    public enum ReviewStatus {
        PUBLISHED,
        PENDING_MODERATION,
        HIDDEN,
        FLAGGED,
        REJECTED
    }
} 
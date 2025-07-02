package com.rentesla.mobilebackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Size(max = 100)
    @Column(name = "first_name")
    private String firstName;

    @Size(max = 100)
    @Column(name = "last_name")
    private String lastName;

    @Email
    @Size(max = 255)
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Size(max = 20)
    @Column(name = "phone")
    private String phone;

    @Size(max = 500)
    @Column(name = "address")
    private String address;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role = UserRole.CUSTOMER;

    // Tesla specific fields
    @Size(max = 255)
    @Column(name = "tesla_email")
    private String teslaEmail;

    // PRD: New fields for document verification and location
    @Column(name = "document_verified", nullable = false)
    private Boolean documentVerified = false;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "kyck_consent_given", nullable = false)
    private Boolean kvkkConsentGiven = false;

    @Column(name = "open_consent_given", nullable = false)
    private Boolean openConsentGiven = false;

    @Size(max = 100)
    @Column(name = "fcm_token")
    private String fcmToken;

    @Column(name = "fcm_token_updated_at")
    private java.time.LocalDateTime fcmTokenUpdatedAt;

    // Notification Settings
    @Column(name = "notification_rental_updates", nullable = false)
    private Boolean notificationRentalUpdates = true;

    @Column(name = "notification_promotions", nullable = false)
    private Boolean notificationPromotions = true;

    @Column(name = "notification_system_updates", nullable = false)
    private Boolean notificationSystemUpdates = true;

    // Privacy Settings
    @Column(name = "share_location", nullable = false)
    private Boolean shareLocation = true;

    @Column(name = "share_rental_history", nullable = false)
    private Boolean shareRentalHistory = true;

    @Column(name = "two_factor_auth_enabled", nullable = false)
    private Boolean twoFactorAuthEnabled = false;

    // Identity verification field (TC Kimlik No, etc.)
    @NotBlank(message = "Identity number is required")
    @Size(min = 10, max = 20, message = "Identity number must be between 10 and 20 characters")
    @Column(name = "identity_number", nullable = false, unique = true)
    private String identityNumber;

    // Password field for authentication
    @Size(max = 255)
    @Column(name = "password")
    private String password;

    // Constructors
    public User() {}

    public User(String firstName, String lastName, String email, String phone, String identityNumber) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.identityNumber = identityNumber;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getTeslaEmail() {
        return teslaEmail;
    }

    public void setTeslaEmail(String teslaEmail) {
        this.teslaEmail = teslaEmail;
    }

    // PRD: New getters and setters
    public Boolean getDocumentVerified() {
        return documentVerified;
    }

    public void setDocumentVerified(Boolean documentVerified) {
        this.documentVerified = documentVerified;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Boolean getKvkkConsentGiven() {
        return kvkkConsentGiven;
    }

    public void setKvkkConsentGiven(Boolean kvkkConsentGiven) {
        this.kvkkConsentGiven = kvkkConsentGiven;
    }

    public Boolean getOpenConsentGiven() {
        return openConsentGiven;
    }

    public void setOpenConsentGiven(Boolean openConsentGiven) {
        this.openConsentGiven = openConsentGiven;
    }

    public String getFcmToken() {
        return fcmToken;
    }

    public void setFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
        this.fcmTokenUpdatedAt = java.time.LocalDateTime.now();
    }

    public java.time.LocalDateTime getFcmTokenUpdatedAt() {
        return fcmTokenUpdatedAt;
    }

    public void setFcmTokenUpdatedAt(java.time.LocalDateTime fcmTokenUpdatedAt) {
        this.fcmTokenUpdatedAt = fcmTokenUpdatedAt;
    }

    public String getIdentityNumber() {
        return identityNumber;
    }

    public void setIdentityNumber(String identityNumber) {
        this.identityNumber = identityNumber;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFullName() {
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        } else if (firstName != null) {
            return firstName;
        } else if (lastName != null) {
            return lastName;
        } else {
            return email;
        }
    }

    // Add getters and setters for new fields
    public Boolean getNotificationRentalUpdates() {
        return notificationRentalUpdates;
    }

    public void setNotificationRentalUpdates(Boolean notificationRentalUpdates) {
        this.notificationRentalUpdates = notificationRentalUpdates;
    }

    public Boolean getNotificationPromotions() {
        return notificationPromotions;
    }

    public void setNotificationPromotions(Boolean notificationPromotions) {
        this.notificationPromotions = notificationPromotions;
    }

    public Boolean getNotificationSystemUpdates() {
        return notificationSystemUpdates;
    }

    public void setNotificationSystemUpdates(Boolean notificationSystemUpdates) {
        this.notificationSystemUpdates = notificationSystemUpdates;
    }

    public Boolean getShareLocation() {
        return shareLocation;
    }

    public void setShareLocation(Boolean shareLocation) {
        this.shareLocation = shareLocation;
    }

    public Boolean getShareRentalHistory() {
        return shareRentalHistory;
    }

    public void setShareRentalHistory(Boolean shareRentalHistory) {
        this.shareRentalHistory = shareRentalHistory;
    }

    public Boolean getTwoFactorAuthEnabled() {
        return twoFactorAuthEnabled;
    }

    public void setTwoFactorAuthEnabled(Boolean twoFactorAuthEnabled) {
        this.twoFactorAuthEnabled = twoFactorAuthEnabled;
    }

    public enum UserRole {
        CUSTOMER,
        ADMIN,
        MANAGER
    }
}
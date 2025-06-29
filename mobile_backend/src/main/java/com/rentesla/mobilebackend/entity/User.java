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

    @NotBlank
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

    // Constructors
    public User() {}

    public User(String firstName, String lastName, String email, String phone) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
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

    public enum UserRole {
        CUSTOMER,
        ADMIN,
        MANAGER
    }
} 
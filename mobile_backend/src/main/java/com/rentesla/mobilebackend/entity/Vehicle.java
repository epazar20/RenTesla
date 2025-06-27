package com.rentesla.mobilebackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Entity
@Table(name = "vehicles")
public class Vehicle extends BaseEntity {

    @Id
    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "id")
    private Long id;

    @NotBlank
    @Size(max = 17)
    @Column(name = "vin", nullable = false, unique = true)
    private String vin;

    @NotBlank
    @Size(max = 100)
    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Size(max = 50)
    @Column(name = "model")
    private String model;

    @Size(max = 50)
    @Column(name = "color")
    private String color;

    @Size(max = 20)
    @Column(name = "state")
    private String state;

    @Size(max = 255)
    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "option_codes", columnDefinition = "TEXT")
    private String optionCodes;

    @Column(name = "api_version")
    private Integer apiVersion;

    @Column(name = "in_service")
    private Boolean inService = false;

    // Mobile app specific fields
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private VehicleStatus status = VehicleStatus.AVAILABLE;

    @Column(name = "daily_rate", precision = 10, scale = 2)
    private BigDecimal dailyRate;

    @Column(name = "battery_level")
    private Integer batteryLevel;

    @Column(name = "latitude", precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8)
    private BigDecimal longitude;

    @Size(max = 255)
    @Column(name = "location_address")
    private String locationAddress;

    @Column(name = "is_available", nullable = false)
    private Boolean isAvailable = true;

    @Size(max = 500)
    @Column(name = "description")
    private String description;

    @Size(max = 1000)
    @Column(name = "features")
    private String features;

    // Constructors
    public Vehicle() {}

    public Vehicle(Long vehicleId, String vin, String displayName) {
        this.vehicleId = vehicleId;
        this.vin = vin;
        this.displayName = displayName;
    }

    // Getters and Setters
    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getVin() {
        return vin;
    }

    public void setVin(String vin) {
        this.vin = vin;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getOptionCodes() {
        return optionCodes;
    }

    public void setOptionCodes(String optionCodes) {
        this.optionCodes = optionCodes;
    }

    public Integer getApiVersion() {
        return apiVersion;
    }

    public void setApiVersion(Integer apiVersion) {
        this.apiVersion = apiVersion;
    }

    public Boolean getInService() {
        return inService;
    }

    public void setInService(Boolean inService) {
        this.inService = inService;
    }

    public VehicleStatus getStatus() {
        return status;
    }

    public void setStatus(VehicleStatus status) {
        this.status = status;
    }

    public BigDecimal getDailyRate() {
        return dailyRate;
    }

    public void setDailyRate(BigDecimal dailyRate) {
        this.dailyRate = dailyRate;
    }

    public Integer getBatteryLevel() {
        return batteryLevel;
    }

    public void setBatteryLevel(Integer batteryLevel) {
        this.batteryLevel = batteryLevel;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public void setLatitude(BigDecimal latitude) {
        this.latitude = latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public void setLongitude(BigDecimal longitude) {
        this.longitude = longitude;
    }

    public String getLocationAddress() {
        return locationAddress;
    }

    public void setLocationAddress(String locationAddress) {
        this.locationAddress = locationAddress;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }

    public void setIsAvailable(Boolean isAvailable) {
        this.isAvailable = isAvailable;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getFeatures() {
        return features;
    }

    public void setFeatures(String features) {
        this.features = features;
    }

    // Convenience methods
    public Long getTeslaVehicleId() {
        return vehicleId;
    }

    public void setTeslaVehicleId(Long teslaVehicleId) {
        this.vehicleId = teslaVehicleId;
    }

    // Vehicle Status Enum
    public enum VehicleStatus {
        AVAILABLE,
        RENTED,
        MAINTENANCE,
        OUT_OF_SERVICE
    }
} 
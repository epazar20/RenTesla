package com.rentesla.mobilebackend.service;

import com.rentesla.mobilebackend.entity.Vehicle;
import com.rentesla.mobilebackend.repository.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class VehicleService {

    private static final Logger logger = LoggerFactory.getLogger(VehicleService.class);

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private QRCodeService qrCodeService;

    /**
     * PRD: Find nearby vehicles within radius
     */
    @Transactional(readOnly = true)
    public List<Vehicle> findNearbyVehicles(Double latitude, Double longitude, Double radiusKm) {
        logger.info("Finding vehicles near lat: {}, lng: {} within {} km", latitude, longitude, radiusKm);
        
        if (latitude == null || longitude == null || radiusKm == null) {
            throw new IllegalArgumentException("Latitude, longitude, and radius are required");
        }
        
        if (radiusKm <= 0 || radiusKm > 100) {
            throw new IllegalArgumentException("Radius must be between 1 and 100 km");
        }
        
        List<Vehicle> nearbyVehicles = vehicleRepository.findNearbyVehicles(latitude, longitude, radiusKm);
        
        logger.info("Found {} vehicles within {} km radius", nearbyVehicles.size(), radiusKm);
        return nearbyVehicles;
    }

    /**
     * PRD: Find vehicles in geographical bounds (alternative approach for better performance)
     */
    @Transactional(readOnly = true)
    public List<Vehicle> findVehiclesInBounds(Double minLat, Double maxLat, Double minLng, Double maxLng) {
        logger.info("Finding vehicles in bounds: lat({}-{}), lng({}-{})", minLat, maxLat, minLng, maxLng);
        
        return vehicleRepository.findVehiclesInBounds(minLat, maxLat, minLng, maxLng);
    }

    /**
     * Create a new vehicle with QR code generation
     */
    public Vehicle createVehicle(Vehicle vehicle) {
        logger.info("Creating new vehicle: {}", vehicle.getDisplayName());
        
        // Validate required fields
        if (vehicle.getVin() == null || vehicle.getVin().trim().isEmpty()) {
            throw new IllegalArgumentException("VIN is required");
        }
        
        if (vehicle.getDisplayName() == null || vehicle.getDisplayName().trim().isEmpty()) {
            throw new IllegalArgumentException("Display name is required");
        }
        
        // Check if VIN already exists
        if (vehicleRepository.existsByVin(vehicle.getVin())) {
            throw new RuntimeException("Vehicle with this VIN already exists");
        }
        
        // Set default values
        if (vehicle.getIsAvailable() == null) {
            vehicle.setIsAvailable(true);
        }
        
        if (vehicle.getStatus() == null) {
            vehicle.setStatus(Vehicle.VehicleStatus.AVAILABLE);
        }
        
        // Save vehicle
        vehicle = vehicleRepository.save(vehicle);
        
        try {
            // Generate QR code for the vehicle
            qrCodeService.generateVehicleQRCode(vehicle.getUuid());
            logger.info("QR code generated for vehicle: {}", vehicle.getUuid());
        } catch (Exception e) {
            logger.error("Failed to generate QR code for vehicle: {}", vehicle.getUuid(), e);
            // Don't fail the vehicle creation, just log the error
        }
        
        logger.info("Vehicle created successfully: {}", vehicle.getUuid());
        return vehicle;
    }

    /**
     * Update vehicle
     */
    public Vehicle updateVehicle(String uuid, Vehicle vehicleData) {
        logger.info("Updating vehicle: {}", uuid);
        
        Vehicle vehicle = vehicleRepository.findByUuid(uuid)
            .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        // Update fields
        if (vehicleData.getDisplayName() != null) {
            vehicle.setDisplayName(vehicleData.getDisplayName());
        }
        
        if (vehicleData.getModel() != null) {
            vehicle.setModel(vehicleData.getModel());
        }
        
        if (vehicleData.getColor() != null) {
            vehicle.setColor(vehicleData.getColor());
        }
        
        if (vehicleData.getMake() != null) {
            vehicle.setMake(vehicleData.getMake());
        }
        
        if (vehicleData.getPlate() != null) {
            vehicle.setPlate(vehicleData.getPlate());
        }
        
        if (vehicleData.getCategory() != null) {
            vehicle.setCategory(vehicleData.getCategory());
        }
        
        if (vehicleData.getLocationLat() != null) {
            vehicle.setLocationLat(vehicleData.getLocationLat());
        }
        
        if (vehicleData.getLocationLng() != null) {
            vehicle.setLocationLng(vehicleData.getLocationLng());
        }
        
        if (vehicleData.getPricePerDay() != null) {
            vehicle.setPricePerDay(vehicleData.getPricePerDay());
        }
        
        if (vehicleData.getDepositAmount() != null) {
            vehicle.setDepositAmount(vehicleData.getDepositAmount());
        }
        
        if (vehicleData.getDescription() != null) {
            vehicle.setDescription(vehicleData.getDescription());
        }
        
        if (vehicleData.getFeatures() != null) {
            vehicle.setFeatures(vehicleData.getFeatures());
        }
        
        if (vehicleData.getIsAvailable() != null) {
            vehicle.setIsAvailable(vehicleData.getIsAvailable());
        }
        
        if (vehicleData.getStatus() != null) {
            vehicle.setStatus(vehicleData.getStatus());
        }
        
        if (vehicleData.getBatteryLevel() != null) {
            vehicle.setBatteryLevel(vehicleData.getBatteryLevel());
        }
        
        vehicle = vehicleRepository.save(vehicle);
        
        logger.info("Vehicle updated successfully: {}", uuid);
        return vehicle;
    }

    /**
     * Get all available vehicles
     */
    @Transactional(readOnly = true)
    public List<Vehicle> getAvailableVehicles() {
        return vehicleRepository.findByIsAvailableTrueAndStatus(Vehicle.VehicleStatus.AVAILABLE);
    }

    /**
     * Search vehicles
     */
    @Transactional(readOnly = true)
    public List<Vehicle> searchVehicles(String searchTerm) {
        logger.info("Searching vehicles with term: {}", searchTerm);
        
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return getAvailableVehicles();
        }
        
        return vehicleRepository.searchAvailableVehicles(searchTerm.trim());
    }

    /**
     * Get vehicles by price range
     */
    @Transactional(readOnly = true)
    public List<Vehicle> getVehiclesByPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        logger.info("Finding vehicles in price range: {} - {}", minPrice, maxPrice);
        
        return vehicleRepository.findAvailableVehiclesByPriceRange(minPrice, maxPrice);
    }

    /**
     * Get vehicles by category
     */
    @Transactional(readOnly = true)
    public List<Vehicle> getVehiclesByCategory(String category) {
        logger.info("Finding vehicles by category: {}", category);
        
        return vehicleRepository.findByCategory(category);
    }

    /**
     * Get vehicle by UUID
     */
    @Transactional(readOnly = true)
    public Optional<Vehicle> getVehicleByUuid(String uuid) {
        return vehicleRepository.findByUuid(uuid);
    }

    /**
     * Get vehicle by VIN
     */
    @Transactional(readOnly = true)
    public Optional<Vehicle> getVehicleByVin(String vin) {
        return vehicleRepository.findByVin(vin);
    }

    /**
     * PRD: Get vehicle by QR code scan
     */
    @Transactional(readOnly = true)
    public Optional<Vehicle> getVehicleByQRCode(String qrContent) {
        logger.info("Getting vehicle by QR code scan");
        
        return qrCodeService.getVehicleByQRScan(qrContent);
    }

    /**
     * Delete vehicle
     */
    public void deleteVehicle(String uuid) {
        logger.info("Deleting vehicle: {}", uuid);
        
        Vehicle vehicle = vehicleRepository.findByUuid(uuid)
            .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        // Remove QR code
        try {
            qrCodeService.removeVehicleQRCode(uuid);
        } catch (Exception e) {
            logger.error("Failed to remove QR code for vehicle: {}", uuid, e);
        }
        
        vehicleRepository.delete(vehicle);
        
        logger.info("Vehicle deleted successfully: {}", uuid);
    }

    /**
     * Update vehicle availability
     */
    public Vehicle updateVehicleAvailability(String uuid, boolean isAvailable) {
        logger.info("Updating vehicle availability: {} to {}", uuid, isAvailable);
        
        Vehicle vehicle = vehicleRepository.findByUuid(uuid)
            .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        vehicle.setIsAvailable(isAvailable);
        
        if (!isAvailable) {
            vehicle.setStatus(Vehicle.VehicleStatus.OUT_OF_SERVICE);
        } else {
            vehicle.setStatus(Vehicle.VehicleStatus.AVAILABLE);
        }
        
        return vehicleRepository.save(vehicle);
    }

    /**
     * Update vehicle location
     */
    public Vehicle updateVehicleLocation(String uuid, Double latitude, Double longitude, String address) {
        logger.info("Updating vehicle location: {} to lat: {}, lng: {}", uuid, latitude, longitude);
        
        Vehicle vehicle = vehicleRepository.findByUuid(uuid)
            .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        vehicle.setLocationLat(latitude);
        vehicle.setLocationLng(longitude);
        
        if (address != null) {
            vehicle.setLocationAddress(address);
        }
        
        return vehicleRepository.save(vehicle);
    }

    /**
     * Get all vehicles (admin)
     */
    @Transactional(readOnly = true)
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    /**
     * Get vehicle statistics
     */
    @Transactional(readOnly = true)
    public VehicleStatistics getVehicleStatistics() {
        long totalVehicles = vehicleRepository.count();
        long availableVehicles = vehicleRepository.countByIsAvailableTrue();
        long rentedVehicles = vehicleRepository.countByStatus(Vehicle.VehicleStatus.RENTED);
        long maintenanceVehicles = vehicleRepository.countByStatus(Vehicle.VehicleStatus.MAINTENANCE);
        
        Double averageBatteryLevel = vehicleRepository.getAverageBatteryLevel();
        Optional<BigDecimal> averageDailyRate = vehicleRepository.getAverageDailyRate();
        
        return new VehicleStatistics(
            totalVehicles,
            availableVehicles,
            rentedVehicles,
            maintenanceVehicles,
            averageBatteryLevel,
            averageDailyRate.orElse(BigDecimal.ZERO)
        );
    }

    /**
     * Vehicle statistics DTO
     */
    public static class VehicleStatistics {
        private final long totalVehicles;
        private final long availableVehicles;
        private final long rentedVehicles;
        private final long maintenanceVehicles;
        private final Double averageBatteryLevel;
        private final BigDecimal averageDailyRate;

        public VehicleStatistics(long totalVehicles, long availableVehicles, long rentedVehicles,
                               long maintenanceVehicles, Double averageBatteryLevel, BigDecimal averageDailyRate) {
            this.totalVehicles = totalVehicles;
            this.availableVehicles = availableVehicles;
            this.rentedVehicles = rentedVehicles;
            this.maintenanceVehicles = maintenanceVehicles;
            this.averageBatteryLevel = averageBatteryLevel;
            this.averageDailyRate = averageDailyRate;
        }

        // Getters
        public long getTotalVehicles() { return totalVehicles; }
        public long getAvailableVehicles() { return availableVehicles; }
        public long getRentedVehicles() { return rentedVehicles; }
        public long getMaintenanceVehicles() { return maintenanceVehicles; }
        public Double getAverageBatteryLevel() { return averageBatteryLevel; }
        public BigDecimal getAverageDailyRate() { return averageDailyRate; }
    }
} 
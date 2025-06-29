package com.rentesla.mobilebackend.repository;

import com.rentesla.mobilebackend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {

    Optional<Vehicle> findByUuid(String uuid);

    Optional<Vehicle> findByTeslaVehicleId(Long teslaVehicleId);

    Optional<Vehicle> findByVin(String vin);

    List<Vehicle> findByIsAvailableTrue();

    List<Vehicle> findByStatus(Vehicle.VehicleStatus status);

    List<Vehicle> findByIsAvailableTrueAndStatus(Vehicle.VehicleStatus status);

    List<Vehicle> findByCategory(String category);

    List<Vehicle> findByMake(String make);

    List<Vehicle> findByOwnerId(Long ownerId);

    @Query("SELECT v FROM Vehicle v WHERE v.isAvailable = true AND v.status = 'AVAILABLE' AND " +
           "(LOWER(v.displayName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.model) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.color) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.make) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Vehicle> searchAvailableVehicles(@Param("search") String search);

    @Query("SELECT v FROM Vehicle v WHERE v.isAvailable = true AND v.status = 'AVAILABLE' AND " +
           "v.dailyRate BETWEEN :minRate AND :maxRate")
    List<Vehicle> findAvailableVehiclesByPriceRange(@Param("minRate") BigDecimal minRate, 
                                                    @Param("maxRate") BigDecimal maxRate);

    @Query("SELECT v FROM Vehicle v WHERE v.locationLat IS NOT NULL AND v.locationLng IS NOT NULL AND " +
           "v.isAvailable = true AND v.status = 'AVAILABLE'")
    List<Vehicle> findAvailableVehiclesWithLocation();

    // PRD: Nearby vehicles search - Haversine formula for distance calculation
    @Query("SELECT v FROM Vehicle v WHERE v.locationLat IS NOT NULL AND v.locationLng IS NOT NULL " +
           "AND v.isAvailable = true AND v.status = 'AVAILABLE' " +
           "AND (6371 * acos(cos(radians(:lat)) * cos(radians(v.locationLat)) * " +
           "cos(radians(v.locationLng) - radians(:lng)) + sin(radians(:lat)) * " +
           "sin(radians(v.locationLat)))) <= :radiusKm " +
           "ORDER BY (6371 * acos(cos(radians(:lat)) * cos(radians(v.locationLat)) * " +
           "cos(radians(v.locationLng) - radians(:lng)) + sin(radians(:lat)) * " +
           "sin(radians(v.locationLat))))")
    List<Vehicle> findNearbyVehicles(@Param("lat") Double latitude, 
                                    @Param("lng") Double longitude, 
                                    @Param("radiusKm") Double radiusKm);

    // Alternative nearby search with simpler approach for better performance
    @Query("SELECT v FROM Vehicle v WHERE v.locationLat IS NOT NULL AND v.locationLng IS NOT NULL " +
           "AND v.isAvailable = true AND v.status = 'AVAILABLE' " +
           "AND v.locationLat BETWEEN :minLat AND :maxLat " +
           "AND v.locationLng BETWEEN :minLng AND :maxLng")
    List<Vehicle> findVehiclesInBounds(@Param("minLat") Double minLat, 
                                      @Param("maxLat") Double maxLat,
                                      @Param("minLng") Double minLng, 
                                      @Param("maxLng") Double maxLng);

    // QR Code related queries
    @Query("SELECT v FROM Vehicle v WHERE v.qrCodeImage IS NOT NULL")
    List<Vehicle> findVehiclesWithQrCode();

    boolean existsByUuid(String uuid);

    boolean existsByTeslaVehicleId(Long teslaVehicleId);

    boolean existsByVin(String vin);

    boolean existsByPlate(String plate);

    long countByIsAvailableTrue();

    long countByStatus(Vehicle.VehicleStatus status);

    long countByCategory(String category);

    long countByOwnerId(Long ownerId);

    @Query("SELECT AVG(v.batteryLevel) FROM Vehicle v WHERE v.batteryLevel IS NOT NULL")
    Double getAverageBatteryLevel();

    @Query("SELECT AVG(v.pricePerDay) FROM Vehicle v WHERE v.pricePerDay IS NOT NULL AND v.isAvailable = true")
    Optional<BigDecimal> getAverageDailyRate();

    // Statistics for categories
    @Query("SELECT v.category, COUNT(v) FROM Vehicle v WHERE v.category IS NOT NULL " +
           "GROUP BY v.category ORDER BY COUNT(v) DESC")
    List<Object[]> getVehicleCountByCategory();

    @Query("SELECT v.make, COUNT(v) FROM Vehicle v WHERE v.make IS NOT NULL " +
           "GROUP BY v.make ORDER BY COUNT(v) DESC")
    List<Object[]> getVehicleCountByMake();

    // Backward compatibility methods - delegate to new UUID methods
    default Optional<Vehicle> findByVehicleId(Long vehicleId) {
        return findByTeslaVehicleId(vehicleId);
    }

    default boolean existsByVehicleId(Long vehicleId) {
        return existsByTeslaVehicleId(vehicleId);
    }

    // For backward compatibility with old API endpoints that use Long ID
    @Query("SELECT v FROM Vehicle v WHERE v.teslaVehicleId = :vehicleId")
    Optional<Vehicle> findByLegacyId(@Param("vehicleId") Long vehicleId);
} 
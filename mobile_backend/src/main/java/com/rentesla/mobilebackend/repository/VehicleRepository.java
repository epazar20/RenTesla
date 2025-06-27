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
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByVehicleId(Long vehicleId);

    Optional<Vehicle> findByVin(String vin);

    List<Vehicle> findByIsAvailableTrue();

    List<Vehicle> findByStatus(Vehicle.VehicleStatus status);

    List<Vehicle> findByIsAvailableTrueAndStatus(Vehicle.VehicleStatus status);

    @Query("SELECT v FROM Vehicle v WHERE v.isAvailable = true AND v.status = 'AVAILABLE' AND " +
           "(LOWER(v.displayName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.model) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.color) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Vehicle> searchAvailableVehicles(@Param("search") String search);

    @Query("SELECT v FROM Vehicle v WHERE v.isAvailable = true AND v.status = 'AVAILABLE' AND " +
           "v.dailyRate BETWEEN :minRate AND :maxRate")
    List<Vehicle> findAvailableVehiclesByPriceRange(@Param("minRate") BigDecimal minRate, 
                                                    @Param("maxRate") BigDecimal maxRate);

    @Query("SELECT v FROM Vehicle v WHERE v.latitude IS NOT NULL AND v.longitude IS NOT NULL AND " +
           "v.isAvailable = true AND v.status = 'AVAILABLE'")
    List<Vehicle> findAvailableVehiclesWithLocation();

    boolean existsByVehicleId(Long vehicleId);

    boolean existsByVin(String vin);

    long countByIsAvailableTrue();

    long countByStatus(Vehicle.VehicleStatus status);

    @Query("SELECT AVG(v.batteryLevel) FROM Vehicle v WHERE v.batteryLevel IS NOT NULL")
    Double getAverageBatteryLevel();

    // Backward compatibility methods
    default Optional<Vehicle> findByTeslaVehicleId(Long teslaVehicleId) {
        return findByVehicleId(teslaVehicleId);
    }

    default boolean existsByTeslaVehicleId(Long teslaVehicleId) {
        return existsByVehicleId(teslaVehicleId);
    }
} 
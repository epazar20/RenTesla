package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.entity.Vehicle;
import com.rentesla.mobilebackend.repository.VehicleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/vehicles")
@Tag(name = "Vehicle Management", description = "Vehicle operations for mobile app")
@CrossOrigin(origins = "*")
public class VehicleController {

    @Autowired
    private VehicleRepository vehicleRepository;

    @GetMapping
    @Operation(summary = "Get all available vehicles", description = "Returns list of all available vehicles")
    public ResponseEntity<List<Vehicle>> getAllAvailableVehicles() {
        List<Vehicle> vehicles = vehicleRepository.findByIsAvailableTrueAndStatus(Vehicle.VehicleStatus.AVAILABLE);
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get vehicle by ID", description = "Returns a single vehicle by its ID")
    public ResponseEntity<Vehicle> getVehicleById(
            @Parameter(description = "Vehicle ID") @PathVariable Long id) {
        Optional<Vehicle> vehicle = vehicleRepository.findById(id);
        return vehicle.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search vehicles", description = "Search vehicles by name, model, or color")
    public ResponseEntity<List<Vehicle>> searchVehicles(
            @Parameter(description = "Search term") @RequestParam String q) {
        List<Vehicle> vehicles = vehicleRepository.searchAvailableVehicles(q);
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/price-range")
    @Operation(summary = "Get vehicles by price range", description = "Returns vehicles within specified price range")
    public ResponseEntity<List<Vehicle>> getVehiclesByPriceRange(
            @Parameter(description = "Minimum daily rate") @RequestParam BigDecimal minRate,
            @Parameter(description = "Maximum daily rate") @RequestParam BigDecimal maxRate) {
        List<Vehicle> vehicles = vehicleRepository.findAvailableVehiclesByPriceRange(minRate, maxRate);
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/with-location")
    @Operation(summary = "Get vehicles with location", description = "Returns vehicles that have location data")
    public ResponseEntity<List<Vehicle>> getVehiclesWithLocation() {
        List<Vehicle> vehicles = vehicleRepository.findAvailableVehiclesWithLocation();
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get vehicle statistics", description = "Returns vehicle statistics")
    public ResponseEntity<Map<String, Object>> getVehicleStats() {
        Map<String, Object> stats = Map.of(
            "totalAvailable", vehicleRepository.countByIsAvailableTrue(),
            "totalRented", vehicleRepository.countByStatus(Vehicle.VehicleStatus.RENTED),
            "totalMaintenance", vehicleRepository.countByStatus(Vehicle.VehicleStatus.MAINTENANCE),
            "averageBatteryLevel", vehicleRepository.getAverageBatteryLevel()
        );
        return ResponseEntity.ok(stats);
    }

    @PostMapping
    @Operation(summary = "Create new vehicle", description = "Creates a new vehicle record")
    public ResponseEntity<Vehicle> createVehicle(@RequestBody Vehicle vehicle) {
        // Check if vehicle already exists
        if (vehicleRepository.existsByTeslaVehicleId(vehicle.getTeslaVehicleId())) {
            return ResponseEntity.badRequest().build();
        }
        
        Vehicle savedVehicle = vehicleRepository.save(vehicle);
        return ResponseEntity.ok(savedVehicle);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update vehicle", description = "Updates an existing vehicle")
    public ResponseEntity<Vehicle> updateVehicle(
            @Parameter(description = "Vehicle ID") @PathVariable Long id,
            @RequestBody Vehicle vehicleDetails) {
        
        Optional<Vehicle> optionalVehicle = vehicleRepository.findById(id);
        if (optionalVehicle.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Vehicle vehicle = optionalVehicle.get();
        vehicle.setDisplayName(vehicleDetails.getDisplayName());
        vehicle.setModel(vehicleDetails.getModel());
        vehicle.setColor(vehicleDetails.getColor());
        vehicle.setStatus(vehicleDetails.getStatus());
        vehicle.setDailyRate(vehicleDetails.getDailyRate());
        vehicle.setBatteryLevel(vehicleDetails.getBatteryLevel());
        vehicle.setLatitude(vehicleDetails.getLatitude());
        vehicle.setLongitude(vehicleDetails.getLongitude());
        vehicle.setLocationAddress(vehicleDetails.getLocationAddress());
        vehicle.setIsAvailable(vehicleDetails.getIsAvailable());
        vehicle.setDescription(vehicleDetails.getDescription());
        vehicle.setFeatures(vehicleDetails.getFeatures());

        Vehicle updatedVehicle = vehicleRepository.save(vehicle);
        return ResponseEntity.ok(updatedVehicle);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete vehicle", description = "Deletes a vehicle by ID")
    public ResponseEntity<Void> deleteVehicle(
            @Parameter(description = "Vehicle ID") @PathVariable Long id) {
        if (!vehicleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        vehicleRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
} 
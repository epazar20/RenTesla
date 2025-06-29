package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.entity.Vehicle;
import com.rentesla.mobilebackend.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/vehicles")
@Tag(name = "Vehicle Management", description = "Vehicle operations for mobile app")
@CrossOrigin(origins = "*")
public class VehicleController {

    @Autowired
    private VehicleService vehicleService;

    @GetMapping
    @Operation(summary = "Get all available vehicles", description = "Returns list of all available vehicles")
    public ResponseEntity<List<Vehicle>> getAllAvailableVehicles() {
        List<Vehicle> vehicles = vehicleService.getAvailableVehicles();
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/{uuid}")
    @Operation(summary = "Get vehicle by UUID", description = "Returns a single vehicle by its UUID")
    public ResponseEntity<Vehicle> getVehicleByUuid(
            @Parameter(description = "Vehicle UUID") @PathVariable String uuid) {
        Optional<Vehicle> vehicle = vehicleService.getVehicleByUuid(uuid);
        return vehicle.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search vehicles", description = "Search vehicles by name, model, color, or make")
    public ResponseEntity<List<Vehicle>> searchVehicles(
            @Parameter(description = "Search term") @RequestParam String q) {
        List<Vehicle> vehicles = vehicleService.searchVehicles(q);
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/nearby")
    @Operation(summary = "Find nearby vehicles", description = "Find vehicles within specified radius from user location")
    public ResponseEntity<List<Vehicle>> getNearbyVehicles(
            @Parameter(description = "User latitude") @RequestParam Double latitude,
            @Parameter(description = "User longitude") @RequestParam Double longitude,
            @Parameter(description = "Search radius in kilometers", example = "10") @RequestParam(defaultValue = "10") Double radiusKm) {
        
        try {
            List<Vehicle> vehicles = vehicleService.findNearbyVehicles(latitude, longitude, radiusKm);
            return ResponseEntity.ok(vehicles);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/in-bounds")
    @Operation(summary = "Find vehicles in bounds", description = "Find vehicles within geographical bounds")
    public ResponseEntity<List<Vehicle>> getVehiclesInBounds(
            @Parameter(description = "Minimum latitude") @RequestParam Double minLat,
            @Parameter(description = "Maximum latitude") @RequestParam Double maxLat,
            @Parameter(description = "Minimum longitude") @RequestParam Double minLng,
            @Parameter(description = "Maximum longitude") @RequestParam Double maxLng) {
        
        List<Vehicle> vehicles = vehicleService.findVehiclesInBounds(minLat, maxLat, minLng, maxLng);
        return ResponseEntity.ok(vehicles);
    }

    @PostMapping("/qr-scan")
    @Operation(summary = "Get vehicle by QR code", description = "Get vehicle information by scanning QR code")
    public ResponseEntity<Vehicle> getVehicleByQRCode(
            @Parameter(description = "QR code content") @RequestBody QRScanRequest request) {
        
        Optional<Vehicle> vehicle = vehicleService.getVehicleByQRCode(request.getQrContent());
        return vehicle.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/price-range")
    @Operation(summary = "Get vehicles by price range", description = "Returns vehicles within specified price range")
    public ResponseEntity<List<Vehicle>> getVehiclesByPriceRange(
            @Parameter(description = "Minimum daily rate") @RequestParam BigDecimal minPrice,
            @Parameter(description = "Maximum daily rate") @RequestParam BigDecimal maxPrice) {
        List<Vehicle> vehicles = vehicleService.getVehiclesByPriceRange(minPrice, maxPrice);
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Get vehicles by category", description = "Returns vehicles filtered by category")
    public ResponseEntity<List<Vehicle>> getVehiclesByCategory(
            @Parameter(description = "Vehicle category") @PathVariable String category) {
        List<Vehicle> vehicles = vehicleService.getVehiclesByCategory(category);
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get vehicle statistics", description = "Returns vehicle statistics")
    public ResponseEntity<VehicleService.VehicleStatistics> getVehicleStats() {
        VehicleService.VehicleStatistics stats = vehicleService.getVehicleStatistics();
        return ResponseEntity.ok(stats);
    }

    @PostMapping
    @Operation(summary = "Create new vehicle", description = "Creates a new vehicle record")
    public ResponseEntity<Vehicle> createVehicle(@RequestBody Vehicle vehicle) {
        try {
            Vehicle savedVehicle = vehicleService.createVehicle(vehicle);
            return ResponseEntity.ok(savedVehicle);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{uuid}")
    @Operation(summary = "Update vehicle", description = "Updates an existing vehicle")
    public ResponseEntity<Vehicle> updateVehicle(
            @Parameter(description = "Vehicle UUID") @PathVariable String uuid,
            @RequestBody Vehicle vehicleDetails) {
        
        try {
            Vehicle updatedVehicle = vehicleService.updateVehicle(uuid, vehicleDetails);
            return ResponseEntity.ok(updatedVehicle);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{uuid}/availability")
    @Operation(summary = "Update vehicle availability", description = "Updates vehicle availability status")
    public ResponseEntity<Vehicle> updateVehicleAvailability(
            @Parameter(description = "Vehicle UUID") @PathVariable String uuid,
            @Parameter(description = "Availability status") @RequestParam boolean isAvailable) {
        
        try {
            Vehicle updatedVehicle = vehicleService.updateVehicleAvailability(uuid, isAvailable);
            return ResponseEntity.ok(updatedVehicle);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{uuid}/location")
    @Operation(summary = "Update vehicle location", description = "Updates vehicle location coordinates")
    public ResponseEntity<Vehicle> updateVehicleLocation(
            @Parameter(description = "Vehicle UUID") @PathVariable String uuid,
            @RequestBody LocationUpdateRequest request) {
        
        try {
            Vehicle updatedVehicle = vehicleService.updateVehicleLocation(
                uuid, request.getLatitude(), request.getLongitude(), request.getAddress());
            return ResponseEntity.ok(updatedVehicle);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{uuid}")
    @Operation(summary = "Delete vehicle", description = "Deletes a vehicle by UUID")
    public ResponseEntity<Void> deleteVehicle(
            @Parameter(description = "Vehicle UUID") @PathVariable String uuid) {
        try {
            vehicleService.deleteVehicle(uuid);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // DTOs
    public static class QRScanRequest {
        private String qrContent;

        public String getQrContent() {
            return qrContent;
        }

        public void setQrContent(String qrContent) {
            this.qrContent = qrContent;
        }
    }

    public static class LocationUpdateRequest {
        private Double latitude;
        private Double longitude;
        private String address;

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

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }
    }
} 
package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.entity.User;
import com.rentesla.mobilebackend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/users")
@Tag(name = "User Management", description = "User operations for mobile app")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Get all active users", description = "Returns list of all active users")
    public ResponseEntity<List<User>> getAllActiveUsers() {
        List<User> users = userRepository.findByIsActiveTrue();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID", description = "Returns a single user by their ID")
    public ResponseEntity<User> getUserById(
            @Parameter(description = "User ID") @PathVariable Long id) {
        Optional<User> user = userRepository.findById(id);
        return user.map(ResponseEntity::ok)
                  .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/email/{email}")
    @Operation(summary = "Get user by email", description = "Returns a user by their email address")
    public ResponseEntity<User> getUserByEmail(
            @Parameter(description = "User email") @PathVariable String email) {
        Optional<User> user = userRepository.findByEmail(email);
        return user.map(ResponseEntity::ok)
                  .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search users", description = "Search users by name or email")
    public ResponseEntity<List<User>> searchUsers(
            @Parameter(description = "Search term") @RequestParam String q) {
        List<User> users = userRepository.searchActiveUsers(q);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/role/{role}")
    @Operation(summary = "Get users by role", description = "Returns users with specified role")
    public ResponseEntity<List<User>> getUsersByRole(
            @Parameter(description = "User role") @PathVariable User.UserRole role) {
        List<User> users = userRepository.findByRole(role);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get user statistics", description = "Returns user statistics")
    public ResponseEntity<Map<String, Object>> getUserStats() {
        Map<String, Object> stats = Map.of(
            "totalActiveUsers", userRepository.countByIsActiveTrue(),
            "totalCustomers", userRepository.countByRole(User.UserRole.CUSTOMER),
            "totalAdmins", userRepository.countByRole(User.UserRole.ADMIN),
            "totalManagers", userRepository.countByRole(User.UserRole.MANAGER)
        );
        return ResponseEntity.ok(stats);
    }

    @PostMapping
    @Operation(summary = "Create new user", description = "Creates a new user account")
    public ResponseEntity<User> createUser(@RequestBody User user) {
        // Check if user already exists
        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().build();
        }
        
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user", description = "Updates an existing user")
    public ResponseEntity<User> updateUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            @RequestBody User userDetails) {
        
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();
        
        // Update only if the field is not null in the request
        if (userDetails.getFirstName() != null) {
        user.setFirstName(userDetails.getFirstName());
        }
        if (userDetails.getLastName() != null) {
        user.setLastName(userDetails.getLastName());
        }
        if (userDetails.getEmail() != null) {
        user.setEmail(userDetails.getEmail());
        }
        if (userDetails.getPhone() != null) {
        user.setPhone(userDetails.getPhone());
        }
        if (userDetails.getAddress() != null) {
        user.setAddress(userDetails.getAddress());
        }
        if (userDetails.getTeslaEmail() != null) {
            user.setTeslaEmail(userDetails.getTeslaEmail());
        }
        // Role and isActive should only be updated by admins, so we'll skip them here

        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user", description = "Soft deletes a user by setting isActive to false")
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "User ID") @PathVariable Long id) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = optionalUser.get();
        user.setIsActive(false);
        userRepository.save(user);
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/check-email")
    @Operation(summary = "Check if email exists", description = "Checks if an email address is already registered")
    public ResponseEntity<Map<String, Boolean>> checkEmailExists(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        boolean exists = userRepository.existsByEmail(email);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @PostMapping("/check-phone")
    @Operation(summary = "Check if phone exists", description = "Checks if a phone number is already registered")
    public ResponseEntity<Map<String, Boolean>> checkPhoneExists(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        boolean exists = userRepository.existsByPhone(phone);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @PutMapping("/{id}/location")
    @Operation(summary = "Update user location", description = "Updates user's current location coordinates")
    public ResponseEntity<User> updateUserLocation(
            @Parameter(description = "User ID") @PathVariable Long id,
            @RequestBody LocationUpdateRequest request) {
        
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = optionalUser.get();
        user.setLatitude(request.getLatitude());
        user.setLongitude(request.getLongitude());
        
        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}/notification-settings")
    @Operation(summary = "Update notification settings", description = "Updates user's notification preferences")
    public ResponseEntity<User> updateNotificationSettings(
            @Parameter(description = "User ID") @PathVariable Long id,
            @RequestBody NotificationSettingsRequest request) {
        
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();
        user.setNotificationRentalUpdates(request.getRentalUpdates());
        user.setNotificationPromotions(request.getPromotions());
        user.setNotificationSystemUpdates(request.getSystemUpdates());
        
        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}/privacy-settings")
    @Operation(summary = "Update privacy settings", description = "Updates user's privacy and security preferences")
    public ResponseEntity<User> updatePrivacySettings(
            @Parameter(description = "User ID") @PathVariable Long id,
            @RequestBody PrivacySettingsRequest request) {
        
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();
        user.setShareLocation(request.getShareLocation());
        user.setShareRentalHistory(request.getShareRentalHistory());
        user.setTwoFactorAuthEnabled(request.getTwoFactorAuthEnabled());
        
        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    // DTOs
    public static class LocationUpdateRequest {
        private Double latitude;
        private Double longitude;

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
    }

    // DTOs for settings
    public static class NotificationSettingsRequest {
        private Boolean rentalUpdates;
        private Boolean promotions;
        private Boolean systemUpdates;

        public Boolean getRentalUpdates() {
            return rentalUpdates;
        }

        public void setRentalUpdates(Boolean rentalUpdates) {
            this.rentalUpdates = rentalUpdates;
        }

        public Boolean getPromotions() {
            return promotions;
        }

        public void setPromotions(Boolean promotions) {
            this.promotions = promotions;
        }

        public Boolean getSystemUpdates() {
            return systemUpdates;
        }

        public void setSystemUpdates(Boolean systemUpdates) {
            this.systemUpdates = systemUpdates;
        }
    }

    public static class PrivacySettingsRequest {
        private Boolean shareLocation;
        private Boolean shareRentalHistory;
        private Boolean twoFactorAuthEnabled;

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
    }
} 
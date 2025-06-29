package com.rentesla.mobilebackend.controller;

import com.rentesla.mobilebackend.entity.UserConsent;
import com.rentesla.mobilebackend.repository.UserConsentRepository;
import com.rentesla.mobilebackend.repository.UserRepository;
import com.rentesla.mobilebackend.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/consents")
@Tag(name = "User Consent Management", description = "KVKK and consent operations")
@CrossOrigin(origins = "*")
public class UserConsentController {

    @Autowired
    private UserConsentRepository userConsentRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/submit")
    @Operation(summary = "Submit user consents", description = "Submit multiple consents for a user")
    public ResponseEntity<ConsentSubmissionResponse> submitConsents(@RequestBody ConsentSubmissionRequest request) {
        try {
            // Validate user exists
            User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Process each consent
            for (ConsentData consentData : request.getConsents()) {
                if (consentData.isGiven()) {
                    // Create or update consent
                    UserConsent consent = new UserConsent(
                        request.getUserId(),
                        consentData.getType(),
                        UserConsent.ConsentStatus.GIVEN
                    );
                    consent.setIpAddress(request.getIpAddress());
                    consent.setUserAgent(request.getUserAgent());
                    consent.setConsentText(consentData.getConsentText());
                    consent.setVersion("1.0");
                    
                    userConsentRepository.save(consent);
                }
            }

            // Update user consent flags
            updateUserConsentFlags(user, request.getConsents());

            return ResponseEntity.ok(new ConsentSubmissionResponse(true, "Consents submitted successfully"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(new ConsentSubmissionResponse(false, "Error submitting consents: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user consents", description = "Get all consents for a specific user")
    public ResponseEntity<List<UserConsent>> getUserConsents(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        List<UserConsent> consents = userConsentRepository.findByUserId(userId);
        return ResponseEntity.ok(consents);
    }

    @GetMapping("/user/{userId}/active")
    @Operation(summary = "Get active user consents", description = "Get active consents for a specific user")
    public ResponseEntity<List<UserConsent>> getActiveUserConsents(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        List<UserConsent> consents = userConsentRepository.findActiveConsentsByUser(userId);
        return ResponseEntity.ok(consents);
    }

    @GetMapping("/user/{userId}/status")
    @Operation(summary = "Get user consent status", description = "Get consent status summary for a user")
    public ResponseEntity<ConsentStatusResponse> getUserConsentStatus(
            @Parameter(description = "User ID") @PathVariable Long userId) {
        
        boolean kvkkConsent = userConsentRepository.hasActiveConsent(userId, UserConsent.ConsentType.KVKK);
        boolean openConsent = userConsentRepository.hasActiveConsent(userId, UserConsent.ConsentType.OPEN_CONSENT);
        boolean locationConsent = userConsentRepository.hasActiveConsent(userId, UserConsent.ConsentType.LOCATION);
        boolean notificationConsent = userConsentRepository.hasActiveConsent(userId, UserConsent.ConsentType.NOTIFICATION);
        boolean marketingConsent = userConsentRepository.hasActiveConsent(userId, UserConsent.ConsentType.MARKETING);

        ConsentStatusResponse response = new ConsentStatusResponse();
        response.setKvkkConsent(kvkkConsent);
        response.setOpenConsent(openConsent);
        response.setLocationConsent(locationConsent);
        response.setNotificationConsent(notificationConsent);
        response.setMarketingConsent(marketingConsent);
        response.setCanProceed(kvkkConsent && openConsent);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/revoke")
    @Operation(summary = "Revoke consent", description = "Revoke a specific consent")
    public ResponseEntity<String> revokeConsent(@RequestBody ConsentRevokeRequest request) {
        try {
            Optional<UserConsent> consent = userConsentRepository.findActiveConsent(
                request.getUserId(), 
                request.getConsentType()
            );

            if (consent.isPresent()) {
                UserConsent existingConsent = consent.get();
                existingConsent.setStatus(UserConsent.ConsentStatus.REVOKED);
                existingConsent.setRevokedAt(LocalDateTime.now());
                userConsentRepository.save(existingConsent);

                // Update user flags
                updateUserConsentFlagsOnRevoke(request.getUserId(), request.getConsentType());

                return ResponseEntity.ok("Consent revoked successfully");
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error revoking consent: " + e.getMessage());
        }
    }

    @GetMapping("/stats")
    @Operation(summary = "Get consent statistics", description = "Get consent statistics (Admin only)")
    public ResponseEntity<Map<String, Object>> getConsentStats() {
        long kvkkCount = userConsentRepository.countConsentsByTypeAndDateRange(
            UserConsent.ConsentType.KVKK, LocalDateTime.now().minusMonths(1));
        long openConsentCount = userConsentRepository.countConsentsByTypeAndDateRange(
            UserConsent.ConsentType.OPEN_CONSENT, LocalDateTime.now().minusMonths(1));
        long locationCount = userConsentRepository.countConsentsByTypeAndDateRange(
            UserConsent.ConsentType.LOCATION, LocalDateTime.now().minusMonths(1));

        Map<String, Object> stats = Map.of(
            "kvkkConsents", kvkkCount,
            "openConsents", openConsentCount,
            "locationConsents", locationCount,
            "period", "Last 30 days"
        );

        return ResponseEntity.ok(stats);
    }

    // Helper methods
    private void updateUserConsentFlags(User user, List<ConsentData> consents) {
        for (ConsentData consentData : consents) {
            if (consentData.isGiven()) {
                switch (consentData.getType()) {
                    case KVKK:
                        user.setKvkkConsentGiven(true);
                        break;
                    case OPEN_CONSENT:
                        user.setOpenConsentGiven(true);
                        break;
                }
            }
        }
        userRepository.save(user);
    }

    private void updateUserConsentFlagsOnRevoke(Long userId, UserConsent.ConsentType consentType) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            switch (consentType) {
                case KVKK:
                    user.setKvkkConsentGiven(false);
                    break;
                case OPEN_CONSENT:
                    user.setOpenConsentGiven(false);
                    break;
            }
            userRepository.save(user);
        }
    }

    // DTOs
    public static class ConsentSubmissionRequest {
        private Long userId;
        private List<ConsentData> consents;
        private String ipAddress;
        private String userAgent;

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public List<ConsentData> getConsents() {
            return consents;
        }

        public void setConsents(List<ConsentData> consents) {
            this.consents = consents;
        }

        public String getIpAddress() {
            return ipAddress;
        }

        public void setIpAddress(String ipAddress) {
            this.ipAddress = ipAddress;
        }

        public String getUserAgent() {
            return userAgent;
        }

        public void setUserAgent(String userAgent) {
            this.userAgent = userAgent;
        }
    }

    public static class ConsentData {
        private UserConsent.ConsentType type;
        private boolean given;
        private String consentText;

        public UserConsent.ConsentType getType() {
            return type;
        }

        public void setType(UserConsent.ConsentType type) {
            this.type = type;
        }

        public boolean isGiven() {
            return given;
        }

        public void setGiven(boolean given) {
            this.given = given;
        }

        public String getConsentText() {
            return consentText;
        }

        public void setConsentText(String consentText) {
            this.consentText = consentText;
        }
    }

    public static class ConsentSubmissionResponse {
        private boolean success;
        private String message;

        public ConsentSubmissionResponse(boolean success, String message) {
            this.success = success;
            this.message = message;
        }

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }

    public static class ConsentStatusResponse {
        private boolean kvkkConsent;
        private boolean openConsent;
        private boolean locationConsent;
        private boolean notificationConsent;
        private boolean marketingConsent;
        private boolean canProceed;

        public boolean isKvkkConsent() {
            return kvkkConsent;
        }

        public void setKvkkConsent(boolean kvkkConsent) {
            this.kvkkConsent = kvkkConsent;
        }

        public boolean isOpenConsent() {
            return openConsent;
        }

        public void setOpenConsent(boolean openConsent) {
            this.openConsent = openConsent;
        }

        public boolean isLocationConsent() {
            return locationConsent;
        }

        public void setLocationConsent(boolean locationConsent) {
            this.locationConsent = locationConsent;
        }

        public boolean isNotificationConsent() {
            return notificationConsent;
        }

        public void setNotificationConsent(boolean notificationConsent) {
            this.notificationConsent = notificationConsent;
        }

        public boolean isMarketingConsent() {
            return marketingConsent;
        }

        public void setMarketingConsent(boolean marketingConsent) {
            this.marketingConsent = marketingConsent;
        }

        public boolean isCanProceed() {
            return canProceed;
        }

        public void setCanProceed(boolean canProceed) {
            this.canProceed = canProceed;
        }
    }

    public static class ConsentRevokeRequest {
        private Long userId;
        private UserConsent.ConsentType consentType;

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public UserConsent.ConsentType getConsentType() {
            return consentType;
        }

        public void setConsentType(UserConsent.ConsentType consentType) {
            this.consentType = consentType;
        }
    }
} 